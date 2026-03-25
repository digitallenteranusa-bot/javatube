import type { ExceptionHandler, Middleware } from '../compose';
import { IS_EXCEPTION_HANDLER, IS_MIDDLEWARE, IS_ROUTES } from '../contants';
import type { Routes } from '../types';

export function isMiddleware(v: any): v is Middleware {
	return v[IS_MIDDLEWARE] as boolean;
}

export function isExceptionHandler(v: any): v is ExceptionHandler {
	return v[IS_EXCEPTION_HANDLER] as boolean;
}

export function isRoutes(v: any): v is Routes {
	return v[IS_ROUTES] as boolean;
}
