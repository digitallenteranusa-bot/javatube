import { composeRouter } from '../../src/compose';
import { detectMime } from '../../src/utils/mime';
import path from 'node:path';

const PUBLIC_DIR = path.resolve(import.meta.dir, '..', 'public');

// Routes that should serve a specific HTML page regardless of sub-path
const SPA_ROUTES: Record<string, string> = {
	'/channel': '/channel.html',
};

const serveStatic = (ctx: any) => {
	let reqPath = ctx.path === '/' ? '/index.html' : ctx.path;

		// Check SPA-like routes (e.g. /channel/username -> channel.html)
		for (const [prefix, htmlFile] of Object.entries(SPA_ROUTES)) {
			if (reqPath.startsWith(prefix + '/') || reqPath === prefix) {
				reqPath = htmlFile;
				break;
			}
		}

		// If no extension, treat as .html page
		if (!path.extname(reqPath)) {
			reqPath += '.html';
		}

		// Prevent directory traversal
		const filePath = path.resolve(PUBLIC_DIR, '.' + reqPath);
		if (!filePath.startsWith(PUBLIC_DIR)) {
			return Res.error({}, { status: 403, message: 'Forbidden' });
		}

		const file = Bun.file(filePath);
		const mime = detectMime(filePath) || 'application/octet-stream';

	return new Response(file, {
		headers: { 'Content-Type': mime },
	});
};

export const staticRoutes = composeRouter((r) => {
	r.get('/', serveStatic);
	r.get('/*', serveStatic);
});
