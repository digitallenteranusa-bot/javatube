import { composeRouter } from '../../src/compose';
import { authController } from '../controllers/auth.controller';
import { videoController } from '../controllers/video.controller';
import { commentController } from '../controllers/comment.controller';
import { subscriptionController } from '../controllers/subscription.controller';
import { notificationController } from '../controllers/notification.controller';
import { userController } from '../controllers/user.controller';
import { adminController } from '../controllers/admin.controller';
import { likeController } from '../controllers/like.controller';
import { playlistController } from '../controllers/playlist.controller';
import { liveController } from '../controllers/live.controller';
import { analyticsController } from '../controllers/analytics.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import { authRateLimit, uploadRateLimit } from '../middleware/ratelimit.middleware';
import { recommendationService } from '../services/recommendation.service';
import { analyticsService } from '../services/analytics.service';
import path from 'node:path';
import { detectMime } from '../../src/utils/mime';

const UPLOADS_DIR = path.resolve(import.meta.dir, '..', 'uploads');

function serveHlsFile(filePath: string): Response {
	const ext = path.extname(filePath);
	const mime = ext === '.m3u8'
		? 'application/vnd.apple.mpegurl'
		: ext === '.ts'
			? 'video/mp2t'
			: 'application/octet-stream';
	return new Response(Bun.file(filePath), {
		headers: { 'Content-Type': mime },
	});
}

