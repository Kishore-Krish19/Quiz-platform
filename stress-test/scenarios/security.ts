import { AdminClient } from '../adminClient';
import { PlayerSimulator } from '../playerSimulator';
import { ScenarioResult } from '../reporter';
import { STRESS_CONFIG } from '../config';

export async function runSecurityScenario(
  admin: AdminClient,
  player: PlayerSimulator
): Promise<ScenarioResult> {
  console.log(`\n🔒 Running Security & Privilege Escalation Defense Audit...`);
  const startTime = performance.now();
  const errors: string[] = [];

  const checks: { name: string; passed: boolean; details?: string }[] = [];

  // 1. Player attempts to access Admin REST endpoints
  const adminEndpoints = [
    { url: '/api/admin/players', method: 'GET' },
    { url: '/api/admin/rounds', method: 'GET' },
    { url: '/api/admin/settings', method: 'GET' },
    { url: '/api/admin/quiz/round', method: 'POST', body: { roundId: 'fake' } },
    { url: '/api/admin/quiz/start-question', method: 'POST', body: {} },
    { url: '/api/admin/quiz/end-question', method: 'POST', body: {} },
    { url: '/api/admin/quiz/reset-scores', method: 'POST', body: {} },
  ];

  for (const ep of adminEndpoints) {
    const res = await fetch(`${STRESS_CONFIG.BASE_URL}${ep.url}`, {
      method: ep.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${player.token}`,
      },
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    });

    const isBlocked = res.status === 403 || res.status === 401;
    checks.push({
      name: `REST ${ep.method} ${ep.url} rejection`,
      passed: isBlocked,
      details: `Status: ${res.status}`,
    });

    if (!isBlocked) {
      errors.push(`Security vulnerability: Player accessed admin endpoint ${ep.url} (Status ${res.status})`);
    }
  }

  // 2. Tampered JWT authentication
  const fakeTokenRes = await fetch(`${STRESS_CONFIG.BASE_URL}/api/quiz/state`, {
    headers: { Authorization: 'Bearer fake.invalid.jwt.token' },
  });
  const fakeTokenBlocked = fakeTokenRes.status === 403 || fakeTokenRes.status === 401;
  checks.push({
    name: 'Tampered JWT token rejected',
    passed: fakeTokenBlocked,
  });
  if (!fakeTokenBlocked) {
    errors.push('Security vulnerability: Tampered JWT accepted!');
  }

  // 3. Player submits answer when no question is active (WAITING status)
  await admin.endQuestion();
  const inactiveSubmitRes = await player.submitAnswerRest('fake_q_id', 'fake_opt_id');
  const inactiveSubmitBlocked = !inactiveSubmitRes || inactiveSubmitRes.error !== undefined;
  checks.push({
    name: 'Submission during inactive question rejected',
    passed: inactiveSubmitBlocked,
  });
  if (!inactiveSubmitBlocked) {
    errors.push('Security vulnerability: Answer accepted when no question was active!');
  }

  const durationMs = performance.now() - startTime;
  const passed = errors.length === 0;

  console.log(`   Result: Security checks (${checks.filter((c) => c.passed).length}/${checks.length} passed) -> ${passed ? 'PASSED' : 'FAILED'}`);

  return {
    name: 'Security & Privilege Escalation Audit',
    playerCount: 1,
    passed,
    durationMs,
    metrics: {
      totalChecks: checks.length,
      passedChecks: checks.filter((c) => c.passed).length,
    },
    errors,
  };
}
