import { IS_CONTROLLER } from '../../contants';
import type { RequestHandler } from '../../types';

export type ControllerFactory<Args extends any[] = any[]> = (
	...args: Args
) => Record<string, RequestHandler>;

export function composeController<Args extends any[] = any[]>(
	factory: ControllerFactory<Args>,
): ControllerFactory<Args> {
	Object.defineProperty(factory, IS_CONTROLLER, {
		value: true,
		writable: false,
		enumerable: false,
	});
	return factory;
}
