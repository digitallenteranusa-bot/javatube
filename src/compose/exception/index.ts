import { IS_EXCEPTION_HANDLER } from '../../contants';
import type { Context } from '../../types';

export type ExceptionHandler = (error: any, ctx: Context) => any | Promise<any>;

export function composeException(cb: ExceptionHandler): ExceptionHandler {
	Object.defineProperty(cb, IS_EXCEPTION_HANDLER, {
		value: true,
		writable: false,
		enumerable: false,
	});
	return cb;
}
