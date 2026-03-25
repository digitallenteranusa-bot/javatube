import { composeController } from '../../src/compose';
import { analyticsService } from '../services/analytics.service';

export const analyticsController = composeController(() => ({
	async dashboard(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const stats = analyticsService().getCreatorStats(user.userId);
		return Res.send(stats);
	},

	async viewsOverTime(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const days = parseInt(ctx.query.days as string) || 30;
		const data = analyticsService().getViewsOverTime(user.userId, days);
		return Res.send(data);
	},

	async topVideos(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const limit = parseInt(ctx.query.limit as string) || 10;
		const data = analyticsService().getTopVideos(user.userId, limit);
		return Res.send(data);
	},

	async recentStats(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const data = analyticsService().getRecentVideoStats(user.userId);
		return Res.send(data);
	},

	async subscriberGrowth(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const days = parseInt(ctx.query.days as string) || 30;
		const data = analyticsService().getSubscriberGrowth(user.userId, days);
		return Res.send(data);
	},
}));
