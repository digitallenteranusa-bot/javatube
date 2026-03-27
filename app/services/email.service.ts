import { composeService } from '../../src/compose';
import { db } from '../database/init';
import { randomId } from '../../src/utils/utils';

// Simple SMTP config from env
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@gamantube.local';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

export const emailService = composeService(() => ({
	createToken(userId: string, type: 'verify' | 'reset') {
		const token = randomId(32);
		const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h
		const id = randomId(16);
		db.run(
			'INSERT INTO email_tokens (id, user_id, type, token, expires_at) VALUES (?, ?, ?, ?, ?)',
			[id, userId, type, token, expiresAt],
		);
		return token;
	},

	verifyToken(token: string, type: 'verify' | 'reset') {
		const row = db.query(
			"SELECT * FROM email_tokens WHERE token = ? AND type = ? AND used = 0 AND expires_at > datetime('now')",
		).get(token, type) as any;
		return row || null;
	},

	markTokenUsed(token: string) {
		db.run('UPDATE email_tokens SET used = 1 WHERE token = ?', [token]);
	},

	async sendVerificationEmail(email: string, username: string, token: string) {
		const link = `${APP_URL}/verify-email?token=${token}`;
		const subject = 'Verifikasi Email - JavaTube';
		const body = `
Halo ${username},

Klik link berikut untuk memverifikasi email kamu:
${link}

Link ini berlaku selama 24 jam.

- JavaTube
		`.trim();

		return this.sendEmail(email, subject, body);
	},

	async sendResetEmail(email: string, username: string, token: string) {
		const link = `${APP_URL}/reset-password?token=${token}`;
		const subject = 'Reset Password - JavaTube';
		const body = `
Halo ${username},

Klik link berikut untuk mereset password kamu:
${link}

Link ini berlaku selama 24 jam. Jika kamu tidak meminta reset password, abaikan email ini.

- JavaTube
		`.trim();

		return this.sendEmail(email, subject, body);
	},

	async sendEmail(to: string, subject: string, body: string) {
		if (!SMTP_HOST) {
			// No SMTP configured - log to console for development
			Log.info(`[EMAIL] To: ${to}`);
			Log.info(`[EMAIL] Subject: ${subject}`);
			Log.info(`[EMAIL] Body: ${body}`);
			return true;
		}

		try {
			// Use Bun's native TCP for simple SMTP
			// For production, use a proper email library
			const socket = await Bun.connect({
				hostname: SMTP_HOST,
				port: SMTP_PORT,
				socket: {
					data(socket, data) {},
					open(socket) {
						// Simple SMTP conversation
						const msg = [
							`EHLO localhost`,
							`AUTH LOGIN`,
							Buffer.from(SMTP_USER).toString('base64'),
							Buffer.from(SMTP_PASS).toString('base64'),
							`MAIL FROM:<${SMTP_FROM}>`,
							`RCPT TO:<${to}>`,
							`DATA`,
							`From: JavaTube <${SMTP_FROM}>`,
							`To: ${to}`,
							`Subject: ${subject}`,
							`Content-Type: text/plain; charset=UTF-8`,
							``,
							body,
							`.`,
							`QUIT`,
						].join('\r\n');
						socket.write(msg);
					},
					close() {},
					error(socket, error) {
						Log.error('[EMAIL] SMTP error:', error);
					},
				},
			});
			return true;
		} catch (err) {
			Log.error('[EMAIL] Failed to send:', err);
			return false;
		}
	},
}));
