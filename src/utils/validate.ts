export const getSafe = <T>(value: T | undefined | null, defaultValue: T): T => {
	return value ?? defaultValue;
};

export function isDefined<T>(val: T | undefined | null): val is T {
	return val !== undefined && val !== null;
}

export function isBlank(val: any): boolean {
	// 1. Cek dasar (null atau undefined)
	if (val === null || val === undefined) return true;

	// 2. Cek String (Cek spasi pake .trim())
	if (typeof val === 'string') {
		return val.trim().length === 0;
	}

	// 3. Cek Array
	if (Array.isArray(val)) {
		return val.length === 0;
	}

	// 4. Cek Object
	if (typeof val === 'object') {
		return Object.keys(val).length === 0;
	}

	return false;
}
