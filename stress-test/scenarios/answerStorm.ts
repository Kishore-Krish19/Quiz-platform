import { AdminClient } from '../adminClient';
import { PlayerSimulator } from '../playerSimulator';
import { ScenarioResult } from '../reporter';
import { STRESS_CONFIG } from '../config';

export async function runAnswerStormScenario(
  admin: AdminClient,
  players: PlayerSimulator[],
  questionIndex = 0
): Promise<ScenarioResult> {
  const playerCount = players.length;
  console.log(`\n⚡ Running Simultaneous Answer Storm Test (${playerCount} concurrent submissions)...`);
  const startTime = performance.now();
  const errors: string[] = [];

  // Reset scores and get question
  const roundId = await admin.getActiveOrTestRoundId();
  await admin.resetScores(roundId);
  const questionsRes = await admin.getQuestions(roundId);
  const question = questionsRes.questions[questionIndex];

  if (!question) {
    throw new Error(`Test question at index ${questionIndex} not found`);
  }

  // Admin starts question
  await admin.startQuestion(question.id, 10);

  // Setup answer result collectors for all socket clients
  const answerResultPromises = players.map((p) => {
    return new Promise<any>((resolve) => {
      const timer = setTimeout(() => {
        resolve({ timeout: true, player: p.username });
      }, 5000);

      p.socketClient?.socket?.once('player:answer_result', (result: any) => {
        clearTimeout(timer);
        resolve({ timeout: false, success: true, result, player: p.username });
      });

      p.socketClient?.socket?.once('system:error', (errMsg: any) => {
        clearTimeout(timer);
        resolve({ timeout: false, success: false, error: errMsg, player: p.username });
      });
    });
  });

  // BURST TRIGGER: All players submit simultaneously
  const burstStart = performance.now();
  players.forEach((p, idx) => {
    // Distribute options among players
    const optionIdx = idx % question.options.length;
    const selectedOptionId = question.options[optionIdx].id;
    p.submitAnswer(question.id, selectedOptionId);
  });
  const burstTriggerDurationMs = performance.now() - burstStart;

  // Await all responses
  const answerResults = await Promise.all(answerResultPromises);
  const totalDurationMs = performance.now() - startTime;

  const successfulAnswers = answerResults.filter((r) => r.success && !r.timeout);
  const timedOutAnswers = answerResults.filter((r) => r.timeout);
  const errorAnswers = answerResults.filter((r) => !r.success && !r.timeout);

  if (timedOutAnswers.length > 0) {
    errors.push(`${timedOutAnswers.length} players timed out waiting for answer result`);
  }

  // --- DOUBLE SUBMISSION TEST ---
  console.log(`   Testing double submission rejection...`);
  if (players.length > 0) {
    const testPlayer = players[0];
    const initialScore = testPlayer.socketClient?.lastAnswerResult?.totalScore || 0;

    // Attempt second submission immediately with a different option
    const dupRes = await testPlayer.submitAnswerRest(question.id, question.options[1].id);
    if (!dupRes.error) {
      errors.push(`Double-submission exploit succeeded! Expected rejection, but got: ${JSON.stringify(dupRes)}`);
    }

    // Attempt invalid option submission
    const invalidOptRes = await testPlayer.submitAnswerRest(question.id, 'non_existent_option_id');
    if (!invalidOptRes.error) {
      errors.push(`Invalid option submission accepted! Expected rejection.`);
    }

    // Attempt invalid question submission
    const invalidQRes = await testPlayer.submitAnswerRest('fake_question_id', question.options[0].id);
    if (!invalidQRes.error) {
      errors.push(`Invalid question submission accepted! Expected rejection.`);
    }
  }

  // --- DATABASE INTEGRITY AUDIT ---
  const dbStatus = await admin.getDbStatus();
  const recordedAnswersCount = dbStatus.database.stats.answersCount;

  // End question cleanly
  await admin.endQuestion();

  const passed =
    successfulAnswers.length === playerCount &&
    timedOutAnswers.length === 0 &&
    errorAnswers.length === 0 &&
    errors.length === 0;

  console.log(`   Result: ${successfulAnswers.length}/${playerCount} processed in burst (${Math.round(burstTriggerDurationMs)}ms trigger, ${Math.round(totalDurationMs)}ms total) -> ${passed ? 'PASSED' : 'FAILED'}`);

  return {
    name: `Simultaneous Answer Storm & Double-Submit Defense`,
    playerCount,
    passed,
    durationMs: totalDurationMs,
    metrics: {
      successfulAnswersCount: successfulAnswers.length,
      timedOutCount: timedOutAnswers.length,
      errorAnswersCount: errorAnswers.length,
      burstTriggerDurationMs: Math.round(burstTriggerDurationMs * 100) / 100,
      totalAnswerDurationMs: Math.round(totalDurationMs),
      recordedAnswersInDb: recordedAnswersCount,
    },
    errors,
  };
}
