import { composeController } from '../../src/compose';
import { playlistService } from '../services/playlist.service';

export const playlistController = composeController(() => ({
	async create(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const { title, description, isPublic } = await ctx.json<{ title: string; description: string; isPublic: boolean }>();
		if (!title?.trim()) {
			return Res.error({ title: ['Judul playlist wajib diisi'] }, { status: 400 });
		}
		const playlist = playlistService().create(user.userId, title.trim(), description || '', isPublic !== false);
		return Res.send(playlist, { status: 201, message: 'Playlist dibuat' });
	},

	async list(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const playlists = playlistService().listByUser(user.userId);
		return Res.send(playlists);
	},

	async show(ctx) {
		const id = ctx.param('id');
		const playlist = playlistService().getWithItems(id);
		if (!playlist) return Res.notFound();
		return Res.send(playlist);
	},

	async update(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const id = ctx.param('id');
		const { title, description, isPublic } = await ctx.json<{ title: string; description: string; isPublic: boolean }>();
		if (!title?.trim()) {
			return Res.error({ title: ['Judul playlist wajib diisi'] }, { status: 400 });
		}
		const playlist = playlistService().update(id, user.userId, title.trim(), description || '', isPublic !== false);
		if (!playlist) return Res.error({}, { status: 403, message: 'Tidak memiliki akses' });
		return Res.send(playlist, { message: 'Playlist diupdate' });
	},

	async destroy(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const id = ctx.param('id');
		const deleted = playlistService().delete(id, user.userId);
		if (!deleted) return Res.error({}, { status: 403, message: 'Tidak memiliki akses' });
		return Res.send(null, { message: 'Playlist dihapus' });
	},

	async addItem(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const playlistId = ctx.param('id');
		const { videoId } = await ctx.json<{ videoId: string }>();
		if (!videoId) return Res.error({ videoId: ['Video ID wajib diisi'] }, { status: 400 });
		const result = playlistService().addItem(playlistId, videoId, user.userId);
		if (!result) return Res.error({}, { status: 403, message: 'Tidak memiliki akses' });
		if ('error' in result) return Res.error({ video: [result.error] }, { status: 409 });
		return Res.send(result, { status: 201, message: 'Video ditambahkan ke playlist' });
	},

	async removeItem(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const playlistId = ctx.param('id');
		const videoId = ctx.param('videoId');
		const removed = playlistService().removeItem(playlistId, videoId, user.userId);
		if (!removed) return Res.error({}, { status: 403, message: 'Tidak memiliki akses' });
		return Res.send(null, { message: 'Video dihapus dari playlist' });
	},

	async watchLater(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const wl = playlistService().getOrCreateWatchLater(user.userId);
		const full = playlistService().getWithItems(wl.id);
		return Res.send(full);
	},

	async addToWatchLater(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const { videoId } = await ctx.json<{ videoId: string }>();
		if (!videoId) return Res.error({ videoId: ['Video ID wajib diisi'] }, { status: 400 });
		const wl = playlistService().getOrCreateWatchLater(user.userId);
		const result = playlistService().addItem(wl.id, videoId, user.userId);
		if (!result) return Res.error({}, { status: 500, message: 'Gagal menambahkan' });
		if ('error' in result) return Res.error({ video: [result.error] }, { status: 409 });
		return Res.send(result, { message: 'Ditambahkan ke Watch Later' });
	},

	async publicPlaylists(ctx) {
		const userId = ctx.param('userId');
		const playlists = playlistService().listPublicByUser(userId);
		return Res.send(playlists);
	},
}));
