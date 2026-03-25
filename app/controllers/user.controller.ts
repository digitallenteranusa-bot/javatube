import { composeController } from '../../src/compose';
import { userService } from '../services/user.service';
import { videoService } from '../services/video.service';
import { subscriptionService } from '../services/subscription.service';

export const userController = composeController(() => ({
	async profile(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const profile = userService().getProfile(user.userId);
		if (!profile) return Res.notFound();
		return Res.send(profile);
	},

	async updateProfile(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const { display_name, bio } = await ctx.json<{ display_name: string; bio: string }>();
		const profile = userService().updateProfile(user.userId, display_name || '', bio || '');
		return Res.send(profile, { message: 'Profil berhasil diupdate' });
	},

	async updateAvatar(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const file = await ctx.file('avatar');
		if (!file) {
			return Res.error({ avatar: ['File avatar wajib diupload'] }, { status: 400 });
		}
		if (!file.hasExtension('jpg', 'jpeg', 'png', 'webp')) {
			return Res.error({ avatar: ['Format harus JPG, PNG, atau WebP'] }, { status: 400 });
		}
		const filename = await userService().updateAvatar(user.userId, file);
		return Res.send({ avatar: filename }, { message: 'Avatar berhasil diupdate' });
	},

	async channel(ctx) {
		const username = ctx.param('username');
		const profile = userService().getByUsername(username);
		if (!profile) return Res.notFound();

		const videos = videoService().listByUser(profile.id);

		// Check subscription status if logged in
		let subscribed = false;
		try {
			const viewer = ctx.get<{ userId: string }>('user');
			if (viewer) {
				subscribed = subscriptionService().isSubscribed(viewer.userId, profile.id);
			}
		} catch {}

		return Res.send({ ...profile, videos, subscribed });
	},
}));
