import { composeController } from '../../src/compose';
import { subscriptionService } from '../services/subscription.service';
import { notificationService } from '../services/notification.service';
import { db } from '../database/init';

export const subscriptionController = composeController(() => ({
	async subscribe(ctx) {
		const user = ctx.get<{ userId: string; username: string }>('user');
		const channelId = ctx.param('channelId');

		const channel = db.query('SELECT id, username FROM users WHERE id = ?').get(channelId) as any;
		if (!channel) return Res.notFound();

		const result = subscriptionService().subscribe(user.userId, channelId);
		if ('error' in result) {
			return Res.error({ subscribe: [result.error] }, { status: 400 });
		}

		// Notify channel owner
		notificationService().notifySubscribe(channelId, user.username);

		const count = subscriptionService().getSubscriberCount(channelId);
		return Res.send({ subscribed: true, subscriberCount: count }, { message: 'Berhasil subscribe' });
	},

	async unsubscribe(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const channelId = ctx.param('channelId');

		subscriptionService().unsubscribe(user.userId, channelId);
		const count = subscriptionService().getSubscriberCount(channelId);
		return Res.send({ subscribed: false, subscriberCount: count }, { message: 'Berhasil unsubscribe' });
	},

	async status(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const channelId = ctx.param('channelId');
		const subscribed = subscriptionService().isSubscribed(user.userId, channelId);
		const count = subscriptionService().getSubscriberCount(channelId);
		return Res.send({ subscribed, subscriberCount: count });
	},

	async mySubscriptions(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const subs = subscriptionService().getSubscriptions(user.userId);
		return Res.send(subs);
	},
}));
