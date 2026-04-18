// Date and time helpers. Avoid bringing in moment/date-fns for these basics.

export const SECOND_MS = 1000;
export const MINUTE_MS = 60 * SECOND_MS;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;
export const WEEK_MS = 7 * DAY_MS;

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / DAY_MS);
}

export function startOfDay(date: Date): Date {
  const next = new Date(date.getTime());
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date): Date {
  const next = new Date(date.getTime());
  next.setUTCHours(23, 59, 59, 999);
  return next;
}

export function isSameDay(a: Date, b: Date): boolean {
  return toISODate(a) === toISODate(b);
}

export function humanizeDuration(ms: number): string {
  if (ms < MINUTE_MS) return `${Math.round(ms / SECOND_MS)}s`;
  if (ms < HOUR_MS) return `${Math.round(ms / MINUTE_MS)}m`;
  if (ms < DAY_MS) return `${Math.round(ms / HOUR_MS)}h`;
  if (ms < WEEK_MS) return `${Math.round(ms / DAY_MS)}d`;
  return `${Math.round(ms / WEEK_MS)}w`;
}

export function relativeTime(date: Date, now: Date = new Date()): string {
  const delta = now.getTime() - date.getTime();
  const future = delta < 0;
  const abs = Math.abs(delta);
  const value = humanizeDuration(abs);
  return future ? `in ${value}` : `${value} ago`;
}

export function parseDuration(input: string): number {
  const match = input.match(/^(\d+)\s*(s|m|h|d|w)$/);
  if (!match) throw new Error(`Invalid duration: ${input}`);
  const n = Number(match[1]);
  switch (match[2]) {
    case "s": return n * SECOND_MS;
    case "m": return n * MINUTE_MS;
    case "h": return n * HOUR_MS;
    case "d": return n * DAY_MS;
    case "w": return n * WEEK_MS;
    default: throw new Error(`Unreachable unit ${match[2]}`);
  }
}
