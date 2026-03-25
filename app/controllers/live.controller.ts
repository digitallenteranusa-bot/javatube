import { composeController } from '../../src/compose';
import { liveService } from '../services/live.service';

export const liveController = composeController(() => ({
	async getStreamKey(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const key = liveService().getStreamKey(user.userId);
		return Res.send({ streamKey: key });
	},

	async generateStreamKey(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const key = liveService().generateStreamKey(user.userId);
		return Res.send({ streamKey: key }, { message: 'Stream key dibuat' });
	},

	async startStream(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const { title, description } = await ctx.json<{ title: string; description: string }>();
		if (!title?.trim()) {
			return Res.error({ title: ['Judul live stream wajib diisi'] }, { status: 400 });
		}
		const result = await liveService().startStream(user.userId, title.trim(), description || '');
		return Res.send(result, { status: 201, message: 'Live stream dimulai' });
	},

	async stopStream(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const videoId = ctx.param('videoId');
		await liveService().stopStream(videoId);
		return Res.send(null, { message: 'Live stream dihentikan' });
	},

	async activeStreams(ctx) {
		const streams = liveService().getActiveStreams();
		return Res.send(streams);
	},
}));
