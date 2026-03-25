import { GamanHeader } from './context/header';
import type { Metadata } from './types';
import { Logger } from './utils/logger';

export const DEFAULT_MESSAGES: Record<number, string> = {
	// 1xx Informational
	100: 'Continue',
	101: 'Switching Protocols',
	102: 'Processing',
	103: 'Early Hints',

	// 2xx Success
	200: 'Success',
	201: 'Created',
	202: 'Accepted',
	203: 'Non-Authoritative Information',
	204: 'No Content',
	205: 'Reset Content',
	206: 'Partial Content',
	207: 'Multi-Status',
	208: 'Already Reported',
	226: 'IM Used',

	// 3xx Redirection
	300: 'Multiple Choices',
	301: 'Moved Permanently',
	302: 'Found',
	303: 'See Other',
	304: 'Not Modified',
	305: 'Use Proxy',
	306: 'Switch Proxy',
	307: 'Temporary Redirect',
	308: 'Permanent Redirect',

	// 4xx Client Errors
	400: 'Bad Request',
	401: 'Unauthorized',
	402: 'Payment Required',
	403: 'Forbidden',
	404: 'Not Found',
	405: 'Method Not Allowed',
	406: 'Not Acceptable',
	407: 'Proxy Authentication Required',
	408: 'Request Timeout',
	409: 'Conflict',
	410: 'Gone',
	411: 'Length Required',
	412: 'Precondition Failed',
	413: 'Payload Too Large',
	414: 'URI Too Long',
	415: 'Unsupported Media Type',
	416: 'Range Not Satisfiable',
	417: 'Expectation Failed',
	418: "I'm a teapot",
	421: 'Misdirected Request',
	422: 'Unprocessable Entity',
	423: 'Locked',
	424: 'Failed Dependency',
	425: 'Too Early',
	426: 'Upgrade Required',
	428: 'Precondition Required',
	429: 'Too Many Requests',
	431: 'Request Header Fields Too Large',
	451: 'Unavailable For Legal Reasons',

	// 5xx Server Errors
	500: 'Internal Server Error',
	501: 'Not Implemented',
	502: 'Bad Gateway',
	503: 'Service Unavailable',
	504: 'Gateway Timeout',
	505: 'HTTP Version Not Supported',
	506: 'Variant Also Negotiates',
	507: 'Insufficient Storage',
	508: 'Loop Detected',
	510: 'Not Extended',
	511: 'Network Authentication Required',
};

export interface GamanResponse<T = any> {
	success: boolean;
	message: string;
	data?: T;
	errors?: Record<string, string[]>;
	meta?: Metadata;
}

export class ViewResponse {
	private viewName: string;
	private viewData: Record<string, any>;
	private initOrStatus: IResponseOptions;

	constructor(
		viewName: string,
		viewData: Record<string, any> = {},
		initOrStatus: IResponseOptions = { status: 200 },
	) {
		this.viewName = viewName;
		this.viewData = viewData;
		this.initOrStatus = initOrStatus;
	}

	getName() {
		return this.viewName;
	}

	getData() {
		return this.viewData;
	}

	getOptions() {
		return this.initOrStatus;
	}
}

export interface IResponseOptions {
	status?: number;
	statusText?: string;
	headers?: Record<string, string | string[]>;
	message?: string;
	metadata?: Record<string, any>;
	errors?: Record<string, string | string[]>;
}

function buildPayload(statusCode: number, data: any, ops: IResponseOptions) {
	if (statusCode === 204) return null;
	const payload: any = {
		success: statusCode >= 200 && statusCode < 300,
		message: ops.message ?? DEFAULT_MESSAGES[statusCode] ?? 'Unknown Status',
	};

	if (data !== null && data !== undefined) {
		payload.data = data;
	}

	if (ops.errors && Object.keys(ops.errors).length > 0) {
		for (const k in ops.errors) {
			const v = ops.errors[k];
			if (v) ops.errors[k] = Array.isArray(v) ? v : [v];
		}
		payload.errors = ops.errors;
	}

	if (ops.metadata && Object.keys(ops.metadata).length > 0) {
		payload.metadata = ops.metadata;
	}

	return JSON.stringify(payload);
}

