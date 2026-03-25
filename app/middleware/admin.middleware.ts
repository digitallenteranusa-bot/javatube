import { composeMiddleware } from '../../src/compose';
import { Priority } from '../../src/enums/priority.enum';
import { db } from '../database/init';

export const adminMiddleware = composeMiddleware(
	async (ctx, next) => {
		const user = ctx.get<{ userId: string }>('user');
		if (!user) {
			return Res.error({}, { status: 401, message: 'Token tidak ditemukan' });
		}

		const dbUser = db.query('SELECT role FROM users WHERE id = ?').get(user.userId) as any;
		if (!dbUser || dbUser.role !== 'admin') {
			return Res.error({}, { status: 403, message: 'Akses admin diperlukan' });
		}

		ctx.set('role', 'admin');
		return await next();
	},
	{ priority: Priority.HIGH },
);
