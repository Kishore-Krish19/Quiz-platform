import { AdminClient } from '../adminClient';
import { PlayerSimulator } from '../playerSimulator';
import { ScenarioResult } from '../reporter';

export async function runQuestionSyncScenario(
  admin: AdminClient,
  players: PlayerSimulator[],
  questionId?: string
): Promise<ScenarioResult> {
  const playerCount = players.length;
  console.log(`\n⏱️  Running Question Synchronization Test (${playerCount} players)...`);
  const startTime = performance.now();
  const errors: string[] = [];

  // Setup listeners on all player clients before activating the question
  const receiveTimestamps = new Map<string, number>();
  const receivedQuestions = new Map<string, any>();

  const waitPromises = players.map((p) => {
    return new Promise<void>((resolve, reject) => {
      const client = p.socketClient;
      if (!client || !client.socket) {
        return reject(new Error(`Player ${p.username} socket not ready`));
      }

      const timer = setTimeout(() => {
        errors.push(`Player ${p.username} timed out waiting for question start event`);
        resolve();
      }, 5000);

      client.socket.once('quiz:question_started', (qData: any) => {
        clearTimeout(timer);
        receiveTimestamps.set(p.username, performance.now());
        receivedQuestions.set(p.username, qData);
        resolve();
      });
    });
  });

  // Admin starts question
  const adminStartRes = await admin.startQuestion(questionId, 10);
  if (adminStartRes.error) {
    errors.push(`Admin failed to start question: ${adminStartRes.error}`);
  }

  // Wait for all players to receive question
  await Promise.all(waitPromises);
  const durationMs = performance.now() - startTime;

  const receivedCount = receiveTimestamps.size;
  const timestamps = Array.from(receiveTimestamps.values());

  const earliest = timestamps.length ? Math.min(...timestamps) : 0;
  const latest = timestamps.length ? Math.max(...timestamps) : 0;
  const spreadMs = timestamps.length ? latest - earliest : 0;
  const avgOffsetMs = timestamps.length
    ? timestamps.reduce((a, b) => a + (b - earliest), 0) / timestamps.length
    : 0;

  // Verify consistency of payload across all players
  let payloadConsistent = true;
  let sampleQuestionId = '';
  receivedQuestions.forEach((q, username) => {
    if (!sampleQuestionId) sampleQuestionId = q.id;
    if (q.id !== sampleQuestionId || !q.options || q.options.length !== 4) {
      payloadConsistent = false;
      errors.push(`Inconsistent question payload received by ${username}`);
    }
  });

  const passed =
    receivedCount === playerCount &&
    payloadConsistent &&
    spreadMs < 500 && // Under 500ms broadcast spread across LAN / local loopback
    errors.length === 0;

  console.log(`   Result: ${receivedCount}/${playerCount} received question. Spread: ${Math.round(spreadMs)}ms (Avg offset: ${Math.round(avgOffsetMs)}ms) -> ${passed ? 'PASSED' : 'FAILED'}`);

  return {
    name: `Question Synchronization & Spread`,
    playerCount,
    passed,
    durationMs,
    metrics: {
      receivedCount,
      earliestTimestamp: Math.round(earliest),
      latestTimestamp: Math.round(latest),
      spreadMs: Math.round(spreadMs * 100) / 100,
      avgOffsetMs: Math.round(avgOffsetMs * 100) / 100,
      payloadConsistent,
    },
    errors,
  };
}
