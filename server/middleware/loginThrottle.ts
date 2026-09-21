/**
 * Caps failed sign-in attempts per machine.
 *
 * Without it a competitor can guess the admin password — or another team's — as fast as
 * the server will answer, and every guess costs a bcrypt comparison on the one thread
 * that also runs the quiz timers. Only failures count, and successes do not clear them:
 * otherwise signing into your own account every few guesses would reset the limit.
 * At event start, forty teams signing in from forty machines never come close.
 */
const WINDOW_MS = 60_000;
const MAX_FAILURES_PER_WINDOW = 10;

const failuresByIp = new Map<string, number[]>();

function recentFailures(ip: string, now: number): number[] {
  const recent = (failuresByIp.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length > 0) failuresByIp.set(ip, recent);
  else failuresByIp.delete(ip);
  return recent;
}

/** Milliseconds this machine must wait before trying again; 0 when it may try now. */
export function loginRetryAfterMs(ip: string, now = Date.now()): number {
  const recent = recentFailures(ip, now);
  if (recent.length < MAX_FAILURES_PER_WINDOW) return 0;
  return WINDOW_MS - (now - recent[recent.length - MAX_FAILURES_PER_WINDOW]);
}

export function recordLoginFailure(ip: string, now = Date.now()): void {
  const recent = recentFailures(ip, now);
  recent.push(now);
  failuresByIp.set(ip, recent);
}
