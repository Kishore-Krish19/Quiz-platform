import { PlayerSimulator } from '../playerSimulator';
import { ScenarioResult } from '../reporter';

export async function runLobbyScenario(
  players: PlayerSimulator[],
  holdSeconds = 10
): Promise<ScenarioResult> {
  const playerCount = players.length;
  console.log(`\n🛋️  Running Lobby / Waiting Room Stability Test (${playerCount} players, hold ${holdSeconds}s)...`);
  const startTime = performance.now();
  const errors: string[] = [];

  const initialConnected = players.filter((p) => p.socketClient?.isConnected).length;

  // Track disconnect events during the hold period
  let disconnectCount = 0;
  players.forEach((p) => {
    p.socketClient?.socket?.on('disconnect', () => {
      disconnectCount++;
    });
  });

  // Hold connections for the specified duration
  await new Promise((resolve) => setTimeout(resolve, holdSeconds * 1000));

  const endConnected = players.filter((p) => p.socketClient?.isConnected).length;
  const durationMs = performance.now() - startTime;

  if (endConnected < playerCount) {
    errors.push(`Premature disconnects: Expected ${playerCount}, but only ${endConnected} remained connected.`);
  }

  const passed = initialConnected === playerCount && endConnected === playerCount && disconnectCount === 0;

  console.log(`   Result: ${endConnected}/${playerCount} remained connected throughout hold -> ${passed ? 'PASSED' : 'FAILED'}`);

  return {
    name: `Lobby Stability & Hold (${holdSeconds}s)`,
    playerCount,
    passed,
    durationMs,
    metrics: {
      initialConnected,
      endConnected,
      disconnectCount,
      holdSeconds,
    },
    errors,
  };
}
