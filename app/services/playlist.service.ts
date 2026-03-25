import { composeService } from '../../src/compose';
import { db } from '../database/init';
import { randomId } from '../../src/utils/utils';

export const playlistService = composeService(() => ({
	create(userId: string, title: string, description: string, isPublic: boolean) {
		const id = randomId(16);
		db.run(
			'INSERT INTO playlists (id, user_id, title, description, is_public) VALUES (?, ?, ?, ?, ?)',
			[id, userId, title, description, isPublic ? 1 : 0],
		);
		return this.getById(id);
	},

	getById(id: string) {
		const playlist = db.query(`
			SELECT p.*, u.username,
				(SELECT COUNT(*) FROM playlist_items WHERE playlist_id = p.id) as item_count
			FROM playlists p JOIN users u ON p.user_id = u.id
			WHERE p.id = ?
		`).get(id) as any;
		return playlist;
	},

	getWithItems(id: string) {
		const playlist = this.getById(id);
		if (!playlist) return null;
		const items = db.query(`
			SELECT pi.*, v.title, v.thumbnail, v.duration, v.views, v.status, u.username
			FROM playlist_items pi
			JOIN videos v ON pi.video_id = v.id
			JOIN users u ON v.user_id = u.id
			WHERE pi.playlist_id = ?
			ORDER BY pi.position ASC
		`).all(id);
		return { ...playlist, items };
	},

	listByUser(userId: string) {
		return db.query(`
			SELECT p.*,
				(SELECT COUNT(*) FROM playlist_items WHERE playlist_id = p.id) as item_count
			FROM playlists p WHERE p.user_id = ?
			ORDER BY p.created_at DESC
		`).all(userId);
	},

	listPublicByUser(userId: string) {
		return db.query(`
			SELECT p.*,
				(SELECT COUNT(*) FROM playlist_items WHERE playlist_id = p.id) as item_count
			FROM playlists p WHERE p.user_id = ? AND p.is_public = 1
			ORDER BY p.created_at DESC
		`).all(userId);
	},

	update(id: string, userId: string, title: string, description: string, isPublic: boolean) {
		const pl = this.getById(id);
		if (!pl || pl.user_id !== userId) return null;
		db.run('UPDATE playlists SET title = ?, description = ?, is_public = ? WHERE id = ?',
			[title, description, isPublic ? 1 : 0, id]);
		return this.getById(id);
	},

	delete(id: string, userId: string) {
		const pl = this.getById(id);
		if (!pl || pl.user_id !== userId) return false;
		db.run('DELETE FROM playlist_items WHERE playlist_id = ?', [id]);
		db.run('DELETE FROM playlists WHERE id = ?', [id]);
		return true;
	},

	addItem(playlistId: string, videoId: string, userId: string) {
		const pl = this.getById(playlistId);
		if (!pl || pl.user_id !== userId) return null;

		const existing = db.query('SELECT id FROM playlist_items WHERE playlist_id = ? AND video_id = ?').get(playlistId, videoId);
		if (existing) return { error: 'Video sudah ada di playlist' };

		const maxPos = (db.query('SELECT MAX(position) as m FROM playlist_items WHERE playlist_id = ?').get(playlistId) as any)?.m || 0;
		const id = randomId(16);
		db.run('INSERT INTO playlist_items (id, playlist_id, video_id, position) VALUES (?, ?, ?, ?)',
			[id, playlistId, videoId, maxPos + 1]);
		return { success: true };
	},

	removeItem(playlistId: string, videoId: string, userId: string) {
		const pl = this.getById(playlistId);
		if (!pl || pl.user_id !== userId) return false;
		db.run('DELETE FROM playlist_items WHERE playlist_id = ? AND video_id = ?', [playlistId, videoId]);
		return true;
	},

	// Get "Watch Later" playlist (auto-created per user)
	getOrCreateWatchLater(userId: string) {
		let wl = db.query("SELECT * FROM playlists WHERE user_id = ? AND title = 'Watch Later'").get(userId) as any;
		if (!wl) {
			const id = randomId(16);
			db.run("INSERT INTO playlists (id, user_id, title, description, is_public) VALUES (?, ?, 'Watch Later', 'Tonton nanti', 0)",
				[id, userId]);
			wl = this.getById(id);
		}
		return wl;
	},
}));
