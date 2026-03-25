import { composeService } from '../../src/compose';
import { db } from '../database/init';
import { randomId } from '../../src/utils/utils';

export const analyticsService = composeService(() => ({
	logView(videoId: string, viewerIp: string) {
		const id = randomId(16);
		db.run('INSERT INTO view_logs (id, video_id, viewer_ip) VALUES (?, ?, ?)', [id, videoId, viewerIp]);
	},

	// Dashboard overview for a creator
	getCreatorStats(userId: string) {
		const totalViews = (db.query(
			'SELECT COALESCE(SUM(views), 0) as total FROM videos WHERE user_id = ?',
		).get(userId) as any).total;

		const totalLikes = (db.query(
			'SELECT COALESCE(SUM(likes), 0) as total FROM videos WHERE user_id = ?',
		).get(userId) as any).total;

		const totalVideos = (db.query(
			'SELECT COUNT(*) as count FROM videos WHERE user_id = ? AND status = \'ready\'',
		).get(userId) as any).count;

		const totalSubscribers = (db.query(
			'SELECT COUNT(*) as count FROM subscriptions WHERE channel_id = ?',
		).get(userId) as any).count;

		const totalComments = (db.query(`
			SELECT COUNT(*) as count FROM comments c
			JOIN videos v ON c.video_id = v.id
			WHERE v.user_id = ?
		`).get(userId) as any).count;

		return { totalViews, totalLikes, totalVideos, totalSubscribers, totalComments };
	},

	// Views per day for last 30 days
	getViewsOverTime(userId: string, days: number = 30) {
		return db.query(`
			SELECT DATE(vl.viewed_at) as date, COUNT(*) as views
			FROM view_logs vl
			JOIN videos v ON vl.video_id = v.id
			WHERE v.user_id = ? AND vl.viewed_at >= datetime('now', '-${days} days')
			GROUP BY DATE(vl.viewed_at)
			ORDER BY date ASC
		`).all(userId);
	},

	// Top videos by views
	getTopVideos(userId: string, limit: number = 10) {
		return db.query(`
			SELECT id, title, views, likes, dislikes, duration, thumbnail, created_at
			FROM videos
			WHERE user_id = ? AND status = 'ready'
			ORDER BY views DESC
			LIMIT ?
		`).all(userId, limit);
	},

	// Recent views per video (last 7 days)
	getRecentVideoStats(userId: string) {
		return db.query(`
			SELECT v.id, v.title, v.views as total_views,
				(SELECT COUNT(*) FROM view_logs vl WHERE vl.video_id = v.id AND vl.viewed_at >= datetime('now', '-7 days')) as week_views,
				(SELECT COUNT(*) FROM view_logs vl WHERE vl.video_id = v.id AND vl.viewed_at >= datetime('now', '-1 day')) as today_views,
				(SELECT COUNT(*) FROM comments WHERE video_id = v.id) as comments,
				v.likes, v.dislikes
			FROM videos v
			WHERE v.user_id = ? AND v.status = 'ready'
			ORDER BY week_views DESC
			LIMIT 20
		`).all(userId);
	},

	// Subscriber growth over time
	getSubscriberGrowth(userId: string, days: number = 30) {
		return db.query(`
			SELECT DATE(created_at) as date, COUNT(*) as new_subs
			FROM subscriptions
			WHERE channel_id = ? AND created_at >= datetime('now', '-${days} days')
			GROUP BY DATE(created_at)
			ORDER BY date ASC
		`).all(userId);
	},
}));
