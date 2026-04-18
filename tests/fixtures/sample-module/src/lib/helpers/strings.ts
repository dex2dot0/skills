// String manipulation helpers used across the app.
// Migrated from the original lodash-based utilities.

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(input: string, max: number, suffix = "..."): string {
  if (input.length <= max) return input;
  return input.slice(0, Math.max(0, max - suffix.length)) + suffix;
}

export function capitalize(input: string): string {
  if (!input) return input;
  return input.charAt(0).toUpperCase() + input.slice(1);
}

export function titleCase(input: string): string {
  return input
    .split(/\s+/)
    .map((word) => capitalize(word.toLowerCase()))
    .join(" ");
}

export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

export function pluralize(word: string, count: number, plural?: string): string {
  if (count === 1) return word;
  return plural ?? `${word}s`;
}

export function camelToKebab(input: string): string {
  return input.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export function kebabToCamel(input: string): string {
  return input.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function isBlank(input: string | null | undefined): boolean {
  return !input || input.trim().length === 0;
}

export function repeat(input: string, n: number): string {
  if (n <= 0) return "";
  return new Array(n + 1).join(input);
}

export function reverse(input: string): string {
  return input.split("").reverse().join("");
}

export function countWords(input: string): number {
  if (isBlank(input)) return 0;
  return input.trim().split(/\s+/).length;
}

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function padLeft(input: string, length: number, char = " "): string {
  if (input.length >= length) return input;
  return repeat(char, length - input.length) + input;
}

export function padRight(input: string, length: number, char = " "): string {
  if (input.length >= length) return input;
  return input + repeat(char, length - input.length);
}
