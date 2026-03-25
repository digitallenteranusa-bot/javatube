import { Gaman } from './gaman';

export function defineBootstrap(fn: (app: Gaman) => void) {
	const gaman = new Gaman();

	fn(gaman);
}

