import { composeMiddleware } from '../../src/compose';
import { Priority } from '../../src/enums/priority.enum';
import { authService } from '../services/auth.service';

export const authMiddleware = composeMiddleware(
	async (ctx, next) => {
		const authHeader = ctx.header('authorization');
		if (!authHeader?.startsWith('Bearer ')) {
			return Res.error({}, { status: 401, message: 'Token tidak ditemukan' });
		}

		const token = authHeader.slice(7);
		const payload = await authService().verifyToken(token);
		if (!payload) {
			return Res.error({}, { status: 401, message: 'Token tidak valid' });
		}

		ctx.set('user', payload);
		return await next();
	},
	{ priority: Priority.HIGH },
);
