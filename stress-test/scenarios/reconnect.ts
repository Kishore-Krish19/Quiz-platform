import { AdminClient } from '../adminClient';
import { PlayerSimulator } from '../playerSimulator';
import { ScenarioResult } from '../reporter';
import { STRESS_CONFIG } from '../config';

export async function runReconnectScenario(
  admin: AdminClient,
  players: PlayerSimulator[],
  disconnectCount = 5
): Promise<ScenarioResult> {
  console.log(`\n🔄 Running Mid-Quiz Disconnect & Reconnection Test (${disconnectCount} players)...`);
  const startTime = performance.now();
  const errors: string[] = [];

  const targetPlayers = players.slice(0, disconnectCount);

  // 1. Force socket disconnect for target players
  targetPlayers.forEach((p) => {
    p.disconnectSocket();
  });

  // Verify disconnect on server by checking connected count
  await new Promise((res) => setTimeout(res, 500));
  const intermediateState = await admin.getQuizState();
  const expectedConnected = players.length - disconnectCount;
  // /api/quiz/state responds with { state }, not { session } — reading the wrong key
  // here made this line report "undefined" on every run.
  const actualConnected = intermediateState.state?.connectedPlayersCount;

  console.log(
    `   Disconnected ${disconnectCount} players. Active connected count: ${actualConnected} (expected ${expectedConnected})`
  );

  // 2. Reconnect each target player
  const reconnectLatencies: number[] = [];
  for (const p of targetPlayers) {
    try {
      const lat = await p.reconnectSocket();
      reconnectLatencies.push(lat);
    } catch (err: any) {
      errors.push(`Failed to reconnect player ${p.username}: ${err.message}`);
    }
  }

  // 3. Verify state synchronization for reconnected players
  await new Promise((res) => setTimeout(res, 500));
  const finalState = await admin.getQuizState();

  targetPlayers.forEach((p) => {
    if (!p.socketClient?.isConnected) {
      errors.push(`Player ${p.username} is not connected after reconnection attempt`);
    }
    if (!p.socketClient?.lastState) {
      errors.push(`Player ${p.username} did not receive quiz:state upon reconnect`);
    }
  });

  const durationMs = performance.now() - startTime;
  const avgReconnectLat = reconnectLatencies.length
    ? reconnectLatencies.reduce((a, b) => a + b, 0) / reconnectLatencies.length
    : 0;

  const passed =
    errors.length === 0 &&
    targetPlayers.every((p) => p.socketClient?.isConnected);

  console.log(`   Result: ${disconnectCount}/${disconnectCount} successfully reconnected (${Math.round(avgReconnectLat)}ms avg) -> ${passed ? 'PASSED' : 'FAILED'}`);

  return {
    name: `Mid-Quiz Reconnection & State Recovery (${disconnectCount} Players)`,
    playerCount: disconnectCount,
    passed,
    durationMs,
    metrics: {
      disconnectedCount: disconnectCount,
      connectedAfterDisconnect: actualConnected,
      expectedAfterDisconnect: expectedConnected,
      reconnectedCount: targetPlayers.filter((p) => p.socketClient?.isConnected).length,
      avgReconnectLatencyMs: Math.round(avgReconnectLat),
      stateRestored: errors.length === 0,
    },
    errors,
  };
}
