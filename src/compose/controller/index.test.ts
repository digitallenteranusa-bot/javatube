import { describe, expect, it } from 'bun:test';
import { composeController } from '..';
import { IS_CONTROLLER } from '../../contants';

const controller = composeController(() => ({
	Create(ctx) {
		return Res.send('ok');
	},
}));

const con = controller();

describe('composeController', () => {
	it('is Controller', () => {
		// @ts-ignore
		expect(controller[IS_CONTROLLER]).toBeTrue();
	});
	it('has Handler in controller', () => {
		expect(con['Create']).toBeFunction();
	});
});
