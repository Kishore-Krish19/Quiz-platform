import { AdminClient } from './adminClient';
import { STRESS_CONFIG } from './config';

export async function cleanupStressTestData() {
  console.log(`\n================================================================`);
  console.log(`🧹 GADGET CODE STRESS TEST CLEANUP`);
  console.log(`================================================================`);

  const admin = new AdminClient();
  await admin.login();
  console.log('✅ Logged in as Admin');

  // 1. Fetch all players and strictly identify stress test players
  const playersRes = await admin.getPlayers();
  const allPlayers: any[] = playersRes.players || [];
  const stressPlayers = allPlayers.filter((p) =>
    p.username.startsWith(STRESS_CONFIG.PLAYER_PREFIX)
  );

  console.log(`🔍 Found ${stressPlayers.length} test players with prefix "${STRESS_CONFIG.PLAYER_PREFIX}".`);

  let deletedPlayers = 0;
  for (const player of stressPlayers) {
    // Extra safety verification: verify username prefix before delete
    if (player.username.startsWith(STRESS_CONFIG.PLAYER_PREFIX)) {
      await admin.deletePlayer(player.id);
      deletedPlayers++;
    }
  }
  console.log(`🗑️  Deleted ${deletedPlayers} stress test player accounts.`);

  // 2. Find and delete the stress test round if present
  const roundsRes = await admin.getRounds();
  const allRounds: any[] = roundsRes.rounds || [];
  const stressRound = allRounds.find(
    (r) => r.id === STRESS_CONFIG.TEST_ROUND_ID || r.name === STRESS_CONFIG.TEST_ROUND_NAME
  );

  if (stressRound) {
    console.log(`🔍 Found stress test round "${stressRound.name}" (ID: ${stressRound.id}). Deleting...`);
    await admin.deleteRound(stressRound.id);
    console.log(`🗑️  Deleted stress test round and its associated questions/answer logs.`);
  }

  // 3. Switch back to Round 1 if available
  const remainingRounds = (await admin.getRounds()).rounds || [];
  const round1 = remainingRounds.find((r: any) => r.roundNumber === 1) || remainingRounds[0];
  if (round1) {
    await admin.setActiveRound(round1.id);
    console.log(`🔄 Restored active round to: "${round1.name}" (${round1.id})`);
  }

  console.log(`================================================================`);
  console.log(`✨ CLEANUP COMPLETE: All test artifacts safely purged.`);
  console.log(`================================================================\n`);
}

// Direct execution
if (process.argv[1] && process.argv[1].includes('cleanup')) {
  cleanupStressTestData().catch((err) => {
    console.error('Cleanup failed:', err);
    process.exit(1);
  });
}
