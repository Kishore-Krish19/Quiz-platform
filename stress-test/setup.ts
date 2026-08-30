import { AdminClient } from './adminClient';
import { STRESS_CONFIG } from './config';

export async function setupStressTestEnvironment(targetPlayers = STRESS_CONFIG.MAX_PLAYERS) {
  console.log(`\n================================================================`);
  console.log(`🔧 GADGET CODE STRESS TEST ENVIRONMENT SETUP`);
  console.log(`================================================================`);

  const admin = new AdminClient();
  await admin.login();
  console.log('✅ Logged in as Admin');

  // Check health and MongoDB
  const health = await admin.getHealth();
  console.log(`📊 Backend Health: ${health.status}`);
  console.log(`   Database Connected: ${health.database?.connected ? 'YES (MongoDB)' : 'NO'}`);
  console.log(`   Database Mode:      ${health.database?.mode}`);

  // 1. Setup Test Players
  console.log(`\n👥 Setting up ${targetPlayers} test players (namespace: ${STRESS_CONFIG.PLAYER_PREFIX}*)...`);
  const currentPlayersRes = await admin.getPlayers();
  const currentPlayers: any[] = currentPlayersRes.players || [];
  const existingStressPlayers = new Set(
    currentPlayers
      .filter((p) => p.username.startsWith(STRESS_CONFIG.PLAYER_PREFIX))
      .map((p) => p.username)
  );

  let createdCount = 0;
  for (let i = 1; i <= targetPlayers; i++) {
    const pad = i.toString().padStart(3, '0');
    const username = `${STRESS_CONFIG.PLAYER_PREFIX}${pad}`;
    const displayName = `Stress Bot #${pad}`;

    if (!existingStressPlayers.has(username)) {
      await admin.createPlayer(username, displayName, STRESS_CONFIG.DEFAULT_PASSWORD);
      createdCount++;
    }
  }
  console.log(`✅ Test Players: ${existingStressPlayers.size + createdCount} ready (${createdCount} newly created)`);

  // 2. Setup Test Round
  console.log(`\n🎯 Setting up dedicated test round "${STRESS_CONFIG.TEST_ROUND_NAME}"...`);
  const roundsRes = await admin.getRounds();
  const rounds: any[] = roundsRes.rounds || [];
  let testRound = rounds.find((r) => r.id === STRESS_CONFIG.TEST_ROUND_ID || r.name === STRESS_CONFIG.TEST_ROUND_NAME);

  if (!testRound) {
    const newRound = await admin.createRound({
      id: STRESS_CONFIG.TEST_ROUND_ID,
      roundNumber: 99,
      name: STRESS_CONFIG.TEST_ROUND_NAME,
      description: 'Automated 100-Player High-Concurrency Stress Test Round',
      status: 'READY',
      defaultDuration: STRESS_CONFIG.DEFAULT_QUESTION_DURATION,
      scoringConfig: {
        type: 'SPEED_BASED',
        basePoints: STRESS_CONFIG.DEFAULT_POINTS,
        minPoints: 100,
      },
    });
    testRound = newRound.round;
    console.log(`✅ Created test round "${STRESS_CONFIG.TEST_ROUND_ID}"`);
  } else {
    console.log(`✅ Test round "${testRound.id}" already exists`);
  }

  // 3. Setup 10 Questions for Test Round
  const questionsRes = await admin.getQuestions(testRound.id);
  const existingQuestions: any[] = questionsRes.questions || [];

  if (existingQuestions.length < STRESS_CONFIG.TOTAL_TEST_QUESTIONS) {
    console.log(`📝 Seeding ${STRESS_CONFIG.TOTAL_TEST_QUESTIONS} test questions...`);

    const sampleQuestions = [
      {
        text: 'Stress Q1: What is the time complexity of QuickSort in the average case?',
        options: [
          { id: 'q1_opt_a', text: 'O(n log n)' },
          { id: 'q1_opt_b', text: 'O(n^2)' },
          { id: 'q1_opt_c', text: 'O(n)' },
          { id: 'q1_opt_d', text: 'O(1)' },
        ],
        correctOptionId: 'q1_opt_a',
      },
      {
        text: 'Stress Q2: Which protocol guarantees reliable, ordered byte streams over IP?',
        options: [
          { id: 'q2_opt_a', text: 'UDP' },
          { id: 'q2_opt_b', text: 'TCP' },
          { id: 'q2_opt_c', text: 'ICMP' },
          { id: 'q2_opt_d', text: 'ARP' },
        ],
        correctOptionId: 'q2_opt_b',
      },
      {
        text: 'Stress Q3: What data structure is used for Breadth-First Search (BFS)?',
        options: [
          { id: 'q3_opt_a', text: 'Stack' },
          { id: 'q3_opt_b', text: 'Queue' },
          { id: 'q3_opt_c', text: 'Heap' },
          { id: 'q3_opt_d', text: 'Trie' },
        ],
        correctOptionId: 'q3_opt_b',
      },
      {
        text: 'Stress Q4: Which HTTP status code represents "404 Not Found"?',
        options: [
          { id: 'q4_opt_a', text: '200 OK' },
          { id: 'q4_opt_b', text: '301 Moved Permanently' },
          { id: 'q4_opt_c', text: '404 Not Found' },
          { id: 'q4_opt_d', text: '500 Internal Server Error' },
        ],
        correctOptionId: 'q4_opt_c',
      },
      {
        text: 'Stress Q5: In relational databases, what does ACID stand for?',
        options: [
          { id: 'q5_opt_a', text: 'Atomicity, Consistency, Isolation, Durability' },
          { id: 'q5_opt_b', text: 'Automatic, Concurrent, Isolated, Dynamic' },
          { id: 'q5_opt_c', text: 'Array, Class, Interface, Delegate' },
          { id: 'q5_opt_d', text: 'Async, Callback, Iterator, Deferred' },
        ],
        correctOptionId: 'q5_opt_a',
      },
      {
        text: 'Stress Q6: What is the primary index data structure used by MongoDB by default for _id?',
        options: [
          { id: 'q6_opt_a', text: 'Hash Table' },
          { id: 'q6_opt_b', text: 'B-Tree / WiredTiger B-Tree' },
          { id: 'q6_opt_c', text: 'Red-Black Tree' },
          { id: 'q6_opt_d', text: 'Skip List' },
        ],
        correctOptionId: 'q6_opt_b',
      },
      {
        text: 'Stress Q7: Which Node.js mechanism executes asynchronous I/O callbacks?',
        options: [
          { id: 'q7_opt_a', text: 'Garbage Collector' },
          { id: 'q7_opt_b', text: 'Event Loop / Libuv' },
          { id: 'q7_opt_c', text: 'V8 JIT Compiler' },
          { id: 'q7_opt_d', text: 'WebAssembly Engine' },
        ],
        correctOptionId: 'q7_opt_b',
      },
      {
        text: 'Stress Q8: What does TLS stand for in secure network communications?',
        options: [
          { id: 'q8_opt_a', text: 'Transport Layer Security' },
          { id: 'q8_opt_b', text: 'Thread Local Storage' },
          { id: 'q8_opt_c', text: 'Transmission Link Socket' },
          { id: 'q8_opt_d', text: 'Terminal Line System' },
        ],
        correctOptionId: 'q8_opt_a',
      },
      {
        text: 'Stress Q9: In WebSocket handshakes, which HTTP header upgrades the connection?',
        options: [
          { id: 'q9_opt_a', text: 'Upgrade: websocket' },
          { id: 'q9_opt_b', text: 'Transfer-Encoding: chunked' },
          { id: 'q9_opt_c', text: 'Connection: keep-alive' },
          { id: 'q9_opt_d', text: 'Accept: text/event-stream' },
        ],
        correctOptionId: 'q9_opt_a',
      },
      {
        text: 'Stress Q10: What is the worst-case space complexity of Depth-First Search on a tree of depth D?',
        options: [
          { id: 'q10_opt_a', text: 'O(D)' },
          { id: 'q10_opt_b', text: 'O(2^D)' },
          { id: 'q10_opt_c', text: 'O(1)' },
          { id: 'q10_opt_d', text: 'O(D!)' },
        ],
        correctOptionId: 'q10_opt_a',
      },
    ];

    for (let i = existingQuestions.length; i < sampleQuestions.length; i++) {
      const q = sampleQuestions[i];
      await admin.createQuestion(testRound.id, {
        order: i + 1,
        text: q.text,
        type: 'MCQ',
        duration: STRESS_CONFIG.DEFAULT_QUESTION_DURATION,
        points: STRESS_CONFIG.DEFAULT_POINTS,
        explanation: 'Stress Test Validated Question',
        options: q.options,
        correctOptionId: q.correctOptionId,
      });
    }
    console.log(`✅ Seeded 10 test questions into round ${testRound.id}`);
  } else {
    console.log(`✅ Test round has ${existingQuestions.length} questions ready`);
  }

  // 4. Activate test round & reset scores
  await admin.setActiveRound(testRound.id);
  await admin.resetScores(testRound.id);
  console.log(`✅ Activated test round and reset scores.`);

  console.log(`================================================================`);
  console.log(`✨ STRESS TEST ENVIRONMENT READY`);
  console.log(`================================================================\n`);
}

// Direct execution
if (process.argv[1] && process.argv[1].includes('setup')) {
  setupStressTestEnvironment().catch((err) => {
    console.error('Setup failed:', err);
    process.exit(1);
  });
}
