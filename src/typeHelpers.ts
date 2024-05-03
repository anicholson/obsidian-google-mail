import { Notice } from "obsidian";

export function assertPresent<T>(
	value: T | null | undefined,
	message: string,
): asserts value is T {
	if (value === null || value === undefined) {
		warning(message);
		throw new Error(message);
	}
}

export function warning(message: string) {
	new Notice(`Plugin Warning (Google Mail): ${message}`);
}
