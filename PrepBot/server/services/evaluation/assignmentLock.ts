// ==========================================================
// A minimal in-process lock.
// ==========================================================
// Ensures that "count existing sessions per cell, decide the
// least-used cell, then save the new session" happens as one
// uninterrupted step. Without this, two people starting at the
// same moment could both read the same counts before either has
// saved, and both get assigned to the same "least-used" cell —
// unbalancing the counterbalancing this function exists to protect.
//
// This only works because the app runs as a single server instance
// (no horizontal scaling). If that ever changes, this lock would
// need to move to the database (e.g. a transaction with row locking)
// instead of living in memory.

let locked = false;
const waiting: (() => void)[] = [];

export async function withAssignmentLock<T>(
  fn: () => Promise<T>
): Promise<T> {

  await new Promise<void>((resolve) => {
    if (!locked) {
      locked = true;
      resolve();
    } else {
      waiting.push(resolve);
    }
  });

  try {
    return await fn();
  } finally {
    const next = waiting.shift();
    if (next) {
      // Hand the lock directly to the next waiting request.
      next();
    } else {
      locked = false;
    }
  }
}