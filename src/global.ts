import { Responder } from './responder.js';
import { Logger } from './utils/logger.js';

globalThis.Res = Responder;
globalThis.Log = Logger;

declare global {
	var Res: typeof import('./responder.js').Responder;
	var Log: typeof import('./utils/logger.js').Logger;

	namespace Bun {
		interface Env extends Gaman.Env {}
	}

	namespace Gaman {
		interface Locals {}
		interface Env {
			NODE_ENV?: 'development' | 'production';
			PORT?: any;
			HOST?: string;
		}
		interface Context {}
	}
}

export {};
