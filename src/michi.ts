/**
 * Fixed Michi router - uses full segment name as key instead of charCodeAt(0)
 * Original bug: segments starting with same letter (auth, admin, analytics) collide
 */

function castValue(v: string): string | boolean | number {
	if (typeof v !== 'string') return v;
	if (v === 'true') return true;
	if (v === 'false') return false;
	const n = Number(v);
	return isNaN(n) ? v : n;
}

interface RouteNode<T> {
	path: string;
	data: T | null;
	fallbackData: T | null;
	statics: Record<string, RouteNode<T>> | null;
	params: { name: string; data: T | null; next: RouteNode<T> | null } | null;
}

export class Michi<T = any> {
	private roots: Record<string, RouteNode<T>> = {};

	private static regex = {
		optionalParams: /(\/:\w+\?)/g,
	};

	private createRoute(path: string): RouteNode<T> {
		return { path, data: null, fallbackData: null, statics: null, params: null };
	}

	add(method: string, path: string, data: T, opts?: { useOriginalPath?: boolean }): T {
		if (!opts?.useOriginalPath) {
			if (!path || path === '') path = '/';
			if (path[0] !== '/') path = '/' + path;
		}

		method = method.toUpperCase();

		if (path.includes('?')) {
			const clean = path.replace(/\?/g, '');
			const optionals = path.match(Michi.regex.optionalParams) || [];
			this.add(method, clean, data, opts);
			for (const opt of optionals) {
				const variant = path.replace(opt, '');
				this.add(method, variant, data, opts);
			}
			return data;
		}

		const isWildcard = path.endsWith('*');
		const cleanPath = isWildcard ? path.slice(0, -1) : path;

		if (!this.roots[method]) this.roots[method] = this.createRoute('/');

		let node = this.roots[method];
		const segments = cleanPath.split('/').filter(Boolean);

		for (let i = 0; i < segments.length; i++) {
			const isLast = i === segments.length - 1;
			const seg = segments[i];

			if (seg[0] === ':') {
				const name = seg.slice(1);
				if (!node.params) node.params = { name, data: null, next: null };
				if (isLast && !isWildcard) {
					node.params.data = data;
					return data;
				}
				if (!node.params.next) node.params.next = this.createRoute('/');
				node = node.params.next;
				continue;
			}

			// FIX: Use full segment name as key instead of charCodeAt(0)
			if (!node.statics) node.statics = {};
			if (!node.statics[seg]) node.statics[seg] = this.createRoute(seg);
			node = node.statics[seg];
		}

		if (isWildcard) node.fallbackData = data;
		else node.data = data;

		return data;
	}

	find(method: string, path: string): { data: T; params: Record<string, any> } | null {
		const root = this.roots[method.toUpperCase()];
		if (!root) return null;
		if (path === '/' || path === '') {
			return root.data ? { data: root.data, params: {} } : null;
		}
		return this.match(path, path.length, root, 0);
	}

	private match(
		path: string,
		len: number,
		node: RouteNode<T>,
		pos: number,
	): { data: T; params: Record<string, any> } | null {
		const seg = node.path;
		const segLen = seg.length;

		if (seg !== '/') {
			if (path.substring(pos, pos + segLen) !== seg) return null;
			pos += segLen;
		}

		if (path[pos] === '/') pos++;

		if (pos >= len) {
			if (node.data) return { data: node.data, params: {} };
			if (node.fallbackData) return { data: node.fallbackData, params: { '*': '' } };
			return null;
		}

		// FIX: Match by full segment name
		if (node.statics) {
			// Extract current segment from path
			const nextSlash = path.indexOf('/', pos);
			const currentSeg = nextSlash === -1 ? path.substring(pos) : path.substring(pos, nextSlash);
			const child = node.statics[currentSeg];
			if (child) {
				const result = this.match(path, len, child, pos);
				if (result) return result;
			}
		}

		if (node.params) {
			const nextSlash = path.indexOf('/', pos);
			if (nextSlash === -1 || nextSlash >= len) {
				if (node.params.data) {
					return {
						data: node.params.data,
						params: { [node.params.name]: castValue(path.substring(pos, len)) },
					};
				}
			} else if (node.params.next) {
				const result = this.match(path, len, node.params.next, nextSlash);
				if (result) {
					result.params[node.params.name] = castValue(path.substring(pos, nextSlash));
					return result;
				}
			}
		}

		if (node.fallbackData) {
			return { data: node.fallbackData, params: { '*': castValue(path.substring(pos, len)) } };
		}

		return null;
	}
}
