import { composeService } from '../../src/compose';
import { db } from '../database/init';

// Simple TOTP implementation (RFC 6238)
function generateSecret(length: number = 20): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
	let secret = '';
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	for (const byte of bytes) {
		secret += chars[byte % chars.length];
	}
	return secret;
}

function base32Decode(str: string): Uint8Array {
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
	let bits = '';
	for (const char of str.toUpperCase()) {
		const val = alphabet.indexOf(char);
		if (val === -1) continue;
		bits += val.toString(2).padStart(5, '0');
	}
	const bytes = new Uint8Array(Math.floor(bits.length / 8));
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
	}
	return bytes;
}

async function hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
	const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
	const sig = await crypto.subtle.sign('HMAC', cryptoKey, data);
	return new Uint8Array(sig);
}

async function generateTOTP(secret: string, time?: number): Promise<string> {
	const period = 30;
	const t = Math.floor((time || Date.now() / 1000) / period);
	const timeBytes = new Uint8Array(8);
	let tmp = t;
	for (let i = 7; i >= 0; i--) {
		timeBytes[i] = tmp & 0xff;
		tmp = Math.floor(tmp / 256);
	}
	const key = base32Decode(secret);
	const hmac = await hmacSha1(key, timeBytes);
	const offset = hmac[hmac.length - 1] & 0x0f;
	const code = ((hmac[offset] & 0x7f) << 24) |
		((hmac[offset + 1] & 0xff) << 16) |
		((hmac[offset + 2] & 0xff) << 8) |
		(hmac[offset + 3] & 0xff);
	return (code % 1000000).toString().padStart(6, '0');
}

export const totpService = composeService(() => ({
	generateSecret() {
		return generateSecret(20);
	},

	getOtpAuthUrl(secret: string, username: string) {
		const issuer = 'JavaTube';
		return `otpauth://totp/${issuer}:${encodeURIComponent(username)}?secret=${secret}&issuer=${issuer}&digits=6&period=30`;
	},

	async verifyCode(secret: string, code: string): Promise<boolean> {
		// Check current and adjacent time windows (±1 period) for clock skew
		const now = Math.floor(Date.now() / 1000);
		for (const offset of [-30, 0, 30]) {
			const expected = await generateTOTP(secret, now + offset);
			if (expected === code) return true;
		}
		return false;
	},

	async enableTOTP(userId: string, secret: string, code: string): Promise<boolean> {
		const valid = await this.verifyCode(secret, code);
		if (!valid) return false;
		db.run('UPDATE users SET totp_secret = ?, totp_enabled = 1 WHERE id = ?', [secret, userId]);
		return true;
	},

	disableTOTP(userId: string) {
		db.run('UPDATE users SET totp_secret = NULL, totp_enabled = 0 WHERE id = ?', [userId]);
	},

	getUserTOTP(userId: string) {
		const user = db.query('SELECT totp_secret, totp_enabled FROM users WHERE id = ?').get(userId) as any;
		return user || null;
	},
}));
