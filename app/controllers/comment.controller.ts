import { composeController } from '../../src/compose';
import { commentService } from '../services/comment.service';
import { notificationService } from '../services/notification.service';
import { videoService } from '../services/video.service';

export const commentController = composeController(() => ({
	async list(ctx) {
		const videoId = ctx.param('videoId');
		const page = parseInt(ctx.query.page as string) || 1;
		const result = commentService().listByVideo(videoId, page, 20);
		return Res.send(result);
	},

	async replies(ctx) {
		const commentId = ctx.param('commentId');
		const replies = commentService().getReplies(commentId);
		return Res.send(replies);
	},

	async create(ctx) {
		const user = ctx.get<{ userId: string; username: string }>('user');
		const videoId = ctx.param('videoId');
		const { content, parentId } = await ctx.json<{ content: string; parentId?: string }>();

		if (!content?.trim()) {
			return Res.error({ content: ['Komentar tidak boleh kosong'] }, { status: 400 });
		}

		const video = videoService().getById(videoId);
		if (!video) return Res.notFound();

		const comment = commentService().create(videoId, user.userId, content.trim(), parentId);

		// Notify video owner (if not self)
		if (video.user_id !== user.userId) {
			notificationService().notifyComment(video.user_id, user.username, videoId, video.title);
		}

		// Notify parent comment author (if reply and not self)
		if (parentId) {
			const parent = commentService().getById(parentId);
			if (parent && parent.user_id !== user.userId) {
				notificationService().notifyComment(parent.user_id, user.username, videoId, video.title);
			}
		}

		return Res.send(comment, { status: 201, message: 'Komentar ditambahkan' });
	},

	async destroy(ctx) {
		const user = ctx.get<{ userId: string; role?: string }>('user');
		const id = ctx.param('id');
		const isAdmin = user.role === 'admin';
		const deleted = commentService().delete(id, user.userId, isAdmin);
		if (!deleted) {
			return Res.error({}, { status: 403, message: 'Tidak memiliki akses' });
		}
		return Res.send(null, { message: 'Komentar dihapus' });
	},
}));
