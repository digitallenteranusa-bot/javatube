import { composeService } from '../../src/compose';
import { db } from '../database/init';
import { randomId } from '../../src/utils/utils';

export const notificationService = composeService(() => ({
	create(userId: string, type: string, title: string, message: string, link: string) {
		const id = randomId(16);
		db.run(
			'INSERT INTO notifications (id, user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?, ?)',
			[id, userId, type, title, message, link],
		);
	},

	// Notify all subscribers of a channel about a new video
	notifyNewVideo(channelId: string, channelName: string, videoId: string, videoTitle: string) {
		const subs = db.query(
			'SELECT subscriber_id FROM subscriptions WHERE channel_id = ?',
		).all(channelId) as { subscriber_id: string }[];

		for (const sub of subs) {
			this.create(
				sub.subscriber_id,
				'new_video',
				`Video baru dari ${channelName}`,
				videoTitle,
				`/watch?v=${videoId}`,
			);
		}
	},

	// Notify video owner about a new comment
	notifyComment(videoOwnerId: string, commenterName: string, videoId: string, videoTitle: string) {
		this.create(
			videoOwnerId,
			'comment',
			`${commenterName} berkomentar`,
			`Di video "${videoTitle}"`,
			`/watch?v=${videoId}`,
		);
	},

	// Notify channel owner about new subscriber
	notifySubscribe(channelId: string, subscriberName: string) {
		this.create(
			channelId,
			'subscribe',
			'Subscriber baru',
			`${subscriberName} subscribe channel kamu`,
			'',
		);
	},

	listByUser(userId: string, page: number = 1, limit: number = 20) {
		const offset = (page - 1) * limit;
		const notifications = db.query(`
			SELECT * FROM notifications
			WHERE user_id = ?
			ORDER BY created_at DESC
			LIMIT ? OFFSET ?
		`).all(userId, limit, offset);

		const total = (db.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = ?').get(userId) as any).count;

		return {
			notifications,
			pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
		};
	},

	getUnreadCount(userId: string) {
		return (db.query(
			'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
		).get(userId) as any).count;
	},

	markAsRead(id: string, userId: string) {
		db.run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
	},

	markAllAsRead(userId: string) {
		db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
	},
}));
