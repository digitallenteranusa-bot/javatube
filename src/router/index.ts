import { composeException } from '../compose';
import type { ControllerFactory } from '../compose/controller/index';
import type {
	RequestHandler,
	Route,
	RouteDefinition,
	RouterBuilder,
} from '../types';
import { isExceptionHandler } from '../utils/is';
import { normalizePath } from '../utils/utils';

export function Router(prefix: string = ''): RouterBuilder {
	const routes: Route[] = [];

	const addRoute = (
		method: string | string[],
		path: string,
		handler: RequestHandler | [fn: ControllerFactory, name: string],
	): RouteDefinition => {
		let finalHandler: RequestHandler | null = null;
		if (Array.isArray(handler)) {
			const [fn, name] = handler;
			const instance = fn();
			finalHandler = instance[name] as RequestHandler;
		} else {
			finalHandler = handler;
		}

		const fullPath = normalizePath(`/${prefix}/${path}`);
		const methods = Array.isArray(method)
			? method.map((m) => m.toUpperCase())
			: [method.toUpperCase()];

		const routeData: Route = {
			path: fullPath,
			methods,
			exceptionHandler: null,
			handler: finalHandler,
			middlewares: [],
			pipes: [],
		};
		routes.push(routeData);

		const definition: RouteDefinition = {
			middleware(...fn) {
				routeData.middlewares.push(...fn);
				return definition;
			},
			exception(eh) {
				if (isExceptionHandler(eh)) {
					routeData.exceptionHandler = eh;
				} else {
					routeData.exceptionHandler = composeException(eh);
				}
				return definition;
			},
			name(s) {
				routeData.name = s;
				return definition;
			},
		};

		return definition;
	};

	return {
		getRoutes: () => routes,

		get: (path, handler) => addRoute('GET', path, handler),
		post: (path, handler) => addRoute('POST', path, handler),
		put: (path, handler) => addRoute('PUT', path, handler),
		delete: (path, handler) => addRoute('DELETE', path, handler),
		patch: (path, handler) => addRoute('PATCH', path, handler),
		all: (path, handler) =>
			addRoute(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], path, handler),
		head: (path, handler) => addRoute('HEAD', path, handler),
		options: (path, handler) => addRoute('OPTIONS', path, handler),
		match: (methods, path, handler) => addRoute(methods, path, handler),

		group: (groupPrefix, callback) => {
			// Rekursi Router dengan prefix baru
			const subBuilder = Router(normalizePath(`/${prefix}/${groupPrefix}`));
			callback(subBuilder);

			const childRoutes = subBuilder.getRoutes();
			routes.push(...childRoutes);

			const groupDef: RouteDefinition = {
				middleware(fn) {
					const fns = Array.isArray(fn) ? fn : [fn];
					childRoutes.forEach((r) => r.middlewares.push(...fns));
					return groupDef;
				},
				exception(eh) {
					childRoutes.forEach((r) => {
						if (isExceptionHandler(eh)) {
							r.exceptionHandler = eh;
						} else {
							r.exceptionHandler = composeException(eh);
						}
					});
					return groupDef;
				},

				name(s) {
					childRoutes.forEach((r) => (r.name = s));
					return groupDef;
				},
			};
			return groupDef;
		},
	} as RouterBuilder;
}
