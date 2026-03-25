export class GamanHeader {
	private data: Map<string, [string | string[], boolean]> | null = null;
	private originalHeaders: Headers;

	constructor(headers: Headers = new Headers()) {
		this.originalHeaders = headers;
	}

	/**
	 * Retrieves the value of a specific header by key.
	 * If the header value is an array (e.g., from multi-value headers), it will be joined into a single comma-separated string.
	 * Header keys are case-insensitive.
	 *
	 * @param key - The name of the header to retrieve.
	 * @returns The header value as a string, or null if not found.
	 */
	get(key: string): string | null {
		const k = key.toLowerCase();
		if (this.data && this.data.has(k)) {
			const [value] = this.data.get(k)!;
			return Array.isArray(value) ? value.join(', ') : value;
		}
		return this.originalHeaders.get(k);
	}

	set(key: string, value: string | string[]): this {
		if (!this.data) this.data = new Map();
		this.data.set(key.toLowerCase(), [value, true]);
		return this;
	}

	has(key: string): boolean {
		const k = key.toLowerCase();
		if (this.data && this.data.has(k)) return true;
		return this.originalHeaders.has(k);
	}

	delete(key: string): boolean {
		const k = key.toLowerCase();
		if (this.data) {
			this.data.delete(k);
		}
		// Notice: originalHeaders in Bun might not be mutator friendly if read-only request headers, so we just return true.
		return true; // We don't delete from originalHeaders typically since it represents the incoming request
	}

	*keys(): IterableIterator<string> {
		const seen = new Set<string>();
		if (this.data) {
			for (const k of this.data.keys()) {
				seen.add(k);
				yield k;
			}
		}
		for (const [k] of this.originalHeaders) {
			if (!seen.has(k)) yield k;
		}
	}

	*entries(): IterableIterator<[string, [string | string[], boolean]]> {
		const seen = new Set<string>();
		if (this.data) {
			for (const [k, v] of this.data.entries()) {
				seen.add(k);
				yield [k, v];
			}
		}
		for (const [k, v] of this.originalHeaders) {
			if (!seen.has(k)) yield [k, [v, false]];
		}
	}

	*getSetHeaders(): IterableIterator<[string, string | string[]]> {
		if (!this.data) return;
		for (const [k, [v, isSet]] of this.data.entries()) {
			if (isSet) yield [k, v];
		}
	}

	toRecord(): Record<string, string> {
		const result: Record<string, string> = {};
		for (const [key, [value]] of this.entries()) {
			result[key] = Array.isArray(value) ? value.join(', ') : value;
		}
		return result;
	}

	toMap(): Map<string, string | string[]> {
		const result = new Map<string, string | string[]>();
		for (const [key, [value]] of this.entries()) {
			result.set(key, value);
		}
		return result;
	}
}
