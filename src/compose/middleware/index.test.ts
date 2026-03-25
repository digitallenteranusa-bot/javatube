import { describe, expect, it } from 'bun:test';
import { composeException, composeMiddleware } from '..';
import {
	IS_EXCEPTION_HANDLER,
	IS_MIDDLEWARE,
	IS_MIDDLEWARE_HANDLER,
} from '../../contants';
import { Priority } from '../../enums';
import { Responder } from '../../responder';

const compose = composeMiddleware(
	(ctx, next) => {
		return next();
	},
	{
		priority: Priority.HIGH,
	},
);
const middleware = compose();

describe('composeMiddleware', () => {
	it('is Middleware', () => {
		// @ts-ignore
		expect(middleware[IS_MIDDLEWARE]).toBeTrue();
	});
	it('is Middleware Handler', () => {
		// @ts-ignore
		expect(middleware.handler[IS_MIDDLEWARE_HANDLER]).toBeTrue();
	});

	it('priority middleware is same', () => {
		expect(middleware.config.priority).toEqual(Priority.HIGH);
	});

	it('handler is function in middleware', () => {
		expect(middleware.handler).toBeFunction();
	});

	it('result is next in middleware', async () => {
		const res = Responder.ok();
		expect(await middleware.handler({} as any, () => res)).toEqual(res);
	});
});
