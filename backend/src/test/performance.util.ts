export interface PerformanceResult {
  averageTime: number;
  minTime: number;
  maxTime: number;
  successRate: number;
  totalRequests: number;
}

export async function performanceTest(
  testFunction: () => Promise<any>,
  iterations: number = 100,
): Promise<PerformanceResult> {
  const times: number[] = [];
  let successCount = 0;

  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();

    try {
      await testFunction();
      successCount++;
    } catch (error) {
      // Test failed, don't count time
      continue;
    }

    const endTime = Date.now();
    times.push(endTime - startTime);
  }

  if (times.length === 0) {
    throw new Error('All performance tests failed');
  }

  return {
    averageTime: times.reduce((a, b) => a + b, 0) / times.length,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
    successRate: (successCount / iterations) * 100,
    totalRequests: iterations,
  };
}
