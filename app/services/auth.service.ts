import { SignJWT, jwtVerify } from 'jose';
import { composeService } from '../../src/compose';
import { db } from '../database/init';
import { randomId } from '../../src/utils/utils';

const JWT_SECRET = new TextEncoder().encode(
	process.env.JWT_SECRET || 'gamantube-default-secret-change-me',
);

export const authService = composeService(() => ({
	async register(username: string, email: string, password: string) {
		// Check if username or email already exists
		const existing = db.query('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email) as any;
		if (existing) {
			return { error: 'Username atau email sudah terdaftar' };
		}

		const id = randomId(16);
		const passwordHash = await Bun.password.hash(password);

		db.run(
			'INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)',
			[id, username, email, passwordHash],
		);

		const token = await this.generateToken(id, username, 'user');
		return { token, user: { id, username, email, role: 'user' } };
	},

	async login(email: string, password: string) {
		const user = db.query('SELECT * FROM users WHERE email = ? OR username = ?').get(email, email) as any;
		if (!user) {
			return { error: 'Email atau password salah' };
		}

		const valid = await Bun.password.verify(password, user.password_hash);
		if (!valid) {
			return { error: 'Email atau password salah' };
		}

		const role = user.role || 'user';
		const token = await this.generateToken(user.id, user.username, role);
		return { token, user: { id: user.id, username: user.username, email: user.email, role } };
	},

	async generateToken(userId: string, username: string, role: string = 'user') {
		return await new SignJWT({ userId, username, role })
			.setProtectedHeader({ alg: 'HS256' })
			.setExpirationTime('7d')
			.sign(JWT_SECRET);
	},

	async verifyToken(token: string) {
		try {
			const { payload } = await jwtVerify(token, JWT_SECRET);
			return payload as { userId: string; username: string; role: string };
		} catch {
			return null;
		}
	},

	findUserById(id: string) {
		const user = db.query('SELECT id, username, email, display_name, bio, avatar, role, created_at FROM users WHERE id = ?').get(id) as any;
		return user || null;
	},
}));
