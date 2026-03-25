import { composeService } from '../../src/compose';
import { db } from '../database/init';
import { randomId } from '../../src/utils/utils';

export const likeService = composeService(() => ({
	like(videoId: string, userId: string) {
		return this.setReaction(videoId, userId, 'like');
	},

	dislike(videoId: string, userId: string) {
		return this.setReaction(videoId, userId, 'dislike');
	},

	removeLike(videoId: string, userId: string) {
		db.run('DELETE FROM likes WHERE video_id = ? AND user_id = ?', [videoId, userId]);
		this.syncCounts(videoId);
		return this.getStatus(videoId, userId);
	},

	setReaction(videoId: string, userId: string, type: 'like' | 'dislike') {
		const existing = db.query('SELECT id, type FROM likes WHERE video_id = ? AND user_id = ?').get(videoId, userId) as any;

		if (existing) {
			if (existing.type === type) {
				// Toggle off
				db.run('DELETE FROM likes WHERE id = ?', [existing.id]);
			} else {
				// Switch reaction
				db.run('UPDATE likes SET type = ? WHERE id = ?', [type, existing.id]);
			}
		} else {
			const id = randomId(16);
			db.run('INSERT INTO likes (id, video_id, user_id, type) VALUES (?, ?, ?, ?)', [id, videoId, userId, type]);
		}

		this.syncCounts(videoId);
		return this.getStatus(videoId, userId);
	},

	syncCounts(videoId: string) {
		const likes = (db.query("SELECT COUNT(*) as c FROM likes WHERE video_id = ? AND type = 'like'").get(videoId) as any).c;
		const dislikes = (db.query("SELECT COUNT(*) as c FROM likes WHERE video_id = ? AND type = 'dislike'").get(videoId) as any).c;
		db.run('UPDATE videos SET likes = ?, dislikes = ? WHERE id = ?', [likes, dislikes, videoId]);
	},

	getStatus(videoId: string, userId: string | null) {
		const likes = (db.query("SELECT COUNT(*) as c FROM likes WHERE video_id = ? AND type = 'like'").get(videoId) as any).c;
		const dislikes = (db.query("SELECT COUNT(*) as c FROM likes WHERE video_id = ? AND type = 'dislike'").get(videoId) as any).c;
		let userReaction: string | null = null;
		if (userId) {
			const row = db.query('SELECT type FROM likes WHERE video_id = ? AND user_id = ?').get(videoId, userId) as any;
			userReaction = row?.type || null;
		}
		return { likes, dislikes, userReaction };
	},
}));
