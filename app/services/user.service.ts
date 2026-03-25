import { composeService } from '../../src/compose';
import { db } from '../database/init';
import path from 'node:path';

const UPLOADS_DIR = path.resolve(import.meta.dir, '..', 'uploads');

export const userService = composeService(() => ({
	getProfile(userId: string) {
		const user = db.query(`
			SELECT id, username, display_name, bio, avatar, role, created_at,
				(SELECT COUNT(*) FROM subscriptions WHERE channel_id = users.id) as subscriber_count,
				(SELECT COUNT(*) FROM videos WHERE user_id = users.id AND status = 'ready') as video_count
			FROM users WHERE id = ?
		`).get(userId) as any;
		return user || null;
	},

	getByUsername(username: string) {
		const user = db.query(`
			SELECT id, username, display_name, bio, avatar, role, created_at,
				(SELECT COUNT(*) FROM subscriptions WHERE channel_id = users.id) as subscriber_count,
				(SELECT COUNT(*) FROM videos WHERE user_id = users.id AND status = 'ready') as video_count
			FROM users WHERE username = ?
		`).get(username) as any;
		return user || null;
	},

	updateProfile(userId: string, displayName: string, bio: string) {
		db.run(
			'UPDATE users SET display_name = ?, bio = ? WHERE id = ?',
			[displayName, bio, userId],
		);
		return this.getProfile(userId);
	},

	async updateAvatar(userId: string, file: any) {
		const ext = file.extension || 'jpg';
		const filename = `${userId}.${ext}`;
		const filePath = path.join(UPLOADS_DIR, 'avatars', filename);
		await file.saveTo(filePath);
		db.run('UPDATE users SET avatar = ? WHERE id = ?', [filename, userId]);
		return filename;
	},

	// Admin methods
	listAllUsers(page: number = 1, limit: number = 20) {
		const offset = (page - 1) * limit;
		const users = db.query(`
			SELECT id, username, email, display_name, role, created_at,
				(SELECT COUNT(*) FROM videos WHERE user_id = users.id) as video_count
			FROM users
			ORDER BY created_at DESC
			LIMIT ? OFFSET ?
		`).all(limit, offset);

		const total = (db.query('SELECT COUNT(*) as count FROM users').get() as any).count;
		return {
			users,
			pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
		};
	},

	setRole(userId: string, role: string) {
		db.run('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
	},

	deleteUser(userId: string) {
		db.run('DELETE FROM comments WHERE user_id = ?', [userId]);
		db.run('DELETE FROM subscriptions WHERE subscriber_id = ? OR channel_id = ?', [userId, userId]);
		db.run('DELETE FROM notifications WHERE user_id = ?', [userId]);
		db.run('DELETE FROM videos WHERE user_id = ?', [userId]);
		db.run('DELETE FROM users WHERE id = ?', [userId]);
	},
}));
