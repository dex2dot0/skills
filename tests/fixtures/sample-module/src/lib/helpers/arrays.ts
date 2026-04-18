// Array helpers without external dependencies.

export function chunk<T>(arr: readonly T[], size: number): T[][] {
  if (size <= 0) throw new Error("size must be > 0");
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export function uniq<T>(arr: readonly T[]): T[] {
  return Array.from(new Set(arr));
}

export function uniqBy<T, K>(arr: readonly T[], key: (item: T) => K): T[] {
  const seen = new Set<K>();
  const out: T[] = [];
  for (const item of arr) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

export function groupBy<T, K extends string | number>(
  arr: readonly T[],
  key: (item: T) => K,
): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const item of arr) {
    const k = key(item);
    (out[k] ||= []).push(item);
  }
  return out;
}

export function partition<T>(
  arr: readonly T[],
  predicate: (item: T) => boolean,
): [T[], T[]] {
  const yes: T[] = [];
  const no: T[] = [];
  for (const item of arr) {
    (predicate(item) ? yes : no).push(item);
  }
  return [yes, no];
}

export function zip<A, B>(a: readonly A[], b: readonly B[]): Array<[A, B]> {
  const len = Math.min(a.length, b.length);
  const out: Array<[A, B]> = new Array(len);
  for (let i = 0; i < len; i++) out[i] = [a[i], b[i]];
  return out;
}

export function range(start: number, end?: number, step = 1): number[] {
  if (end === undefined) {
    end = start;
    start = 0;
  }
  if (step === 0) throw new Error("step must be non-zero");
  const out: number[] = [];
  if (step > 0) {
    for (let i = start; i < end; i += step) out.push(i);
  } else {
    for (let i = start; i > end; i += step) out.push(i);
  }
  return out;
}

export function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function sample<T>(arr: readonly T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function compact<T>(arr: readonly (T | null | undefined | false | "" | 0)[]): T[] {
  return arr.filter((x): x is T => Boolean(x));
}
