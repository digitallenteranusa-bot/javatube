import { composeController } from '../../src/compose';
import { likeService } from '../services/like.service';

export const likeController = composeController(() => ({
	async like(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const videoId = ctx.param('videoId');
		const result = likeService().like(videoId, user.userId);
		return Res.send(result);
	},

	async dislike(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const videoId = ctx.param('videoId');
		const result = likeService().dislike(videoId, user.userId);
		return Res.send(result);
	},

	async removeLike(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const videoId = ctx.param('videoId');
		const result = likeService().removeLike(videoId, user.userId);
		return Res.send(result);
	},

	async status(ctx) {
		const videoId = ctx.param('videoId');
		let userId: string | null = null;
		try {
			const user = ctx.get<{ userId: string }>('user');
			userId = user?.userId || null;
		} catch {}
		const result = likeService().getStatus(videoId, userId);
		return Res.send(result);
	},
}));
