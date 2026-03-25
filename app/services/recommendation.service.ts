import { composeService } from '../../src/compose';
import { db } from '../database/init';

export const recommendationService = composeService(() => ({
	// Get recommendations based on current video's tags/category and user behavior
	getRecommendations(videoId: string, limit: number = 10) {
		const video = db.query('SELECT * FROM videos WHERE id = ?').get(videoId) as any;
		if (!video) return [];

		// Strategy: same uploader + popular videos, excluding current
		const sameUploader = db.query(`
			SELECT v.*, u.username, u.avatar
			FROM videos v JOIN users u ON v.user_id = u.id
			WHERE v.user_id = ? AND v.id != ? AND v.status = 'ready'
			ORDER BY v.views DESC
			LIMIT 4
		`).all(video.user_id, videoId);

		const remaining = limit - sameUploader.length;

		// Fill with popular videos from other uploaders
		const popular = db.query(`
			SELECT v.*, u.username, u.avatar
			FROM videos v JOIN users u ON v.user_id = u.id
			WHERE v.id != ? AND v.status = 'ready' AND v.user_id != ?
			ORDER BY v.views DESC, v.created_at DESC
			LIMIT ?
		`).all(videoId, video.user_id, remaining);

		return [...sameUploader, ...popular];
	},

	// Trending videos (most views in last 7 days)
	getTrending(limit: number = 20) {
		return db.query(`
			SELECT v.*, u.username, u.avatar,
				(SELECT COUNT(*) FROM view_logs vl WHERE vl.video_id = v.id AND vl.viewed_at >= datetime('now', '-7 days')) as recent_views
			FROM videos v JOIN users u ON v.user_id = u.id
			WHERE v.status = 'ready'
			ORDER BY recent_views DESC, v.views DESC
			LIMIT ?
		`).all(limit);
	},
}));
