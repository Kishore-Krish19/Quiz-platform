import { AdminClient } from '../adminClient';
import { PlayerSimulator } from '../playerSimulator';
import { ScenarioResult } from '../reporter';

export async function runLeaderboardScenario(
  admin: AdminClient,
  players: PlayerSimulator[]
): Promise<ScenarioResult> {
  const playerCount = players.length;
  console.log(`\n🏆 Running Leaderboard Integrity & Tie-Breaking Test (${playerCount} players)...`);
  const startTime = performance.now();
  const errors: string[] = [];

  const lbRes = await admin.getLeaderboard();
  const entries: any[] = lbRes.leaderboard || [];

  if (!entries || entries.length === 0) {
    errors.push('Leaderboard returned empty array');
  }

  // Verify all stress players are present
  const playerUsernames = new Set(players.map((p) => p.username));
  const lbUsernames = new Set(entries.map((e) => e.username));

  playerUsernames.forEach((uname) => {
    if (!lbUsernames.has(uname)) {
      errors.push(`Player ${uname} missing from leaderboard`);
    }
  });

  // Verify rank ordering and sorting invariants
  let sortedCorrectly = true;
  for (let i = 0; i < entries.length - 1; i++) {
    const curr = entries[i];
    const next = entries[i + 1];

    if (curr.rank !== i + 1) {
      errors.push(`Invalid rank index for ${curr.username}: Expected ${i + 1}, got ${curr.rank}`);
    }

    if (curr.score < next.score) {
      sortedCorrectly = false;
      errors.push(`Score sorting violation: ${curr.username} (${curr.score}) ranked above ${next.username} (${next.score})`);
    } else if (curr.score === next.score) {
      if (curr.correctAnswers < next.correctAnswers) {
        sortedCorrectly = false;
        errors.push(`Tie-break violation (correct count): ${curr.username} vs ${next.username}`);
      }
    }

    if (typeof curr.score !== 'number' || isNaN(curr.score) || curr.score < 0) {
      errors.push(`Invalid score detected for ${curr.username}: ${curr.score}`);
    }
  }

  const durationMs = performance.now() - startTime;
  const passed = errors.length === 0 && sortedCorrectly;

  console.log(`   Result: Leaderboard (${entries.length} ranked entries) -> ${passed ? 'PASSED' : 'FAILED'}`);

  return {
    name: 'Leaderboard Sorting & Tie-Breaker Integrity',
    playerCount,
    passed,
    durationMs,
    metrics: {
      totalEntries: entries.length,
      topPlayer: entries[0]?.username || 'N/A',
      topScore: entries[0]?.score || 0,
      sortedCorrectly,
    },
    errors,
  };
}
