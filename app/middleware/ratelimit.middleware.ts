import { composeMiddleware } from '../../src/compose';
import { Priority } from '../../src/enums/priority.enum';

// Simple in-memory rate limiter
const requests = new Map<string, { count: number; resetAt: number }>();

// Cleanup old entries every 5 minutes
setInterval(() => {
	const now = Date.now();
	for (const [key, val] of requests) {
		if (val.resetAt <= now) requests.delete(key);
	}
}, 5 * 60 * 1000);

export function createRateLimiter(maxRequests: number = 60, windowMs: number = 60000) {
	return composeMiddleware(
		async (ctx, next) => {
			const ip = ctx.header('x-real-ip') || ctx.header('x-forwarded-for') || 'unknown';
			const key = `${ip}:${ctx.path}`;
			const now = Date.now();

			let entry = requests.get(key);
			if (!entry || entry.resetAt <= now) {
				entry = { count: 0, resetAt: now + windowMs };
				requests.set(key, entry);
			}

			entry.count++;

			if (entry.count > maxRequests) {
				const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
				return Res.error(
					{},
					{
						status: 429,
						message: 'Terlalu banyak request, coba lagi nanti',
						headers: {
							'Retry-After': String(retryAfter),
							'X-RateLimit-Limit': String(maxRequests),
							'X-RateLimit-Remaining': '0',
						},
					},
				);
			}

			return await next();
		},
		{ priority: Priority.MONITOR },
	);
}

// Pre-built rate limiters
export const apiRateLimit = createRateLimiter(60, 60000);       // 60 req/min for API
export const authRateLimit = createRateLimiter(10, 60000);      // 10 req/min for auth
export const uploadRateLimit = createRateLimiter(5, 60000);     // 5 req/min for upload
