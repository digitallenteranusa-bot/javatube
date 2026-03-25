import './global';

import { isExceptionHandler, isMiddleware, isRoutes } from './utils/is';
import { createContext } from './context';
import { Priority } from './enums';
import { insertAndSort } from './utils/priority';
import { Responder, ViewResponse } from './responder';
import { IGNORED_LOG_FOR_PATH_REGEX } from './contants';
import { Logger } from './utils/logger';
import { Michi } from '@gaman/michi';
import type { Middleware } from './compose/middleware';
import { composeRouter } from './compose/router';
import type {
	Context,
	GamanServerConfig,
	HttpServerConfig,
	RouteMetadata,
	Routes,
} from './types';
import type { ExceptionHandler } from './compose/index.ts';

export class Gaman {
	private michi = new Michi<RouteMetadata>();
	private middlewares: Middleware[] = [];

	private globalExceptionHandler: ExceptionHandler | null = null;


	/**
	 * @ID
	 * Menangani class Response sebelum dikirim ke client
	 * GamanJS akan memakai class Responder sendiri untuk membuat response itu menjadi sederhada, seperti: Res.json Res.text dll
	 *
	 * @param responder
	 * @param ctx
	 * @returns
	 */
	private async handleResponse(
		responder: Response | ViewResponse | any,
		ctx?: Context,
	) {
		let finalResponse: Response;

		if (responder instanceof Response) {
			finalResponse = responder;
		} else if (responder instanceof ViewResponse) {
			// Resolve view if registered, otherwise 500
			finalResponse = new Response(`View rendering not implemented natively yet. View: ${responder.getName()}`, { status: 500 });
		} else if (typeof responder === 'object' && responder !== null && !Buffer.isBuffer(responder)) {
			finalResponse = Responder.json(responder);
		} else if (responder === undefined) {
			finalResponse = new Response('Not Found', { status: 404 });
		} else {
			finalResponse = Responder.text(String(responder));
		}

		if (ctx && typeof (ctx.headers as any).getSetHeaders === 'function') {
			for (const [key, value] of (ctx.headers as any).getSetHeaders()) {
				if (value) {
					finalResponse.headers.set(
						key,
						Array.isArray(value) ? value.join(', ') : value,
					);
				}
			}

			const cookieHeaders = ctx.cookies.toSetCookieHeaders();
			for (const cookieStr of cookieHeaders) {
				finalResponse.headers.append('Set-Cookie', cookieStr);
			}
		}

		finalResponse.headers.set('X-Powered-By', 'GamanJS');

		Logger.setStatus(finalResponse.status);
		return finalResponse;
	}

	/**
	 * Internal logic to start the Bun HTTP server
	 * Handles both shorthand (number) and full configuration objects.
	 */
	private listenHttp(http: number | HttpServerConfig) {
		const isNumber = typeof http === 'number';
		const port = isNumber ? http : http.port;
		const hostname = isNumber ? 'localhost' : http.host || 'localhost';
		const maxRequestBodySize = isNumber ? undefined : http.maxRequestBodySize;
		const development = isNumber ? undefined : http.development;
		const reusePort = isNumber ? undefined : http.reusePort;

		const fetch = async (req: Request, app: Gaman) => {
			const method = req.method.toUpperCase();
			const startTime = performance.now();

			/** mini parse pathname */
			const urlStr = req.url;
			const pathStart = urlStr.indexOf('/', 8);
			const pathEnd = urlStr.indexOf('?', pathStart);
			const pathname = urlStr.substring(
				pathStart,
				pathEnd === -1 ? undefined : pathEnd,
			);

			const match = this.michi.find(req.method, pathname);
			if (!match) return new Response(undefined, { status: 404 });
			const ctx = createContext(req, pathname, match.params);
			ctx.headers.set('X-Request-ID', ctx.request.id); //* add request id to header

			/** Set Logger metadata */
			// Removed stateful logger calls

			const handlers = match.data.pipeline;
			let idx = 0;
			const next = async () => {
				const fn = handlers[idx++];
				if (!fn) return Responder.notFound();
				return await fn(ctx, next);
			};

			let finalResponse: Response | undefined;
			try {
				const result = await next();
				finalResponse = await app.handleResponse(result, ctx);
				return finalResponse;
			} catch (err: any) {
				const handler =
					match.data.exceptionHandler || this.globalExceptionHandler;

				if (handler) {
					try {
						const exceptionRes = await handler(err, ctx);
						finalResponse = await app.handleResponse(exceptionRes, ctx);
						return finalResponse;
					} catch (fatal) {
						finalResponse = new Response('Fatal Server Error', { status: 500 });
						return finalResponse;
					}
				}

				Logger.error(err);
				finalResponse = await app.handleResponse(
					Responder.error({}, { status: 500 }),
					ctx,
				);
				return finalResponse;
			} finally {
				const endTime = performance.now();
				if (!IGNORED_LOG_FOR_PATH_REGEX.test(pathname || '/')) {
					if (Logger.shouldLog('info')) {
						const statusColor = Logger.getStatusColor(finalResponse ? finalResponse.status : 500);
						const statusText = Logger.getStatusText(finalResponse ? finalResponse.status : 500);
						const statusStr = finalResponse ? finalResponse.status : 500;
						Logger.info(
							`§8[§6${ctx.request.id}§8] §8[§d${method}§8] §f${pathname || '/'} §8[${statusColor}${statusStr} ${statusText}§8] §rRequest processed in §a(${(endTime - startTime).toFixed(1)}ms)§r`,
						);
					}
				}
			}
		};

		Bun.serve({
			port,
			hostname,
			maxRequestBodySize,
			development,
			reusePort,
			fetch: (req) => fetch(req, this),
		});
	}

	public mount(s: ExceptionHandler | Middleware | Routes) {
		if (isExceptionHandler(s)) this.globalExceptionHandler = s;
		if (isMiddleware(s)) {
			insertAndSort(this.middlewares, s, (mw) => mw.config.priority);
		}
		if (isRoutes(s)) {
			// * register ke michi
			for (const rot of s) {
				for (const method of rot.methods) {
					if (rot.handler !== null) {
						this.michi.add(method, rot.path, {
							id: `${method}:${rot.path}`,
							exceptionHandler: rot.exceptionHandler,
							pipeline: [
								...this.middlewares.map((m) => m.handler),
								...rot.pipes,
							],
						});
					}
				}
			}
		}
	}

	public mountServer(config?: GamanServerConfig) {
		Logger.log(`§l§dGamanJS Framework v2 §r`);
		Logger.info('§o§7The Universal Transport Layer for Your Logic.');
		Logger.log(`§8 —————————————————————————————————————— §r`);

		if (typeof config?.http !== 'undefined') {
			const h =
				typeof config.http === 'number'
					? { port: config.http }
					: (config.http as HttpServerConfig);

			const host = h.host || 'localhost';
			const port = h.port || 3431;

			Logger.info(`§6HTTP§r  : Listening at §ahttp://${host}:${port}§r`);
			this.listenHttp(config.http);
		}
		// this.listenIPC();

		Logger.log(`§8 —————————————————————————————————————— §r`);
		Logger.log(`§rOrchestration complete. Ready for requests.`);
	}
}
