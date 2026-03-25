import { IS_MIDDLEWARE, IS_MIDDLEWARE_HANDLER } from '../../contants';
import { Priority } from '../../enums/priority.enum';
import { Responder } from '../../responder';
import type { Context } from '../../types';

export type MiddlewareHandler = (
	ctx: Context,
	next: () => any | Promise<any>,
) => any | Promise<any>;

export interface MiddlewareOptions {
	priority: Priority;
}

export interface Middleware {
	handler: MiddlewareHandler;
	config: MiddlewareOptions;
}

export type MiddlewarePathOptions = {
	path: string;
	method?: string | Array<string>;
};

export type DefaultMiddlewareOptions = {
	priority?: Priority;
};

export function composeMiddleware<Config = any>(
	mh: MiddlewareHandler,
	defaultConfig?: Config & DefaultMiddlewareOptions,
): (customConfig?: Config & DefaultMiddlewareOptions) => Middleware {
	const factory = (
		customConfig?: Config & DefaultMiddlewareOptions,
	): Middleware => {
		const handler: MiddlewareHandler = async (ctx, next) => {
			return await mh(ctx, next);
		};
		const config = {
			...defaultConfig,
			...customConfig,
		};
		const useable_config: MiddlewareOptions = {
			priority:
				config.priority === undefined ? Priority.NORMAL : config.priority,
		};

		Object.defineProperty(handler, IS_MIDDLEWARE_HANDLER, {
			value: true,
			writable: false,
			enumerable: false,
		});

		const middleware = {
			handler,
			config: useable_config,
		};
		Object.defineProperty(middleware, IS_MIDDLEWARE, {
			value: true,
			writable: false,
			enumerable: false,
		});
		return middleware;
	};
	return factory;
}