export const apiRoutes = composeRouter((r) => {
	r.group('/api', (r) => {
		// Auth routes
		r.post('/auth/register', [authController, 'register']).middleware(authRateLimit());
		r.post('/auth/login', [authController, 'login']).middleware(authRateLimit());
		r.get('/auth/me', [authController, 'me']).middleware(authMiddleware());

		// Email verification
		r.post('/auth/verify-email', [authController, 'verifyEmail']);
		r.post('/auth/resend-verification', [authController, 'resendVerification']).middleware(authMiddleware());

		// Forgot/reset password
		r.post('/auth/forgot-password', [authController, 'forgotPassword']).middleware(authRateLimit());
		r.post('/auth/reset-password', [authController, 'resetPassword']);

		// 2FA routes
		r.get('/auth/2fa/status', [authController, 'get2FAStatus']).middleware(authMiddleware());
		r.post('/auth/2fa/setup', [authController, 'setup2FA']).middleware(authMiddleware());
		r.post('/auth/2fa/enable', [authController, 'enable2FA']).middleware(authMiddleware());
		r.post('/auth/2fa/disable', [authController, 'disable2FA']).middleware(authMiddleware());

		// Video routes (public)
		r.get('/videos', [videoController, 'list']);
		r.get('/videos/search', [videoController, 'search']);
		r.get('/videos/:id', [videoController, 'show']);
		r.post('/videos/:id/view', (ctx) => {
			const id = ctx.param('id');
			const { videoService } = require('../services/video.service');
			videoService().incrementViews(id);
			// Log view for analytics
			try {
				const ip = ctx.get<string>('clientIp') || 'unknown';
				analyticsService().logView(id, ip);
			} catch {}
			return Res.send({ success: true });
		});

		// Video routes (auth required)
		r.post('/videos', [videoController, 'upload']).middleware(authMiddleware(), uploadRateLimit());
		r.put('/videos/:id', [videoController, 'update']).middleware(authMiddleware());
		r.delete('/videos/:id', [videoController, 'destroy']).middleware(authMiddleware());
		r.get('/my-videos', [videoController, 'myVideos']).middleware(authMiddleware());

		// Like/dislike routes
		r.post('/videos/:videoId/like', [likeController, 'like']).middleware(authMiddleware());
		r.post('/videos/:videoId/dislike', [likeController, 'dislike']).middleware(authMiddleware());
		r.delete('/videos/:videoId/like', [likeController, 'removeLike']).middleware(authMiddleware());
		r.get('/videos/:videoId/like-status', [likeController, 'status']);

		// Recommendations
		r.get('/videos/:videoId/recommendations', (ctx) => {
			const videoId = ctx.param('videoId');
			const limit = parseInt(ctx.query.limit as string) || 10;
			const recs = recommendationService().getRecommendations(videoId, limit);
			return Res.send(recs);
		});

		// Trending
		r.get('/trending', (ctx) => {
			const limit = parseInt(ctx.query.limit as string) || 20;
			const trending = recommendationService().getTrending(limit);
			return Res.send(trending);
		});

		// Comment routes
		r.get('/videos/:videoId/comments', [commentController, 'list']);
		r.post('/videos/:videoId/comments', [commentController, 'create']).middleware(authMiddleware());
		r.get('/comments/:commentId/replies', [commentController, 'replies']);
		r.delete('/comments/:id', [commentController, 'destroy']).middleware(authMiddleware());

		// Subscription routes
		r.post('/subscribe/:channelId', [subscriptionController, 'subscribe']).middleware(authMiddleware());
		r.delete('/subscribe/:channelId', [subscriptionController, 'unsubscribe']).middleware(authMiddleware());
		r.get('/subscribe/:channelId/status', [subscriptionController, 'status']).middleware(authMiddleware());
		r.get('/my-subscriptions', [subscriptionController, 'mySubscriptions']).middleware(authMiddleware());

		// Notification routes
		r.get('/notifications', [notificationController, 'list']).middleware(authMiddleware());
		r.get('/notifications/unread-count', [notificationController, 'unreadCount']).middleware(authMiddleware());
		r.post('/notifications/:id/read', [notificationController, 'markRead']).middleware(authMiddleware());
		r.post('/notifications/read-all', [notificationController, 'markAllRead']).middleware(authMiddleware());

		// User / Channel routes
		r.get('/profile', [userController, 'profile']).middleware(authMiddleware());
		r.put('/profile', [userController, 'updateProfile']).middleware(authMiddleware());
		r.post('/profile/avatar', [userController, 'updateAvatar']).middleware(authMiddleware());
		r.get('/channel/:username', [userController, 'channel']);

		// Playlist routes
		r.get('/playlists', [playlistController, 'list']).middleware(authMiddleware());
		r.post('/playlists', [playlistController, 'create']).middleware(authMiddleware());
		r.get('/playlists/watch-later', [playlistController, 'watchLater']).middleware(authMiddleware());
		r.post('/playlists/watch-later', [playlistController, 'addToWatchLater']).middleware(authMiddleware());
		r.get('/playlists/:id', [playlistController, 'show']);
		r.put('/playlists/:id', [playlistController, 'update']).middleware(authMiddleware());
		r.delete('/playlists/:id', [playlistController, 'destroy']).middleware(authMiddleware());
		r.post('/playlists/:id/items', [playlistController, 'addItem']).middleware(authMiddleware());
		r.delete('/playlists/:id/items/:videoId', [playlistController, 'removeItem']).middleware(authMiddleware());
		r.get('/users/:userId/playlists', [playlistController, 'publicPlaylists']);

		// Live streaming routes
		r.get('/live/streams', [liveController, 'activeStreams']);
		r.get('/live/stream-key', [liveController, 'getStreamKey']).middleware(authMiddleware());
		r.post('/live/stream-key', [liveController, 'generateStreamKey']).middleware(authMiddleware());
		r.post('/live/start', [liveController, 'startStream']).middleware(authMiddleware());
		r.post('/live/:videoId/stop', [liveController, 'stopStream']).middleware(authMiddleware());

		// Analytics routes (creator dashboard)
		r.get('/analytics/dashboard', [analyticsController, 'dashboard']).middleware(authMiddleware());
		r.get('/analytics/views', [analyticsController, 'viewsOverTime']).middleware(authMiddleware());
		r.get('/analytics/top-videos', [analyticsController, 'topVideos']).middleware(authMiddleware());
		r.get('/analytics/recent', [analyticsController, 'recentStats']).middleware(authMiddleware());
		r.get('/analytics/subscribers', [analyticsController, 'subscriberGrowth']).middleware(authMiddleware());

		// Admin routes (auth + admin required)
		r.get('/admin/dashboard', [adminController, 'dashboard']).middleware(authMiddleware()).middleware(adminMiddleware());
		r.get('/admin/users', [adminController, 'listUsers']).middleware(authMiddleware()).middleware(adminMiddleware());
		r.get('/admin/videos', [adminController, 'listVideos']).middleware(authMiddleware()).middleware(adminMiddleware());
		r.put('/admin/users/:userId/role', [adminController, 'setUserRole']).middleware(authMiddleware()).middleware(adminMiddleware());
		r.delete('/admin/users/:userId', [adminController, 'deleteUser']).middleware(authMiddleware()).middleware(adminMiddleware());
		r.delete('/admin/videos/:id', [adminController, 'deleteVideo']).middleware(authMiddleware()).middleware(adminMiddleware());
	});

	// HLS streaming routes
	r.get('/stream/:videoId/master.m3u8', (ctx) => {
		const videoId = ctx.param('videoId');
		return serveHlsFile(path.join(UPLOADS_DIR, 'hls', videoId, 'master.m3u8'));
	});

	r.get('/stream/:videoId/:resolution/playlist.m3u8', (ctx) => {
		const videoId = ctx.param('videoId');
		const resolution = ctx.param('resolution');
		return serveHlsFile(path.join(UPLOADS_DIR, 'hls', videoId, resolution, 'playlist.m3u8'));
	});

	r.get('/stream/:videoId/:resolution/:segment', (ctx) => {
		const videoId = ctx.param('videoId');
		const resolution = ctx.param('resolution');
		const segment = ctx.param('segment');
		return serveHlsFile(path.join(UPLOADS_DIR, 'hls', videoId, resolution, segment));
	});

	// Live HLS streaming routes
	r.get('/live-stream/:videoId/playlist.m3u8', (ctx) => {
		const videoId = ctx.param('videoId');
		return serveHlsFile(path.join(UPLOADS_DIR, 'live', videoId, 'playlist.m3u8'));
	});

	r.get('/live-stream/:videoId/:segment', (ctx) => {
		const videoId = ctx.param('videoId');
		const segment = ctx.param('segment');
		return serveHlsFile(path.join(UPLOADS_DIR, 'live', videoId, segment));
	});

	// Thumbnail route
	r.get('/thumbnails/:filename', (ctx) => {
		const filename = ctx.param('filename');
		return new Response(Bun.file(path.join(UPLOADS_DIR, 'thumbnails', filename)), {
			headers: { 'Content-Type': detectMime(filename) || 'image/jpeg' },
		});
	});

	// Avatar route
	r.get('/avatars/:filename', (ctx) => {
		const filename = ctx.param('filename');
		return new Response(Bun.file(path.join(UPLOADS_DIR, 'avatars', filename)), {
			headers: { 'Content-Type': detectMime(filename) || 'image/jpeg' },
		});
	});
});
