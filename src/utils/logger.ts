import { TextFormat } from './textformat';
import { appendFile } from 'node:fs/promises';

export const Logger = {
	level: 'debug' as 'info' | 'debug' | 'warn' | 'error',

	log: (...msg: any[]) => Logger.info(...msg),

	info: (...msg: any[]) => Logger._log('info', msg),
	debug: (...msg: any[]) => Logger._log('debug', msg),
	warn: (...msg: any[]) => Logger._log('warn', msg),
	error: (...msg: any[]) => Logger._log('error', msg),

	_log: (type: 'info' | 'debug' | 'warn' | 'error', msg: any[]) => {
		if (!Logger.shouldLog(type)) return;

		const time = Logger.getShortTime();

		const colorPrefix: Record<typeof type, string> = {
			info: '§a[INFO~]',
			debug: '§b[DEBUG]',
			warn: '§e[WARN~]',
			error: '§c[ERROR]',
		};

		const color: Record<typeof type, string> = {
			info: '§r',
			debug: '§b',
			warn: '§e',
			error: '§c',
		};

		const text = `${colorPrefix[type]} §8[${time}]`;

		msg = [
			TextFormat.format(text) + TextFormat.format(color[type]),
			...msg.map((m) => {
				if (m instanceof Error) {
					return TextFormat.format('§7' + (m.stack || m.message));
				}
				if (typeof m === 'object') {
					return TextFormat.format('§7' + JSON.stringify(m, null, 2));
				}
				return TextFormat.format('§7' + String(m));
			}),
			TextFormat.RESET,
		];
		console[type === 'error' ? 'error' : type === 'warn' ? 'warn' : 'log'](
			...msg,
		);
	},

	getStatusColor: (status: number | null) => {
		if (!status) return '§8';
		if (status >= 200 && status < 300) return '§a';
		if (status >= 300 && status < 400) return '§e';
		if (status >= 400 && status < 500) return '§c';
		if (status >= 500) return '§4';
		return '§7';
	},

	getStatusText: (status: number | null) => {
		if (!status) return '';
		if (status >= 200 && status < 300) return 'OK';
		if (status >= 300 && status < 400) return 'Redirect';
		if (status >= 400 && status < 500) return 'Client Err';
		if (status >= 500) return 'Server Err';
		return '';
	},

	shouldLog: (level: 'info' | 'debug' | 'warn' | 'error') => {
		const levels: Record<'info' | 'debug' | 'warn' | 'error', number> = {
			error: 0,
			warn: 1,
			info: 2,
			debug: 3,
		};
		return levels[level] <= levels[Logger.level];
	},

	setRequestId(requestId: string) {},

	setRoute(route: string) {},

	setStatus(status: number | null) {},

	setMethod(method: string) {},

	getShortTime: () => {
		const now = new Date();
		const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
		const time = now.toTimeString().split(' ')[0]; // HH:MM:SS
		return `${date} ${time}`;
	},
};

export const Log = Logger;
