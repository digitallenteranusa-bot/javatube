import { describe, expect, it } from 'bun:test';
import { composeRouter } from '..';
import { IS_ROUTES } from '../../contants';

const compose = composeRouter((r) => {
	r.get('/', () => {});
	r.post('/post', () => {});
});

describe('composeRouter', () => {
	it('is Routes', () => {
		// @ts-ignore
		expect(compose[IS_ROUTES]).toBeTrue();
	});
	it('has handler in routes', () => {
		// @ts-ignore
		expect(compose.find((r) => r.path === '/')?.handler).toBeFunction();
	});

	it('path is same', () => {
		// @ts-ignore
		expect(compose.find((r) => r.path === '/')?.path).toBe('/');
	});

	it('size is same', () => {
		expect(compose.length).toBe(2);
	});
});
