import fs from 'fs';
import path from 'path';
import { AdminClient } from './adminClient';
import { PlayerSimulator } from './playerSimulator';
import { TestReporter } from './reporter';
import { STRESS_CONFIG } from './config';
import { setupStressTestEnvironment } from './setup';
import { runAuthScenario } from './scenarios/auth';
import { runConnectionScenario } from './scenarios/connection';
import { runLobbyScenario } from './scenarios/lobby';
import { runQuestionSyncScenario } from './scenarios/questionSync';
import { runTimerDeadlineScenario } from './scenarios/timerDeadline';
import { runAnswerStormScenario } from './scenarios/answerStorm';
import { runScoringScenario } from './scenarios/scoring';
import { runLeaderboardScenario } from './scenarios/leaderboard';
import { runReconnectScenario } from './scenarios/reconnect';
import { runMultiQuestionScenario } from './scenarios/multiQuestion';
import { runSecurityScenario } from './scenarios/security';

function parseArgs() {
  const args = process.argv.slice(2);
  let players = 40;
  let isRamp = false;
  let isAll = false;
  let isHelp = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--players' && args[i + 1]) {
      players = parseInt(args[i + 1], 10) || 40;
      i++;
    } else if (args[i] === '--ramp') {
      isRamp = true;
    } else if (args[i] === '--all') {
      isAll = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      isHelp = true;
    }
  }

  return { players, isRamp, isAll, isHelp };
}

function printHelp() {
  console.log(`
================================================================
🚀 GADGET CODE STRESS TESTING CLI
================================================================

Usage:
  tsx stress-test/run-stress-test.ts [options]
  npm run stress:<command>

Commands & Flags:
  --players <N>   Run tests with N simultaneous players (e.g. 10, 25, 40, 50, 75, 100)
  --ramp          Progressively ramp from 10 -> 25 -> 40 -> 50 -> 75 -> 100 players
  --all           Run complete suite (Ramp + Specialized Scenarios + 10-Q Round)
  --help, -h      Show this help message

NPM Scripts:
  npm run stress:setup     Setup test players (stress_player_001..100) and test round
  npm run stress:10        Run 10-player baseline test
  npm run stress:25        Run 25-player ramp test
  npm run stress:40        Run 40-player competition requirement test
  npm run stress:50        Run 50-player load test
  npm run stress:75        Run 75-player load test
  npm run stress:100       Run 100-player stress/safety test
  npm run stress:ramp      Run progressive load ramp test (10 -> 100)
  npm run stress:all       Run full end-to-end audit battery
  npm run stress:cleanup   Safely purge test users & round without touching real data
================================================================
`);
}

async function runSingleLevel(admin: AdminClient, reporter: TestReporter, count: number, holdSeconds = 3) {
  console.log(`\n================================================================`);
  console.log(`🚀 EXECUTING TEST LEVEL: ${count} SIMULTANEOUS PLAYERS`);
  console.log(`================================================================`);

  // 1. Auth Scenario
  const { result: authRes, players } = await runAuthScenario(count);
  reporter.addResult(authRes);

  if (!authRes.passed) {
    console.error(`❌ Authentication failed for level ${count}. Aborting remaining steps for this level.`);
    return;
  }

  // 2. Connection Scenario
  const connRes = await runConnectionScenario(players);
  reporter.addResult(connRes);

  // 3. Lobby Scenario
  const lobbyRes = await runLobbyScenario(players, holdSeconds);
  reporter.addResult(lobbyRes);

  // 4. Question Sync Scenario
  const syncRes = await runQuestionSyncScenario(admin, players);
  reporter.addResult(syncRes);

  // 5. Answer Storm Scenario
  const stormRes = await runAnswerStormScenario(admin, players);
  reporter.addResult(stormRes);

  // 6. Leaderboard Scenario
  const lbRes = await runLeaderboardScenario(admin, players);
  reporter.addResult(lbRes);

  // Disconnect all sockets after level completion
  players.forEach((p) => p.disconnectSocket());
}

async function main() {
  const { players, isRamp, isAll, isHelp } = parseArgs();

  if (isHelp) {
    printHelp();
    return;
  }

  const reporter = new TestReporter();
  const admin = new AdminClient();

  try {
    await admin.login();
  } catch (err: any) {
    console.error(`❌ Could not connect to backend at ${STRESS_CONFIG.BASE_URL}: ${err.message}`);
    console.error(`   Please ensure the Gadget Code server is running on port 3000.`);
    process.exit(1);
  }

  // Auto-run setup if needed
  const maxPlayersNeeded = isAll || isRamp ? 100 : Math.max(players, 40);
  await setupStressTestEnvironment(maxPlayersNeeded);

  const health = await admin.getHealth();
  const dbStatus = await admin.getDbStatus();

  if (isRamp || isAll) {
    const rampLevels = [10, 25, 40, 50, 75, 100];
    for (const level of rampLevels) {
      const holdTime = level === 100 ? 5 : level === 40 ? 5 : 3;
      await runSingleLevel(admin, reporter, level, holdTime);
    }
  } else {
    await runSingleLevel(admin, reporter, players, players >= 40 ? 5 : 3);
  }

  // If running full suite or 40+ players, run deep audits:
  if (isAll || players >= 40) {
    console.log(`\n================================================================`);
    console.log(`🔬 EXECUTING SPECIALIZED EVENT RELIABILITY & SECURITY AUDITS`);
    console.log(`================================================================`);

    // Prepare 40 players for specialized audits
    const { players: auditPlayers } = await runAuthScenario(40);
    await runConnectionScenario(auditPlayers);

    // 1. Timer & Deadline Enforcement Audit
    const timerRes = await runTimerDeadlineScenario(admin, auditPlayers);
    reporter.addResult(timerRes);

    // 2. Scoring Formula Audit
    const scoreRes = await runScoringScenario(admin, auditPlayers);
    reporter.addResult(scoreRes);

    // 3. Reconnect Audit (5 and 10 players)
    const rec5Res = await runReconnectScenario(admin, auditPlayers, 5);
    reporter.addResult(rec5Res);

    const rec10Res = await runReconnectScenario(admin, auditPlayers, 10);
    reporter.addResult(rec10Res);

    // 4. Security & Privilege Escalation Audit
    const secRes = await runSecurityScenario(admin, auditPlayers[0]);
    reporter.addResult(secRes);

    // 5. Full 10-Question Round Simulation (40 players x 10 Qs = 400 answers)
    const multiQRes = await runMultiQuestionScenario(admin, auditPlayers, 10);
    reporter.addResult(multiQRes);

    // Disconnect audit players
    auditPlayers.forEach((p) => p.disconnectSocket());
  }

  // Print Summary
  reporter.printConsoleSummary();

  // Save Markdown Report
  const reportsDir = path.join(process.cwd(), 'stress-test', 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportPath = path.join(reportsDir, 'stress_test_report.md');
  const markdownContent = reporter.generateMarkdownReport({
    dbConnected: health.database?.connected,
    dbName: health.database?.databaseName,
  });

  fs.writeFileSync(reportPath, markdownContent, 'utf-8');
  console.log(`\n📄 Detailed Stress Test Report generated at: ${reportPath}\n`);
}

main().catch((err) => {
  console.error('Fatal stress test runner error:', err);
  process.exit(1);
});
