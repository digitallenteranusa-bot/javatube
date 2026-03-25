import { composeService } from '../../src/compose';
import { db } from '../database/init';
import { randomId } from '../../src/utils/utils';

export const subscriptionService = composeService(() => ({
	subscribe(subscriberId: string, channelId: string) {
		if (subscriberId === channelId) return { error: 'Tidak bisa subscribe diri sendiri' };

		const existing = db.query(
			'SELECT id FROM subscriptions WHERE subscriber_id = ? AND channel_id = ?',
		).get(subscriberId, channelId) as any;

		if (existing) return { error: 'Sudah subscribe' };

		const id = randomId(16);
		db.run(
			'INSERT INTO subscriptions (id, subscriber_id, channel_id) VALUES (?, ?, ?)',
			[id, subscriberId, channelId],
		);
		return { success: true };
	},

	unsubscribe(subscriberId: string, channelId: string) {
		db.run(
			'DELETE FROM subscriptions WHERE subscriber_id = ? AND channel_id = ?',
			[subscriberId, channelId],
		);
		return { success: true };
	},

	isSubscribed(subscriberId: string, channelId: string) {
		const row = db.query(
			'SELECT id FROM subscriptions WHERE subscriber_id = ? AND channel_id = ?',
		).get(subscriberId, channelId) as any;
		return !!row;
	},

	getSubscriberCount(channelId: string) {
		return (db.query(
			'SELECT COUNT(*) as count FROM subscriptions WHERE channel_id = ?',
		).get(channelId) as any).count;
	},

	getSubscriptions(userId: string) {
		return db.query(`
			SELECT u.id, u.username, u.display_name, u.avatar,
				(SELECT COUNT(*) FROM subscriptions WHERE channel_id = u.id) as subscriber_count
			FROM subscriptions s
			JOIN users u ON s.channel_id = u.id
			WHERE s.subscriber_id = ?
			ORDER BY s.created_at DESC
		`).all(userId);
	},

	getSubscriberIds(channelId: string) {
		return db.query(
			'SELECT subscriber_id FROM subscriptions WHERE channel_id = ?',
		).all(channelId) as { subscriber_id: string }[];
	},
}));
