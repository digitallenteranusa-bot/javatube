import { composeController } from '../../src/compose';
import { userService } from '../services/user.service';
import { videoService } from '../services/video.service';
import { db } from '../database/init';

export const adminController = composeController(() => ({
	async dashboard(ctx) {
		const stats = {
			totalUsers: (db.query('SELECT COUNT(*) as count FROM users').get() as any).count,
			totalVideos: (db.query('SELECT COUNT(*) as count FROM videos').get() as any).count,
			readyVideos: (db.query("SELECT COUNT(*) as count FROM videos WHERE status = 'ready'").get() as any).count,
			processingVideos: (db.query("SELECT COUNT(*) as count FROM videos WHERE status = 'processing'").get() as any).count,
			failedVideos: (db.query("SELECT COUNT(*) as count FROM videos WHERE status = 'failed'").get() as any).count,
			totalComments: (db.query('SELECT COUNT(*) as count FROM comments').get() as any).count,
			totalViews: (db.query('SELECT COALESCE(SUM(views), 0) as total FROM videos').get() as any).total,
		};
		return Res.send(stats);
	},

	async listUsers(ctx) {
		const page = parseInt(ctx.query.page as string) || 1;
		const result = userService().listAllUsers(page, 20);
		return Res.send(result);
	},

	async listVideos(ctx) {
		const page = parseInt(ctx.query.page as string) || 1;
		const limit = 20;
		const offset = (page - 1) * limit;
		const status = (ctx.query.status as string) || '';

		let where = '';
		const params: any[] = [];
		if (status) {
			where = 'WHERE v.status = ?';
			params.push(status);
		}

		const videos = db.query(`
			SELECT v.*, u.username
			FROM videos v JOIN users u ON v.user_id = u.id
			${where}
			ORDER BY v.created_at DESC
			LIMIT ? OFFSET ?
		`).all(...params, limit, offset);

		const totalQuery = status
			? db.query('SELECT COUNT(*) as count FROM videos WHERE status = ?').get(status) as any
			: db.query('SELECT COUNT(*) as count FROM videos').get() as any;

		return Res.send({
			videos,
			pagination: { page, limit, total: totalQuery.count, totalPages: Math.ceil(totalQuery.count / limit) },
		});
	},

	async setUserRole(ctx) {
		const userId = ctx.param('userId');
		const { role } = await ctx.json<{ role: string }>();
		if (!['user', 'admin'].includes(role)) {
			return Res.error({ role: ['Role harus user atau admin'] }, { status: 400 });
		}
		userService().setRole(userId, role);
		return Res.send(null, { message: `Role diubah ke ${role}` });
	},

	async deleteUser(ctx) {
		const userId = ctx.param('userId');
		const admin = ctx.get<{ userId: string }>('user');
		if (userId === admin.userId) {
			return Res.error({}, { status: 400, message: 'Tidak bisa menghapus diri sendiri' });
		}
		userService().deleteUser(userId);
		return Res.send(null, { message: 'User dihapus' });
	},

	async deleteVideo(ctx) {
		const id = ctx.param('id');
		const admin = ctx.get<{ userId: string }>('user');
		const deleted = await videoService().deleteVideo(id, admin.userId, true);
		if (!deleted) return Res.notFound();
		return Res.send(null, { message: 'Video dihapus' });
	},
}));
