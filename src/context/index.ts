import * as querystring from 'node:querystring';
import { FormData } from './formdata';
import { scanMultipart } from '../utils/multipart-scanner';
import { GFile } from './formdata/file';
import { HTTP_REQUEST_METADATA } from '../contants';
import { CookieMap } from 'bun';
import { GamanHeader } from './header';
import { randomId } from '../utils/utils';
import type { Context } from '../types';

export function createContext(
	req: Request,
	pathname: string,
	params: Record<string, any>,
): Context {
	const method = req.method.toUpperCase();
	const headers = new GamanHeader(req.headers);
	const contentType = headers.get('content-type') || '';

	let bodyBuffer: Buffer | null = null;
	let form: FormData | null = null;
	let _url: URL | null = null;
	let _query: any | null = null;
	const dataSet: Record<string, any> = Object.create(null);

	// Single source of body truth
	const getBuffer = async () => {
		if (bodyBuffer) return bodyBuffer;

		//! Cek apakah request punya body sebelum mencoba membaca
		if (method === 'GET' || method === 'HEAD') {
			return (bodyBuffer = Buffer.alloc(0));
		}
		const arrayBuffer = await req.arrayBuffer();
		bodyBuffer = Buffer.from(arrayBuffer);
		return bodyBuffer;
	};

	const ctx: Context = {
		path: pathname,
		params,
		cookies: new CookieMap(req.headers.get('cookie') ?? ''),
		request: {
			id: headers.get('x-request-id') || '',
			method,
			url: req.url,
			pathname,
			body: getBuffer,
		},
		get url() {
			if (!_url) _url = new URL(req.url);
			return _url;
		},

		header: (key: string) => headers.get(key),
		headers: headers,

		param(name) {
			return this.params[name];
		},

		get query() {
			if (!_query) _query = createQueryProxy(this.url.searchParams);
			return _query;
		},

		text: async () => (await getBuffer()).toString(),

		json: async <T = any>() => {
			try {
				return JSON.parse(await ctx.text()) as T;
			} catch {
				return {} as T;
			}
		},

		formData: async () => {
			if (form) return form;
			if (contentType.includes('application/x-www-form-urlencoded')) {
				const text = await ctx.text();
				form = parseFormUrlEncoded(text);
				return form;
			}

			const buffer = await getBuffer();
			const boundary = contentType
				.split('boundary=')[1]
				?.split(';')[0]
				?.replace(/"/g, '');

			const addresses = boundary ? scanMultipart(buffer, boundary) : [];
			form = new FormData(buffer, addresses);
			return form;
		},

		input: async (name) => (await ctx.formData()).get(name)?.toString() ?? null,
		inputs: async (name) =>
			((await ctx.formData()).getAll(name) || [])
				.map((s) => s.toString())
				.filter((s) => s != null),
		file: async (name) => {
			const d = (await ctx.formData()).get(name);
			if (d instanceof GFile) return d;
			return null;
		},
		files: async (name) =>
			((await ctx.formData()).getAll(name) || [])
				.map((s) => (s instanceof GFile ? s : null))
				.filter((s) => s != null),

		set(k, v) {
			dataSet[k] = v;
		},
		get: (k) => dataSet[k],
		has: (k) => k in dataSet,
		delete(k) {
			delete dataSet[k];
		},

		// @ts-ignore
		[HTTP_REQUEST_METADATA]: req,
	};

	return ctx;
}

function createQueryProxy(searchParams: URLSearchParams): any {
	return new Proxy(Object.create(null), {
		get(_, prop: string) {
			if (typeof prop !== 'string') return undefined;
			const all = searchParams.getAll(prop);
			if (all.length === 0) return '';
			return all.length === 1 ? all[0] : all;
		},
		ownKeys() {
			return Array.from(new Set(searchParams.keys()));
		},
		getOwnPropertyDescriptor() {
			return { enumerable: true, configurable: true };
		},
	});
}

function parseFormUrlEncoded(body: string): FormData {
	const data = querystring.parse(body);
	const formData = new FormData();
	for (const [key, value] of Object.entries(data)) {
		if (Array.isArray(value)) {
			formData.setAll(key, value);
		} else {
			formData.set(key, value || '');
		}
	}
	return formData;
}

// async function parseMultipartForm(
// 	body: Buffer,
// 	contentType: string,
// ): Promise<FormData> {
// 	const formData = new FormData();
// 	const boundary = contentType
// 		.split('boundary=')[1]
// 		?.split(';')[0]
// 		?.replace(/"/g, '');

// 	if (boundary) {
// 		const parts = parseMultipart(body, boundary);
// 		for (let i = 0; i < parts.length; i++) {
// 			const part = parts[i];
// 			if (!part) continue;

// 			if (part.isText) {
// 				formData.set(part.name, new FormDataEntryValue(part.name, part.text));
// 			} else if (part.filename) {
// 				formData.set(
// 					part.name,
// 					new FormDataEntryValue(
// 						part.name,
// 						new FormDataFile(part.filename, part.content, {
// 							type: part.mediaType,
// 						}),
// 					),
// 				);
// 			}
// 		}
// 	}
// 	return formData;
// }
