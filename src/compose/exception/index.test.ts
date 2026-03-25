import { describe, expect, it } from 'bun:test';
import { composeException } from '..';
import { IS_EXCEPTION_HANDLER } from '../../contants';

const err = new Error('test');
const exception = composeException((_err) => {
	return err;
});

describe('composeException', () => {
	it('is Exception', () => {
		// @ts-ignore
		expect(exception[IS_EXCEPTION_HANDLER]).toBeTrue();
	});
	it('error result is same', () => {
		expect(exception(null as any)).toEqual(err);
	});
});
