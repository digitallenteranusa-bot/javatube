import { composeController } from '../../src/compose';
import { videoService } from '../services/video.service';

export const videoController = composeController(() => ({
	async upload(ctx) {
		const user = ctx.get<{ userId: string; username: string }>('user');
		const title = await ctx.input('title');
		const description = await ctx.input('description');
		const file = await ctx.file('video');

		if (!title) {
			return Res.error({ title: ['Judul video wajib diisi'] }, { status: 400 });
		}

		if (!file) {
			return Res.error({ video: ['File video wajib diupload'] }, { status: 400 });
		}

		if (!file.hasExtension('mp4', 'mov', 'avi', 'mkv', 'webm')) {
			return Res.error({ video: ['Format video tidak didukung (mp4, mov, avi, mkv, webm)'] }, { status: 400 });
		}

		const video = await videoService().upload(user.userId, title, description || '', file);
		return Res.send(video, { status: 201, message: 'Video sedang diproses' });
	},

	async list(ctx) {
		const page = parseInt(ctx.query.page as string) || 1;
		const limit = parseInt(ctx.query.limit as string) || 20;
		const result = videoService().listAll(page, limit);
		return Res.send(result);
	},

	async search(ctx) {
		const q = (ctx.query.q as string) || '';
		if (!q.trim()) {
			return Res.send({ videos: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
		}
		const page = parseInt(ctx.query.page as string) || 1;
		const limit = parseInt(ctx.query.limit as string) || 20;
		const result = videoService().search(q, page, limit);
		return Res.send(result);
	},

	async show(ctx) {
		const id = ctx.param('id');
		const video = videoService().getById(id);
		if (!video) {
			return Res.notFound();
		}
		return Res.send(video);
	},

	async update(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const id = ctx.param('id');
		const { title, description } = await ctx.json<{ title: string; description: string }>();

		if (!title) {
			return Res.error({ title: ['Judul video wajib diisi'] }, { status: 400 });
		}

		const video = videoService().updateVideo(id, user.userId, title, description || '');
		if (!video) {
			return Res.error({}, { status: 403, message: 'Tidak memiliki akses' });
		}
		return Res.send(video, { message: 'Video berhasil diupdate' });
	},

	async destroy(ctx) {
		const user = ctx.get<{ userId: string; role?: string }>('user');
		const id = ctx.param('id');
		const isAdmin = user.role === 'admin';
		const deleted = await videoService().deleteVideo(id, user.userId, isAdmin);
		if (!deleted) {
			return Res.error({}, { status: 403, message: 'Tidak memiliki akses' });
		}
		return Res.send(null, { message: 'Video berhasil dihapus' });
	},

	async view(ctx) {
		const id = ctx.param('id');
		videoService().incrementViews(id);
		return Res.send({ success: true });
	},

	async myVideos(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const videos = videoService().listByUser(user.userId);
		return Res.send(videos);
	},
}));
