export * from './file';
import type { PartAddress } from '../../utils/multipart-scanner';
import { GFile } from './file';

/**
 * * Data Real
 */
export type FormDataEntryValue = string | number | GFile;

export class FormData {
	private fields: Map<string, FormDataEntryValue[]> = new Map();
	private isFullyParsed = false;

	constructor(
		private body?: Buffer,
		private addresses?: PartAddress[],
	) {
		if (!addresses || addresses.length === 0) {
			this.isFullyParsed = true;
		}
	}

	/**
	 * @ID
	 * GamanJS memakai lazyParse by name from FormData
	 * jadi penggunaan ram lebih sedikit, dan data tidak akan di load semua katika ada request
	 */
	private lazyParse(name: string): void {
		if (!(this.addresses && this.body)) return;
		if (this.isFullyParsed || this.fields.has(name)) return;

		// Cari di addresses yang belum dipindahkan ke fields
		const matchingAddresses = this.addresses.filter(
			(addr) => addr.name === name,
		);

		for (const addr of matchingAddresses) {
			const partBuffer = this.body.subarray(addr.start, addr.end); // Zero-copy

			let entryValue: FormDataEntryValue;

			if (addr.filename) {
				entryValue = new GFile(addr.filename, partBuffer, {
					type: addr.contentType,
				});
			} else if (!isNaN(Number((entryValue = partBuffer.toString())))) {
				entryValue = Number(entryValue);
			}

			this.internalAppend(addr.name, entryValue);
		}

		//! Hapus addresses yang sudah di-parse agar tidak double loop nantinya
		this.addresses = this.addresses.filter((addr) => addr.name !== name);
	}

	private parseAll(): void {
		if (!(this.addresses && this.body)) return;
		if (this.isFullyParsed) return;

		for (const addr of this.addresses) {
			const partBuffer = this.body.subarray(addr.start, addr.end);
			let entryValue: FormDataEntryValue;

			if (addr.filename) {
				entryValue = new GFile(addr.filename, partBuffer, {
					type: addr.contentType,
				});
			} else if (!isNaN(Number((entryValue = partBuffer.toString())))) {
				entryValue = Number(entryValue);
			}

			this.internalAppend(addr.name, entryValue);
		}
		this.addresses = [];
		this.isFullyParsed = true;
	}

	private internalAppend(name: string, value: FormDataEntryValue) {
		const existing = this.fields.get(name);
		if (existing) {
			existing.push(value);
		} else {
			this.fields.set(name, [value]);
		}
	}

	get(name: string): FormDataEntryValue | null {
		this.lazyParse(name);
		const values = this.fields.get(name);
		return values ? values[0] || null : null;
	}

	getAll(name: string): FormDataEntryValue[] {
		this.lazyParse(name);
		return this.fields.get(name) || [];
	}

	has(name: string): boolean {
		this.lazyParse(name);
		return this.fields.has(name);
	}

	set(name: string, value: FormDataEntryValue) {
		this.fields.set(name, [value]);
	}

	setAll(name: string, values: FormDataEntryValue[]) {
		this.fields.set(name, values);
	}

	// Methods yang butuh iterasi semua data
	entries(): IterableIterator<[string, FormDataEntryValue]> {
		this.parseAll();
		const flattened: [string, FormDataEntryValue][] = [];
		for (const [name, values] of this.fields.entries()) {
			values.forEach((v) => flattened.push([name, v]));
		}
		return flattened[Symbol.iterator]();
	}

	keys(): IterableIterator<string> {
		this.parseAll();
		return this.fields.keys();
	}

	values(): IterableIterator<FormDataEntryValue> {
		this.parseAll();
		const flattened: FormDataEntryValue[] = [];
		for (const values of this.fields.values()) {
			flattened.push(...values);
		}
		return flattened[Symbol.iterator]();
	}

	delete(name: string): void {
		this.lazyParse(name);
		this.fields.delete(name);

		if (!this.addresses) return;
		this.addresses = this.addresses.filter((addr) => addr.name !== name);
	}
}
