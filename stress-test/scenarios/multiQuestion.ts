import { AdminClient } from '../adminClient';
import { PlayerSimulator } from '../playerSimulator';
import { ScenarioResult } from '../reporter';
import { STRESS_CONFIG } from '../config';

export async function runMultiQuestionScenario(
  admin: AdminClient,
  players: PlayerSimulator[],
  totalQuestionsToRun = 10
): Promise<ScenarioResult> {
  const playerCount = players.length;
  console.log(`\n🏁 Running Full ${totalQuestionsToRun}-Question Round Simulation (${playerCount} players)...`);
  const startTime = performance.now();
  const errors: string[] = [];

  // Reset round progress and select test round
  const roundId = await admin.getActiveOrTestRoundId();
  await admin.setActiveRound(roundId);
  await admin.resetScores(roundId);

  const questionsRes = await admin.getQuestions(roundId);
  const questions: any[] = questionsRes.questions || [];

  if (questions.length < totalQuestionsToRun) {
    throw new Error(`Test round has only ${questions.length} questions; requested ${totalQuestionsToRun}`);
  }

  let totalSubmissionsSuccessful = 0;
  const perQuestionDurations: number[] = [];

  for (let qIdx = 0; qIdx < totalQuestionsToRun; qIdx++) {
    const q = questions[qIdx];
    const qStartTime = performance.now();
    process.stdout.write(`   ▶ Question ${qIdx + 1}/${totalQuestionsToRun} (${q.id.substring(0, 8)})... `);

    // 1. Admin starts question
    await admin.startQuestion(q.id, 10);

    // 2. Setup listeners and submit answers from all players
    const answerPromises = players.map(async (p, pIdx) => {
      // Stagger slightly between 50ms and 500ms to simulate natural lab user submission
      const delay = 50 + (pIdx * 15) % 400;
      await new Promise((res) => setTimeout(res, delay));

      // 60% of players pick correct option, 40% pick wrong
      const pickCorrect = pIdx % 10 < 6;
      const selectedOptionId = pickCorrect
        ? q.correctOptionId
        : q.options.find((o: any) => o.id !== q.correctOptionId)?.id || q.options[0].id;

      try {
        const res = await p.submitAnswerRest(q.id, selectedOptionId);
        if (res.error) {
          errors.push(`Player ${p.username} Q${qIdx + 1} error: ${res.error}`);
          return false;
        }
        return true;
      } catch (err: any) {
        errors.push(`Player ${p.username} Q${qIdx + 1} exception: ${err.message}`);
        return false;
      }
    });

    const results = await Promise.all(answerPromises);
    const successThisQ = results.filter(Boolean).length;
    totalSubmissionsSuccessful += successThisQ;

    // 3. Admin ends question
    await admin.endQuestion();

    // 4. Admin advances to next question if not at end
    if (qIdx < totalQuestionsToRun - 1) {
      await admin.nextQuestion();
    }

    const qDuration = performance.now() - qStartTime;
    perQuestionDurations.push(qDuration);
    console.log(`${successThisQ}/${playerCount} answered in ${Math.round(qDuration)}ms`);
  }

  // --- COMPREHENSIVE DATA INTEGRITY AUDIT ---
  console.log(`   🔍 Auditing database state and final leaderboard...`);
  const expectedTotalAnswers = playerCount * totalQuestionsToRun;

  const dbStatus = await admin.getDbStatus();
  const actualDbAnswers = dbStatus.database.stats.answersCount;

  const lbRes = await admin.getLeaderboard();
  const leaderboard: any[] = lbRes.leaderboard || [];

  // Verify all players have 10 answered questions
  let playerAnswerCountValid = true;
  for (const p of players) {
    const entry = leaderboard.find((e) => e.username === p.username);
    if (!entry) {
      errors.push(`Player ${p.username} missing from final leaderboard`);
      playerAnswerCountValid = false;
    } else if (entry.questionsAnswered !== totalQuestionsToRun) {
      errors.push(
        `Player ${p.username} question count mismatch: Expected ${totalQuestionsToRun}, got ${entry.questionsAnswered}`
      );
      playerAnswerCountValid = false;
    }
  }

  const durationMs = performance.now() - startTime;
  const avgQDuration =
    perQuestionDurations.reduce((a, b) => a + b, 0) / perQuestionDurations.length;

  const passed =
    totalSubmissionsSuccessful === expectedTotalAnswers &&
    playerAnswerCountValid &&
    errors.length === 0;

  console.log(`   Result: Total answers logged: ${totalSubmissionsSuccessful}/${expectedTotalAnswers} -> ${passed ? 'PASSED' : 'FAILED'}`);

  return {
    name: `Full ${totalQuestionsToRun}-Question Round Simulation`,
    playerCount,
    passed,
    durationMs,
    metrics: {
      totalQuestionsRun: totalQuestionsToRun,
      expectedTotalAnswers,
      actualSuccessfulAnswers: totalSubmissionsSuccessful,
      avgQuestionDurationMs: Math.round(avgQDuration),
      leaderboardEntriesAudited: leaderboard.length,
      dataIntegrityPassed: playerAnswerCountValid,
    },
    errors,
  };
}