function parseOps(initOrStatus: IResponseOptions | number = {}): IResponseOptions {
	if (typeof initOrStatus === 'number') return { status: initOrStatus };
	return initOrStatus;
}

export const Responder = {
	send(data: any, initOrStatus: IResponseOptions | number = {}) {
		const ops = parseOps(initOrStatus);
		const status = ops.status || 200;
		const headers = new Headers(ops.headers as any);
		if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json; charset=utf-8');

		return new Response(buildPayload(status, data, ops), {
			status,
			statusText: ops.statusText || DEFAULT_MESSAGES[status],
			headers
		});
	},

	message(msg: string, initOrStatus: IResponseOptions | number = {}) {
		const ops = parseOps(initOrStatus);
		ops.message = msg;
		const status = ops.status || 200;
		const headers = new Headers(ops.headers as any);
		if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json; charset=utf-8');

		return new Response(buildPayload(status, null, ops), {
			status,
			statusText: ops.statusText || DEFAULT_MESSAGES[status],
			headers
		});
	},

	error(errors: Record<string, string | string[]>, initOrStatus: IResponseOptions | number = {}) {
		const ops = parseOps(initOrStatus);
		ops.errors = errors;
		const status = ops.status || 400; // default 400 for errors if not overridden to >= 400
		const headers = new Headers(ops.headers as any);
		if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json; charset=utf-8');

		return new Response(buildPayload(status, null, ops), {
			status,
			statusText: ops.statusText || DEFAULT_MESSAGES[status],
			headers
		});
	},

	json(data: any, initOrStatus: IResponseOptions | number = {}) {
		const ops = parseOps(initOrStatus);
		const status = ops.status || 200;
		const headers = new Headers(ops.headers as any);
		if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json; charset=utf-8');

		return new Response(JSON.stringify(data), {
			status,
			statusText: ops.statusText || DEFAULT_MESSAGES[status],
			headers
		});
	},

	text(message: string, initOrStatus: IResponseOptions | number = {}) {
		const ops = parseOps(initOrStatus);
		const status = ops.status || 200;
		const headers = new Headers(ops.headers as any);
		headers.set('Content-Type', 'text/plain');

		return new Response(message, {
			status,
			statusText: ops.statusText || DEFAULT_MESSAGES[status],
			headers
		});
	},

	html(body: string, initOrStatus: IResponseOptions | number = {}) {
		const ops = parseOps(initOrStatus);
		const status = ops.status || 200;
		const headers = new Headers(ops.headers as any);
		headers.set('Content-Type', 'text/html');

		return new Response(body, {
			status,
			statusText: ops.statusText || DEFAULT_MESSAGES[status],
			headers
		});
	},

	render(viewName: string, viewData: Record<string, any> = {}, initOrStatus: IResponseOptions = { status: 200 }) {
		// Used by views engine. We return a ViewResponse and let Gaman core resolve it.
		// Wait, previously Responder.render returned a Responder with .view hydrated.
		// We will return a fresh ViewResponse object directly, and update Gaman.ts to check `instanceof ViewResponse`.
		return new ViewResponse(viewName, viewData, initOrStatus);
	},

	stream(readableStream: any, initOrStatus: IResponseOptions | number = {}) {
		const ops = parseOps(initOrStatus);
		const status = ops.status || 200;
		const headers = new Headers(ops.headers as any);
		headers.set('Content-Type', 'application/octet-stream');

		return new Response(readableStream, {
			status,
			statusText: ops.statusText || DEFAULT_MESSAGES[status],
			headers
		});
	},

	redirect(location: string, statusNumber: number = 302) {
		return new Response(null, {
			status: statusNumber,
			headers: { 'Location': location }
		});
	},

	ok(data?: any) {
		return this.send(data, { status: 200 });
	},

	notFound(data?: any) {
		return this.send(data, { status: 404 });
	}
};
