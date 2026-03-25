import { composeService } from '../../src/compose';
import { db } from '../database/init';
import { randomId } from '../../src/utils/utils';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const UPLOADS_DIR = path.resolve(import.meta.dir, '..', 'uploads');
const activeStreams = new Map<string, { proc: any; videoId: string }>();

export const liveService = composeService(() => ({
	generateStreamKey(userId: string) {
		const key = randomId(24);
		db.run('UPDATE users SET stream_key = ? WHERE id = ?', [key, userId]);
		return key;
	},

	getStreamKey(userId: string) {
		const user = db.query('SELECT stream_key FROM users WHERE id = ?').get(userId) as any;
		return user?.stream_key || '';
	},

	getUserByStreamKey(streamKey: string) {
		return db.query('SELECT id, username, display_name FROM users WHERE stream_key = ?').get(streamKey) as any;
	},

	async startStream(userId: string, title: string, description: string) {
		const videoId = randomId(16);
		const outputDir = path.join(UPLOADS_DIR, 'live', videoId);
		await mkdir(outputDir, { recursive: true });

		db.run(
			"INSERT INTO videos (id, user_id, title, description, filename, status, type) VALUES (?, ?, ?, ?, ?, 'live', 'live')",
			[videoId, userId, title, description || '', 'live'],
		);

		return { videoId, outputDir };
	},

	// Start FFmpeg to receive RTMP and output HLS
	async startFFmpegListener(videoId: string, rtmpUrl: string) {
		const outputDir = path.join(UPLOADS_DIR, 'live', videoId);
		await mkdir(outputDir, { recursive: true });

		const proc = Bun.spawn([
			'ffmpeg',
			'-i', rtmpUrl,
			'-c:v', 'libx264',
			'-c:a', 'aac',
			'-preset', 'ultrafast',
			'-tune', 'zerolatency',
			'-f', 'hls',
			'-hls_time', '4',
			'-hls_list_size', '5',
			'-hls_flags', 'delete_segments',
			'-hls_segment_filename', path.join(outputDir, 'segment%03d.ts'),
			path.join(outputDir, 'playlist.m3u8'),
		], { stdout: 'ignore', stderr: 'ignore' });

		activeStreams.set(videoId, { proc, videoId });
		return videoId;
	},

	async stopStream(videoId: string) {
		const stream = activeStreams.get(videoId);
		if (stream) {
			try { stream.proc.kill(); } catch {}
			activeStreams.delete(videoId);
		}

		// Update video status to 'ready' or remove
		db.run("UPDATE videos SET status = 'ended', type = 'live_ended' WHERE id = ?", [videoId]);

		// Generate thumbnail from first segment if exists
		const outputDir = path.join(UPLOADS_DIR, 'live', videoId);
		const thumbPath = path.join(UPLOADS_DIR, 'thumbnails', `${videoId}.jpg`);
		try {
			const proc = Bun.spawn([
				'ffmpeg', '-i', path.join(outputDir, 'segment000.ts'),
				'-ss', '00:00:01', '-vframes', '1', '-vf', 'scale=640:360', '-y', thumbPath,
			], { stdout: 'ignore', stderr: 'ignore' });
			await proc.exited;
			db.run('UPDATE videos SET thumbnail = ? WHERE id = ?', [`${videoId}.jpg`, videoId]);
		} catch {}
	},

	getActiveStreams() {
		return db.query(`
			SELECT v.*, u.username, u.avatar
			FROM videos v JOIN users u ON v.user_id = u.id
			WHERE v.status = 'live'
			ORDER BY v.created_at DESC
		`).all();
	},

	isStreaming(videoId: string) {
		return activeStreams.has(videoId);
	},
}));
