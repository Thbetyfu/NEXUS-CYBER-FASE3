/** Process-local mutex so ledger + identity JSON writes do not interleave. */

let lock: Promise<unknown> = Promise.resolve();

export function withLock<T>(fn: () => T | Promise<T>): Promise<T> {
  const run = lock.then(fn, fn);
  lock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
