import { composeController } from '../../src/compose';
import { authService } from '../services/auth.service';
import { emailService } from '../services/email.service';
import { totpService } from '../services/totp.service';
import { db } from '../database/init';

export const authController = composeController(() => ({
	async register(ctx) {
		const { username, email, password } = await ctx.json<{
			username: string;
			email: string;
			password: string;
		}>();

		if (!username || !email || !password) {
			return Res.error(
				{ form: ['Username, email, dan password wajib diisi'] },
				{ status: 400 },
			);
		}

		if (password.length < 6) {
			return Res.error(
				{ password: ['Password minimal 6 karakter'] },
				{ status: 400 },
			);
		}

		const result = await authService().register(username, email, password);
		if ('error' in result) {
			return Res.error({ auth: [result.error] }, { status: 409 });
		}

		// Send verification email
		try {
			const token = emailService().createToken(result.user.id, 'verify');
			await emailService().sendVerificationEmail(email, username, token);
		} catch (err) {
			Log.error('[AUTH] Failed to send verification email:', err);
		}

		return Res.send(result, { status: 201, message: 'Registrasi berhasil. Cek email untuk verifikasi.' });
	},

	async login(ctx) {
		const { email, password, totpCode } = await ctx.json<{
			email: string;
			password: string;
			totpCode?: string;
		}>();

		if (!email || !password) {
			return Res.error(
				{ form: ['Email dan password wajib diisi'] },
				{ status: 400 },
			);
		}

		const result = await authService().login(email, password);
		if ('error' in result) {
			return Res.error({ auth: [result.error] }, { status: 401 });
		}

		// Check if 2FA is enabled
		const user = db.query('SELECT totp_enabled, totp_secret FROM users WHERE id = ?').get(result.user.id) as any;
		if (user?.totp_enabled) {
			if (!totpCode) {
				return Res.send({ requires2FA: true }, { status: 200, message: 'Masukkan kode 2FA' });
			}
			const valid = await totpService().verifyCode(user.totp_secret, totpCode);
			if (!valid) {
				return Res.error({ auth: ['Kode 2FA tidak valid'] }, { status: 401 });
			}
		}

		return Res.send(result, { message: 'Login berhasil' });
	},

	async me(ctx) {
		const payload = ctx.get<{ userId: string; username: string }>('user');
		const user = authService().findUserById(payload.userId);
		if (!user) {
			return Res.error({}, { status: 404, message: 'User tidak ditemukan' });
		}
		return Res.send(user);
	},

	// Email verification
	async verifyEmail(ctx) {
		const { token } = await ctx.json<{ token: string }>();
		if (!token) return Res.error({ token: ['Token wajib diisi'] }, { status: 400 });

		const row = emailService().verifyToken(token, 'verify');
		if (!row) return Res.error({ token: ['Token tidak valid atau sudah kadaluarsa'] }, { status: 400 });

		db.run('UPDATE users SET email_verified = 1 WHERE id = ?', [row.user_id]);
		emailService().markTokenUsed(token);

		return Res.send({ success: true }, { message: 'Email berhasil diverifikasi' });
	},

	async resendVerification(ctx) {
		const user = ctx.get<{ userId: string; username: string }>('user');
		const userData = db.query('SELECT email, email_verified FROM users WHERE id = ?').get(user.userId) as any;
		if (!userData) return Res.notFound();
		if (userData.email_verified) {
			return Res.send({ success: true }, { message: 'Email sudah terverifikasi' });
		}
		const token = emailService().createToken(user.userId, 'verify');
		await emailService().sendVerificationEmail(userData.email, user.username, token);
		return Res.send({ success: true }, { message: 'Email verifikasi dikirim ulang' });
	},

	// Forgot password
	async forgotPassword(ctx) {
		const { email } = await ctx.json<{ email: string }>();
		if (!email) return Res.error({ email: ['Email wajib diisi'] }, { status: 400 });

		const user = db.query('SELECT id, username FROM users WHERE email = ?').get(email) as any;
		// Always return success to prevent email enumeration
		if (user) {
			const token = emailService().createToken(user.id, 'reset');
			await emailService().sendResetEmail(email, user.username, token);
		}

		return Res.send({ success: true }, { message: 'Jika email terdaftar, link reset password telah dikirim' });
	},

	async resetPassword(ctx) {
		const { token, password } = await ctx.json<{ token: string; password: string }>();
		if (!token || !password) return Res.error({ form: ['Token dan password baru wajib diisi'] }, { status: 400 });
		if (password.length < 6) return Res.error({ password: ['Password minimal 6 karakter'] }, { status: 400 });

		const row = emailService().verifyToken(token, 'reset');
		if (!row) return Res.error({ token: ['Token tidak valid atau sudah kadaluarsa'] }, { status: 400 });

		const hash = await Bun.password.hash(password);
		db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, row.user_id]);
		emailService().markTokenUsed(token);

		return Res.send({ success: true }, { message: 'Password berhasil direset' });
	},

	// 2FA / TOTP
	async setup2FA(ctx) {
		const user = ctx.get<{ userId: string; username: string }>('user');
		const secret = totpService().generateSecret();
		const otpAuthUrl = totpService().getOtpAuthUrl(secret, user.username);
		return Res.send({ secret, otpAuthUrl });
	},

	async enable2FA(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const { secret, code } = await ctx.json<{ secret: string; code: string }>();
		if (!secret || !code) return Res.error({ form: ['Secret dan kode wajib diisi'] }, { status: 400 });

		const enabled = await totpService().enableTOTP(user.userId, secret, code);
		if (!enabled) return Res.error({ code: ['Kode 2FA tidak valid'] }, { status: 400 });

		return Res.send({ success: true }, { message: '2FA berhasil diaktifkan' });
	},

	async disable2FA(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const { code } = await ctx.json<{ code: string }>();
		const totp = totpService().getUserTOTP(user.userId);
		if (!totp?.totp_enabled) return Res.error({}, { status: 400, message: '2FA belum aktif' });

		const valid = await totpService().verifyCode(totp.totp_secret, code);
		if (!valid) return Res.error({ code: ['Kode 2FA tidak valid'] }, { status: 400 });

		totpService().disableTOTP(user.userId);
		return Res.send({ success: true }, { message: '2FA berhasil dinonaktifkan' });
	},

	async get2FAStatus(ctx) {
		const user = ctx.get<{ userId: string }>('user');
		const totp = totpService().getUserTOTP(user.userId);
		return Res.send({ enabled: !!totp?.totp_enabled });
	},
}));
