import { composeService } from '../../src/compose';
import { db } from '../database/init';
import { randomId } from '../../src/utils/utils';

export const commentService = composeService(() => ({
	create(videoId: string, userId: string, content: string, parentId?: string) {
		const id = randomId(16);
		db.run(
			'INSERT INTO comments (id, video_id, user_id, content, parent_id) VALUES (?, ?, ?, ?, ?)',
			[id, videoId, userId, content, parentId || null],
		);
		return this.getById(id);
	},

	getById(id: string) {
		return db.query(`
			SELECT c.*, u.username, u.avatar
			FROM comments c
			JOIN users u ON c.user_id = u.id
			WHERE c.id = ?
		`).get(id) as any;
	},

	listByVideo(videoId: string, page: number = 1, limit: number = 20) {
		const offset = (page - 1) * limit;
		// Get top-level comments only
		const comments = db.query(`
			SELECT c.*, u.username, u.avatar,
				(SELECT COUNT(*) FROM comments r WHERE r.parent_id = c.id) as reply_count
			FROM comments c
			JOIN users u ON c.user_id = u.id
			WHERE c.video_id = ? AND c.parent_id IS NULL
			ORDER BY c.created_at DESC
			LIMIT ? OFFSET ?
		`).all(videoId, limit, offset);

		const total = (db.query('SELECT COUNT(*) as count FROM comments WHERE video_id = ? AND parent_id IS NULL').get(videoId) as any).count;

		return {
			comments,
			pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
		};
	},

	getReplies(commentId: string) {
		return db.query(`
			SELECT c.*, u.username, u.avatar
			FROM comments c
			JOIN users u ON c.user_id = u.id
			WHERE c.parent_id = ?
			ORDER BY c.created_at ASC
		`).all(commentId);
	},

	delete(id: string, userId: string, isAdmin: boolean = false) {
		const comment = this.getById(id);
		if (!comment) return false;
		if (comment.user_id !== userId && !isAdmin) return false;
		// Delete replies too
		db.run('DELETE FROM comments WHERE parent_id = ?', [id]);
		db.run('DELETE FROM comments WHERE id = ?', [id]);
		return true;
	},
}));
