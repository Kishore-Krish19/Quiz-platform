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

  // 1. Fast Correct (Player 0 at ~100ms)
  const p0 = players[0];
  const raw0 = await p0.submitAnswerRest(question.id, correctOptionId);
  const r0 = raw0.result || raw0;
  // Expected: speedRatio ~ 0.99 -> points ~ 100 + 900*0.99 = 991
  if (!r0.isCorrect || r0.points < 950) {
    errors.push(`Fast correct scoring anomaly: Got points=${r0.points}, expected > 950`);
  }

  // 2. Fast Incorrect (Player 1 at ~150ms)
  const p1 = players[1];
  const raw1 = await p1.submitAnswerRest(question.id, incorrectOptionId);
  const r1 = raw1.result || raw1;
  if (r1.isCorrect || r1.points !== 0) {
    errors.push(`Fast incorrect scoring anomaly: Got points=${r1.points}, expected 0`);
  }

  // 3. Slow Correct (Player 2 after delay ~3000ms)
  const p2 = players[2];
  await new Promise((res) => setTimeout(res, 3000));
  const raw2 = await p2.submitAnswerRest(question.id, correctOptionId);
  const r2 = raw2.result || raw2;
  // Expected: speedRatio ~ 0.70 -> points ~ 100 + 900*0.70 = 730
  if (!r2.isCorrect || r2.points >= r0.points || r2.points <= 100) {
    errors.push(`Slow correct scoring anomaly: Got points=${r2.points}, expected between 100 and ${r0.points}`);
  }

  // 4. Slow Incorrect (Player 3 after delay)
  const p3 = players[3];
  const raw3 = await p3.submitAnswerRest(question.id, incorrectOptionId);
  const r3 = raw3.result || raw3;
  if (r3.isCorrect || r3.points !== 0) {
    errors.push(`Slow incorrect scoring anomaly: Got points=${r3.points}, expected 0`);
  }

  await admin.endQuestion();
  const durationMs = performance.now() - startTime;

  const passed = errors.length === 0;
  console.log(`   Result: Scoring formula verification -> ${passed ? 'PASSED' : 'FAILED'}`);

  return {
    name: 'Scoring Formula & Accuracy Audit',
    playerCount: 4,
    passed,
    durationMs,
    metrics: {
      fastCorrectPoints: r0.points,
      fastIncorrectPoints: r1.points,
      slowCorrectPoints: r2.points,
      slowIncorrectPoints: r3.points,
    },
    errors,
  };
}
