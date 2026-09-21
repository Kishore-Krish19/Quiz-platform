import { AdminClient } from '../adminClient';
import { PlayerSimulator } from '../playerSimulator';
import { ScenarioResult } from '../reporter';
import { STRESS_CONFIG } from '../config';

export async function runTimerDeadlineScenario(
  admin: AdminClient,
  players: PlayerSimulator[]
): Promise<ScenarioResult> {
  console.log(`\n⏳ Running Server-Authoritative Timer & Deadline Test...`);
  const startTime = performance.now();
  const errors: string[] = [];

  // Reset scores and get questions
  const roundId = await admin.getActiveOrTestRoundId();
  await admin.resetScores(roundId);
  const questionsRes = await admin.getQuestions(roundId);
  const question = questionsRes.questions[0];

  if (!question) {
    throw new Error('No test question found');
  }

  // Start question with 5-second duration for quick deadline testing
  const durationSeconds = 5;
  await admin.startQuestion(question.id, durationSeconds);

  // Define players with specific submission offsets (in ms) relative to start:
  // Duration is 5000ms. Grace period is 500ms (so deadline cutoff is 5500ms).
  // Test:
  // - Player 0: 100ms (On-time) -> Expect ACCEPTED
  // - Player 1: 1000ms (On-time) -> Expect ACCEPTED
  // - Player 2: 3000ms (On-time) -> Expect ACCEPTED
  // - Player 3: 4500ms (On-time) -> Expect ACCEPTED
  // - Player 4: 5100ms (Within grace period) -> Expect ACCEPTED
  // - Player 5: 6000ms (Late) -> Expect REJECTED
  // - Player 6: 7000ms (Late) -> Expect REJECTED

  const testCases = [
    { playerIdx: 0, delayMs: 100, expectAccepted: true, label: 'Fast (100ms)' },
    { playerIdx: 1, delayMs: 1000, expectAccepted: true, label: 'Mid (1s)' },
    { playerIdx: 2, delayMs: 3000, expectAccepted: true, label: 'Standard (3s)' },
    { playerIdx: 3, delayMs: 4500, expectAccepted: true, label: 'Near-end (4.5s)' },
    { playerIdx: 4, delayMs: 5300, expectAccepted: false, label: 'Post-Deadline (5.3s)' },
    { playerIdx: 5, delayMs: 6000, expectAccepted: false, label: 'Late (6.0s)' },
    { playerIdx: 6, delayMs: 7000, expectAccepted: false, label: 'Very Late (7.0s)' },
  ];

  const submissionResults: any[] = [];

  for (const tc of testCases) {
    if (tc.playerIdx >= players.length) continue;
    const player = players[tc.playerIdx];

    const promise = (async () => {
      await new Promise((resolve) => setTimeout(resolve, tc.delayMs));
      try {
        const res = await player.submitAnswerRest(question.id, question.options[0].id);
        // Submissions are acknowledged with a receipt; points stay embargoed until
        // the question closes, so acceptance is read from the receipt.
        const accepted = !res.error && (res.result?.accepted === true || res.accepted === true);
        return {
          label: tc.label,
          delayMs: tc.delayMs,
          expectAccepted: tc.expectAccepted,
          actualAccepted: accepted,
          response: res,
          player: player.username,
        };
      } catch (err: any) {
        return {
          label: tc.label,
          delayMs: tc.delayMs,
          expectAccepted: tc.expectAccepted,
          actualAccepted: false,
          error: err.message,
          player: player.username,
        };
      }
    })();

    submissionResults.push(promise);
  }

  const results = await Promise.all(submissionResults);
  const durationMs = performance.now() - startTime;

  let allPassed = true;
  for (const r of results) {
    if (r.actualAccepted !== r.expectAccepted) {
      allPassed = false;
      errors.push(
        `Timer violation for ${r.player} at ${r.label}: Expected accepted=${r.expectAccepted}, got accepted=${r.actualAccepted} (Response: ${JSON.stringify(r.response || r.error)})`
      );
    }
  }

  // End question cleanly
  await admin.endQuestion();

  console.log(`   Result: Timer deadline checks passed: ${allPassed ? 'YES' : 'NO'}`);

  return {
    name: 'Server-Authoritative Timer & Deadline Enforcement',
    playerCount: Math.min(players.length, testCases.length),
    passed: allPassed && errors.length === 0,
    durationMs,
    metrics: {
      testCasesCount: results.length,
      correctDecisionsCount: results.filter((r) => r.actualAccepted === r.expectAccepted).length,
      onTimeAcceptedCount: results.filter((r) => r.expectAccepted && r.actualAccepted).length,
      lateRejectedCount: results.filter((r) => !r.expectAccepted && !r.actualAccepted).length,
    },
    errors,
  };
}
