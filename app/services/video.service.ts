import { composeService } from '../../src/compose';
import { db } from '../database/init';
import { randomId } from '../../src/utils/utils';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { GFile } from '../../src/context/formdata/file';

const UPLOADS_DIR = path.resolve(import.meta.dir, '..', 'uploads');

const RESOLUTIONS = [
	{ name: '360p', width: 640, height: 360, bitrate: '800k', audioBitrate: '96k' },
	{ name: '720p', width: 1280, height: 720, bitrate: '2500k', audioBitrate: '128k' },
	{ name: '1080p', width: 1920, height: 1080, bitrate: '5000k', audioBitrate: '192k' },
];

export const videoService = composeService(() => ({
	async upload(userId: string, title: string, description: string, file: GFile) {
		const videoId = randomId(16);
		const ext = file.extension || 'mp4';
		const filename = `${videoId}.${ext}`;
		const filePath = path.join(UPLOADS_DIR, 'videos', filename);

		// Save original file
		await file.saveTo(filePath);

		// Set status to ready immediately so video can be watched as direct mp4
		db.run(
			'INSERT INTO videos (id, user_id, title, description, filename, status) VALUES (?, ?, ?, ?, ?, ?)',
			[videoId, userId, title, description || '', filename, 'ready'],
		);

		// Start transcoding in background (video is already watchable as mp4)
		transcodeToHLS(videoId, filePath).catch((err) => {
			Log.error(`Transcode failed for ${videoId}:`, err);
		});

		return this.getById(videoId);
	},

	getById(id: string) {
		return db.query(`
			SELECT v.*, u.username
			FROM videos v
			JOIN users u ON v.user_id = u.id
			WHERE v.id = ?
		`).get(id) as any;
	},

	listAll(page: number = 1, limit: number = 20) {
		const offset = (page - 1) * limit;
		const videos = db.query(`
			SELECT v.*, u.username
			FROM videos v
			JOIN users u ON v.user_id = u.id
			WHERE v.status = 'ready'
			ORDER BY v.created_at DESC
			LIMIT ? OFFSET ?
		`).all(limit, offset);

		const total = (db.query("SELECT COUNT(*) as count FROM videos WHERE status = 'ready'").get() as any).count;

		return {
			videos,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	},

	listByUser(userId: string) {
		return db.query(`
			SELECT v.*, u.username
			FROM videos v
			JOIN users u ON v.user_id = u.id
			WHERE v.user_id = ?
			ORDER BY v.created_at DESC
		`).all(userId);
	},

	search(query: string, page: number = 1, limit: number = 20) {
		const offset = (page - 1) * limit;
		const searchTerm = `%${query}%`;
		const videos = db.query(`
			SELECT v.*, u.username
			FROM videos v
			JOIN users u ON v.user_id = u.id
			WHERE v.status = 'ready' AND (v.title LIKE ? OR v.description LIKE ? OR u.username LIKE ?)
			ORDER BY v.created_at DESC
			LIMIT ? OFFSET ?
		`).all(searchTerm, searchTerm, searchTerm, limit, offset);

		const total = (db.query(`
			SELECT COUNT(*) as count FROM videos v
			JOIN users u ON v.user_id = u.id
			WHERE v.status = 'ready' AND (v.title LIKE ? OR v.description LIKE ? OR u.username LIKE ?)
		`).get(searchTerm, searchTerm, searchTerm) as any).count;

		return {
			videos,
			pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
		};
	},

	updateVideo(id: string, userId: string, title: string, description: string) {
		const video = this.getById(id);
		if (!video || video.user_id !== userId) return null;
		db.run('UPDATE videos SET title = ?, description = ? WHERE id = ?', [title, description, id]);
		return this.getById(id);
	},

	async deleteVideo(id: string, userId: string, isAdmin: boolean = false) {
		const video = this.getById(id);
		if (!video) return false;
		if (video.user_id !== userId && !isAdmin) return false;

		// Delete files
		const { rm } = await import('node:fs/promises');
		try {
			await rm(path.join(UPLOADS_DIR, 'videos', video.filename), { force: true });
			await rm(path.join(UPLOADS_DIR, 'thumbnails', `${id}.jpg`), { force: true });
			await rm(path.join(UPLOADS_DIR, 'hls', id), { recursive: true, force: true });
		} catch {}

		// Delete from DB (comments cascade)
		db.run('DELETE FROM comments WHERE video_id = ?', [id]);
		db.run('DELETE FROM notifications WHERE link LIKE ?', [`%${id}%`]);
		db.run('DELETE FROM videos WHERE id = ?', [id]);
		return true;
	},

	incrementViews(id: string) {
		db.run('UPDATE videos SET views = views + 1 WHERE id = ?', [id]);
	},
}));

async function getVideoResolution(inputPath: string): Promise<{ width: number; height: number }> {
	try {
		const proc = Bun.spawn([
			'ffprobe', '-v', 'error',
			'-select_streams', 'v:0',
			'-show_entries', 'stream=width,height',
			'-of', 'csv=s=x:p=0',
			inputPath,
		]);
		const output = await new Response(proc.stdout).text();
		const [w, h] = output.trim().split('x').map(Number);
		if (w && h) return { width: w, height: h };
	} catch {}
	return { width: 1920, height: 1080 };
}

async function transcodeToHLS(videoId: string, inputPath: string) {
	const outputDir = path.join(UPLOADS_DIR, 'hls', videoId);
	await mkdir(outputDir, { recursive: true });

	const thumbnailPath = path.join(UPLOADS_DIR, 'thumbnails', `${videoId}.jpg`);

	// Generate thumbnail at 2 second mark
	const thumbProc = Bun.spawn([
		'ffmpeg', '-i', inputPath,
		'-ss', '00:00:02',
		'-vframes', '1',
		'-vf', 'scale=640:360',
		'-y',
		thumbnailPath,
	], { stdout: 'ignore', stderr: 'ignore' });
	await thumbProc.exited;

	// Get source resolution to skip resolutions higher than source
	const source = await getVideoResolution(inputPath);
	const applicableRes = RESOLUTIONS.filter(r => r.height <= source.height);
	// Always include at least 360p
	if (applicableRes.length === 0) applicableRes.push(RESOLUTIONS[0]);

	// Transcode each resolution
	const masterEntries: string[] = [];
	let allSuccess = true;

	for (const res of applicableRes) {
		const resDir = path.join(outputDir, res.name);
		await mkdir(resDir, { recursive: true });

		Log.info(`Transcoding ${videoId} to ${res.name}...`);

		const proc = Bun.spawn([
			'ffmpeg', '-threads', '2', '-i', inputPath,
			'-c:v', 'libx264',
			'-c:a', 'aac',
			'-threads', '2',
			'-preset', 'ultrafast',
			'-crf', '23',
			'-vf', `scale=${res.width}:${res.height}:force_original_aspect_ratio=decrease,pad=${res.width}:${res.height}:(ow-iw)/2:(oh-ih)/2`,
			'-b:v', res.bitrate,
			'-maxrate', res.bitrate,
			'-bufsize', `${parseInt(res.bitrate) * 2}k`,
			'-b:a', res.audioBitrate,
			'-start_number', '0',
			'-hls_time', '10',
			'-hls_list_size', '0',
			'-hls_segment_filename', path.join(resDir, 'segment%03d.ts'),
			'-f', 'hls',
			'-y',
			path.join(resDir, 'playlist.m3u8'),
		], { stdout: 'ignore', stderr: 'ignore' });

		const exitCode = await proc.exited;

		if (exitCode === 0) {
			const bandwidth = parseInt(res.bitrate) * 1000;
			masterEntries.push(
				`#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${res.width}x${res.height},NAME="${res.name}"`,
				`${res.name}/playlist.m3u8`,
			);
			Log.info(`${videoId} ${res.name} done`);
		} else {
			Log.error(`${videoId} ${res.name} failed (exit ${exitCode})`);
			allSuccess = false;
		}
	}

	if (masterEntries.length > 0) {
		// Write master playlist
		const masterContent = '#EXTM3U\n' + masterEntries.join('\n') + '\n';
		await writeFile(path.join(outputDir, 'master.m3u8'), masterContent);

		// Get duration
		let duration = 0;
		try {
			const probe = Bun.spawn([
				'ffprobe', '-v', 'error',
				'-show_entries', 'format=duration',
				'-of', 'csv=p=0',
				inputPath,
			]);
			const durationStr = await new Response(probe.stdout).text();
			duration = parseFloat(durationStr.trim()) || 0;
		} catch {}

		db.run(
			"UPDATE videos SET status = 'ready', thumbnail = ?, duration = ? WHERE id = ?",
			[`${videoId}.jpg`, duration, videoId],
		);
		Log.info(`Video ${videoId} transcoded successfully (${masterEntries.length / 2} resolutions)`);
	} else {
		db.run("UPDATE videos SET status = 'failed' WHERE id = ?", [videoId]);
		Log.error(`Video ${videoId} transcode failed - no resolutions succeeded`);
	}
}
