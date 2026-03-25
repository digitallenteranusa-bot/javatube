import { Priority } from '../enums/priority.enum';

/**
 * Sort array by priority using key or custom selector function.
 *
 * @param array - The array to sort.
 * @param selector - A key of T OR a function that returns a Priority string.
 * @param order - 'asc' | 'desc'. Default: 'asc'.
 */
export function sortArrayByPriority<T>(
	array: T[],
	selector: keyof T | ((item: T) => Priority | undefined),
	order: 'asc' | 'desc' = 'asc',
): T[] {
	return [...array].sort((a, b) => {
		const aPriority =
			typeof selector === 'function'
				? selector(a)
				: (a[selector] as Priority) || Priority.NORMAL;
		const bPriority =
			typeof selector === 'function'
				? selector(b)
				: (b[selector] as Priority) || Priority.NORMAL;

		const aValue = aPriority || Number.MAX_VALUE;
		const bValue = bPriority || Number.MAX_VALUE;

		const comparison = aValue - bValue;

		return order === 'asc' ? comparison : -comparison;
	});
}

/**
 * Insert item to an array and keep it sorted by priority.
 *
 * @param arr - Target array (will be mutated in place).
 * @param item - Item to insert.
 * @param selector - A key of T OR a function that returns a Priority string.
 * @param order - 'asc' | 'desc'. Default: 'asc'.
 */
export function insertAndSort<T>(
	arr: T[],
	item: T,
	selector: keyof T | ((item: T) => Priority | undefined),
	order: 'asc' | 'desc' = 'asc',
): void {
	arr.push(item);

	// ? pakai sortArrayByPriority, lalu replace isi array supaya reference tetap sama
	const sorted = sortArrayByPriority(arr, selector, order);
	arr.length = 0;
	arr.push(...sorted);
}
