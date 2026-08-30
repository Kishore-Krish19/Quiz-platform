import { PlayerSimulator } from '../playerSimulator';
import { STRESS_CONFIG } from '../config';
import { ScenarioResult } from '../reporter';

export async function runAuthScenario(playerCount: number): Promise<{
  result: ScenarioResult;
  players: PlayerSimulator[];
}> {
  console.log(`\n🔑 Running Authentication Stress Test (${playerCount} concurrent logins)...`);
  const startTime = performance.now();
  const errors: string[] = [];

  const players: PlayerSimulator[] = [];
  for (let i = 1; i <= playerCount; i++) {
    const pad = i.toString().padStart(3, '0');
    players.push(new PlayerSimulator(`${STRESS_CONFIG.PLAYER_PREFIX}${pad}`));
  }

  // Execute simultaneous logins
  const loginPromises = players.map((p) => p.login());
  const loginResults = await Promise.all(loginPromises);

  const durationMs = performance.now() - startTime;
  const successCount = loginResults.filter((r) => r.success).length;
  const failureCount = loginResults.filter((r) => !r.success).length;

  const latencies = loginResults.map((r) => r.durationMs);
  const minLatency = Math.min(...latencies);
  const maxLatency = Math.max(...latencies);
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

  loginResults.forEach((r, idx) => {
    if (!r.success) {
      errors.push(`Player ${players[idx].username} login failed: ${r.error}`);
    }
  });

  // Verify token validity for a sample of successful logins (up to 5)
  const tokenChecks = await Promise.all(
    players
      .filter((p) => p.token)
      .slice(0, 5)
      .map(async (p) => {
        const res = await fetch(`${STRESS_CONFIG.BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${p.token}` },
        });
        return res.ok;
      })
  );
  const tokensValid = tokenChecks.every(Boolean);

  const passed = failureCount === 0 && tokensValid && successCount === playerCount;

  console.log(`   Result: ${successCount}/${playerCount} logged in (${Math.round(avgLatency)}ms avg) -> ${passed ? 'PASSED' : 'FAILED'}`);

  return {
    result: {
      name: `Authentication Concurrency`,
      playerCount,
      passed,
      durationMs,
      metrics: {
        successCount,
        failureCount,
        minLatencyMs: Math.round(minLatency),
        maxLatencyMs: Math.round(maxLatency),
        avgLatencyMs: Math.round(avgLatency),
        tokensValid,
      },
      errors,
    },
    players,
  };
}
