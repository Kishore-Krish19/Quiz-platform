import { PlayerSimulator } from '../playerSimulator';
import { ScenarioResult } from '../reporter';

export async function runConnectionScenario(players: PlayerSimulator[]): Promise<ScenarioResult> {
  const playerCount = players.length;
  console.log(`\n🔌 Running Socket.IO Connection Stress Test (${playerCount} concurrent sockets)...`);
  const startTime = performance.now();
  const errors: string[] = [];

  const connectPromises = players.map(async (p) => {
    try {
      const lat = await p.connectSocket();
      return { success: true, latency: lat, player: p };
    } catch (err: any) {
      errors.push(`Socket connect failed for ${p.username}: ${err.message}`);
      return { success: false, latency: 0, player: p };
    }
  });

  const connectResults = await Promise.all(connectPromises);
  // Allow small grace window for initial quiz:state payload to arrive
  await new Promise((r) => setTimeout(r, 100));
  const durationMs = performance.now() - startTime;

  const connectedCount = connectResults.filter((r) => r.success).length;
  const failedCount = connectResults.filter((r) => !r.success).length;

  const successfulLatencies = connectResults.filter((r) => r.success).map((r) => r.latency);
  const minLatency = successfulLatencies.length ? Math.min(...successfulLatencies) : 0;
  const maxLatency = successfulLatencies.length ? Math.max(...successfulLatencies) : 0;
  const avgLatency = successfulLatencies.length
    ? successfulLatencies.reduce((a, b) => a + b, 0) / successfulLatencies.length
    : 0;

  // Verify that connected clients received initial quiz state
  const stateReceivedCount = players.filter((p) => p.socketClient?.lastState !== null).length;

  const passed = failedCount === 0 && connectedCount === playerCount && stateReceivedCount === playerCount;

  console.log(`   Result: ${connectedCount}/${playerCount} connected (${Math.round(avgLatency)}ms avg) -> ${passed ? 'PASSED' : 'FAILED'}`);

  return {
    name: `Socket.IO Connection Concurrency`,
    playerCount,
    passed,
    durationMs,
    metrics: {
      connectedCount,
      failedCount,
      minLatencyMs: Math.round(minLatency),
      maxLatencyMs: Math.round(maxLatency),
      avgLatencyMs: Math.round(avgLatency),
      stateReceivedCount,
    },
    errors,
  };
}
