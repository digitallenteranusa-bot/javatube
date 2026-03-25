import { composeController } from '../../src/compose';
import { notificationService } from '../services/notification.service';

export const notificationController = composeController(() => ({
	async list(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const page = parseInt(ctx.query.page as string) || 1;
		const result = notificationService().listByUser(user.userId, page, 20);
		return Res.send(result);
	},

	async unreadCount(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const count = notificationService().getUnreadCount(user.userId);
		return Res.send({ count });
	},

	async markRead(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const id = ctx.param('id');
		notificationService().markAsRead(id, user.userId);
		return Res.send(null, { message: 'Ditandai sudah dibaca' });
	},

	async markAllRead(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		notificationService().markAllAsRead(user.userId);
		return Res.send(null, { message: 'Semua notifikasi ditandai sudah dibaca' });
	},
}));
