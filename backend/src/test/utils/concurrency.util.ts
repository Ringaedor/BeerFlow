/**
 * Concurrency Testing Utilities
 *
 * Helpers for testing race conditions and concurrent operations
 */

export interface ConcurrencyTestResult {
  successCount: number;
  failureCount: number;
  totalOperations: number;
  errors: Error[];
  executionTimeMs: number;
  averageTimeMs: number;
}

/**
 * Execute multiple async operations concurrently
 */
export async function executeConcurrently<T>(
  operations: (() => Promise<T>)[],
): Promise<ConcurrencyTestResult> {
  const startTime = Date.now();
  const results: Array<{ success: boolean; error?: Error }> = [];

  // Execute all operations simultaneously
  const promises = operations.map((op) =>
    op()
      .then(() => ({ success: true }))
      .catch((error) => ({ success: false, error })),
  );

  const settled = await Promise.all(promises);

  const executionTimeMs = Date.now() - startTime;

  const successCount = settled.filter((r) => r.success).length;
  const failureCount = settled.filter((r) => !r.success).length;
  const errors = settled
    .filter((r): r is { success: boolean; error: Error } => !r.success && 'error' in r && r.error !== undefined)
    .map((r) => r.error);

  return {
    successCount,
    failureCount,
    totalOperations: operations.length,
    errors,
    executionTimeMs,
    averageTimeMs: executionTimeMs / operations.length,
  };
}

/**
 * Create a race condition scenario
 */
export async function createRaceCondition<T>(
  operation: () => Promise<T>,
  concurrency: number,
): Promise<ConcurrencyTestResult> {
  const operations = Array(concurrency).fill(null).map(() => operation);
  return executeConcurrently(operations);
}

/**
 * Delay execution by milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute operations with staggered delays
 */
export async function executeStaggered<T>(
  operation: () => Promise<T>,
  count: number,
  delayMs: number,
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < count; i++) {
    results.push(await operation());
    if (i < count - 1) {
      await delay(delayMs);
    }
  }

  return results;
}
