import { AdminClient } from '../adminClient';
import { PlayerSimulator } from '../playerSimulator';
import { ScenarioResult } from '../reporter';
import { STRESS_CONFIG } from '../config';

export async function runScoringScenario(
  admin: AdminClient,
  players: PlayerSimulator[]
): Promise<ScenarioResult> {
  console.log(`\n🧮 Running Scoring Service & Formula Audit...`);
  const startTime = performance.now();
  const errors: string[] = [];

  if (players.length < 4) {
    throw new Error('At least 4 players required for scoring formula verification');
  }

  const roundId = await admin.getActiveOrTestRoundId();
  await admin.resetScores(roundId);
  const questionsRes = await admin.getQuestions(roundId);
  const question = questionsRes.questions[0];

  const durationSeconds = 10;
  await admin.startQuestion(question.id, durationSeconds);

  const correctOptionId = question.correctOptionId;
  const incorrectOptionId = question.options.find((o: any) => o.id !== correctOptionId)?.id;

  const p0 = players[0]; // fast correct
  const p1 = players[1]; // fast incorrect
  const p2 = players[2]; // slow correct
  const p3 = players[3]; // slow incorrect

  // 1. Fast pair (~100ms)
  const receipts: Record<string, any> = {};
  receipts.fastCorrect = await p0.submitAnswerRest(question.id, correctOptionId);
  receipts.fastIncorrect = await p1.submitAnswerRest(question.id, incorrectOptionId);

  // 2. Slow pair (after ~3000ms)
  await new Promise((res) => setTimeout(res, 3000));
  receipts.slowCorrect = await p2.submitAnswerRest(question.id, correctOptionId);
  receipts.slowIncorrect = await p3.submitAnswerRest(question.id, incorrectOptionId);

  // 3. Embargo audit: a submission receipt must not reveal the outcome while the
  //    question is still running, or a player could learn the answer ahead of the rest.
  let embargoHeld = true;
  for (const [label, raw] of Object.entries(receipts)) {
    const receipt = raw.result || raw;

    if (raw.error || receipt.accepted !== true) {
      errors.push(`Submission "${label}" was not accepted: ${JSON.stringify(raw)}`);
      continue;
    }

    const leaked = ['correctOptionId', 'isCorrect', 'points', 'totalScore', 'currentRank'].filter(
      (field) => receipt[field] !== undefined
    );
    if (leaked.length > 0) {
      embargoHeld = false;
      errors.push(
        `Embargo violation: receipt for "${label}" leaked ${leaked.join(', ')} while the question was live`
      );
    }
  }

  // 4. Mid-question standings must not move either.
  const liveBoard = (await admin.getLeaderboard(roundId)).leaderboard || [];
  const movedEarly = liveBoard.filter((e: any) => e.score !== 0);
  if (movedEarly.length > 0) {
    embargoHeld = false;
    errors.push(
      `Embargo violation: ${movedEarly.length} player(s) had a non-zero score before the question closed`
    );
  }

  // 5. Close the question — this is when scores are released.
  await admin.endQuestion();

  const finalBoard = (await admin.getLeaderboard(roundId)).leaderboard || [];
  const statsOf = (p: PlayerSimulator) =>
    finalBoard.find((e: any) => e.username === p.username) || {
      score: 0,
      correctAnswers: 0,
      questionsAnswered: 0,
    };

  const s0 = statsOf(p0);
  const s1 = statsOf(p1);
  const s2 = statsOf(p2);
  const s3 = statsOf(p3);

  // Expected: speedRatio ~0.99 -> points ~ 100 + 900*0.99 = 991
  if (s0.correctAnswers !== 1 || s0.score < 950) {
    errors.push(`Fast correct scoring anomaly: Got points=${s0.score}, expected > 950`);
  }
  if (s1.correctAnswers !== 0 || s1.score !== 0) {
    errors.push(`Fast incorrect scoring anomaly: Got points=${s1.score}, expected 0`);
  }
  // Expected: speedRatio ~0.70 -> points ~ 100 + 900*0.70 = 730
  if (s2.correctAnswers !== 1 || s2.score >= s0.score || s2.score <= 100) {
    errors.push(`Slow correct scoring anomaly: Got points=${s2.score}, expected between 100 and ${s0.score}`);
  }
  if (s3.correctAnswers !== 0 || s3.score !== 0) {
    errors.push(`Slow incorrect scoring anomaly: Got points=${s3.score}, expected 0`);
  }
  // A wrong answer still counts as a submission, it just scores nothing.
  if (s1.questionsAnswered !== 1 || s3.questionsAnswered !== 1) {
    errors.push(
      `Incorrect answers were not recorded as submissions (got ${s1.questionsAnswered} and ${s3.questionsAnswered})`
    );
  }

  const durationMs = performance.now() - startTime;
  const passed = errors.length === 0;
  console.log(`   Result: Scoring formula verification -> ${passed ? 'PASSED' : 'FAILED'}`);

  return {
    name: 'Scoring Formula & Accuracy Audit',
    playerCount: 4,
    passed,
    durationMs,
    metrics: {
      fastCorrectPoints: s0.score,
      fastIncorrectPoints: s1.score,
      slowCorrectPoints: s2.score,
      slowIncorrectPoints: s3.score,
      resultEmbargoHeld: embargoHeld,
    },
    errors,
  };
}
