import bcrypt from 'bcryptjs';
import { db } from '../config/db';

export async function seedInitialData() {
  const users = db.getUsers();

  // Check if admin already exists
  const existingAdmin = users.find((u) => u.username === 'admin');
  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Admin@123', salt);

    db.addUser({
      id: 'admin_root',
      username: 'admin',
      displayName: 'System Admin',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    });
    console.log('✅ Seeded default Admin user (username: admin, password: Admin@123)');
  }

  // Seed sample players if none exist
  const existingPlayers = users.filter((u) => u.role === 'PLAYER');
  if (existingPlayers.length === 0) {
    const salt = await bcrypt.genSalt(10);
    const playerHash = await bcrypt.hash('player123', salt);

    const initialPlayers = [
      { username: 'player01', displayName: 'ByteBandits (Lab 01)' },
      { username: 'player02', displayName: 'CyberKnights (Lab 02)' },
      { username: 'player03', displayName: 'QuantumCoders (Lab 03)' },
      { username: 'player04', displayName: 'NullPointers (Lab 04)' },
      { username: 'player05', displayName: 'HexHunters (Lab 05)' },
      { username: 'player06', displayName: 'KernelPanic (Lab 06)' },
      { username: 'player07', displayName: 'BinaryBeasts (Lab 07)' },
      { username: 'player08', displayName: 'StackOverlords (Lab 08)' },
      { username: 'player09', displayName: 'LogicLegends (Lab 09)' },
      { username: 'player10', displayName: 'DevDynasty (Lab 10)' },
    ];

    for (const p of initialPlayers) {
      db.addUser({
        username: p.username,
        displayName: p.displayName,
        passwordHash: playerHash,
        role: 'PLAYER',
        isActive: true,
      });
    }
    console.log('✅ Seeded 10 default player accounts (password: player123)');
  }

  // Seed Round 1 and 10 Technical MCQ Questions if none exist
  const rounds = db.getRounds();
  let round1 = rounds.find((r) => r.roundNumber === 1);

  if (!round1) {
    round1 = db.addRound({
      id: 'round_1_tech_quiz',
      roundNumber: 1,
      name: 'Round 1 — Technical Quiz',
      description: 'Rapid-fire Technical MCQ Competition testing computing, networking, systems, and algorithms.',
      status: 'READY',
      defaultDuration: 10,
      scoringConfig: {
        type: 'SPEED_BASED',
        basePoints: 1000,
        minPoints: 100,
      },
    });
    console.log('✅ Created Round 1: Technical Quiz');
  }

  const existingQuestions = db.getQuestions(round1.id);
  if (existingQuestions.length === 0) {
    const technicalQuestions = [
      {
        order: 1,
        text: 'In the OSI model, at which layer does the Transport Layer Security (TLS/SSL) protocol primarily operate?',
        type: 'MCQ',
        duration: 10,
        points: 1000,
        explanation: 'TLS/SSL operates between the Transport Layer (Layer 4) and Application Layer (Layer 7), commonly classified under Presentation/Session or Transport security wrapper.',
        options: [
          { id: 'opt_1_a', text: 'Data Link Layer (Layer 2)' },
          { id: 'opt_1_b', text: 'Network Layer (Layer 3)' },
          { id: 'opt_1_c', text: 'Presentation / Session Layer (Layer 6/5)' },
          { id: 'opt_1_d', text: 'Physical Layer (Layer 1)' },
        ],
        correctOptionId: 'opt_1_c',
      },
      {
        order: 2,
        text: 'What is the average time complexity of searching for an element in a balanced Binary Search Tree (such as an AVL or Red-Black Tree)?',
        type: 'MCQ',
        duration: 10,
        points: 1000,
        explanation: 'Balanced BSTs maintain a height of O(log n), providing O(log n) search, insertion, and deletion times.',
        options: [
          { id: 'opt_2_a', text: 'O(1)' },
          { id: 'opt_2_b', text: 'O(log n)' },
          { id: 'opt_2_c', text: 'O(n)' },
          { id: 'opt_2_d', text: 'O(n log n)' },
        ],
        correctOptionId: 'opt_2_b',
      },
      {
        order: 3,
        text: 'In Node.js event-driven architecture, what executes microtasks (like Promise callbacks and process.nextTick)?',
        type: 'MCQ',
        duration: 10,
        points: 1000,
        explanation: 'In the Node.js event loop, the microtask queue executes immediately after the current operation finishes, before moving to the next macrotask phase.',
        options: [
          { id: 'opt_3_a', text: 'The Microtask Queue between event loop phases' },
          { id: 'opt_3_b', text: 'The OS kernel worker threads directly' },
          { id: 'opt_3_c', text: 'Only during the Timers phase' },
          { id: 'opt_3_d', text: 'Inside the Close Callbacks queue exclusively' },
        ],
        correctOptionId: 'opt_3_a',
      },
      {
        order: 4,
        text: 'Which HTTP response status code is officially designated for "I\'m a teapot" as defined in RFC 2324?',
        type: 'MCQ',
        duration: 10,
        points: 1000,
        explanation: 'HTTP 418 I\'m a teapot was an April Fools\' joke specification in 1998 that became a well-known standard code.',
        options: [
          { id: 'opt_4_a', text: 'HTTP 402' },
          { id: 'opt_4_b', text: 'HTTP 418' },
          { id: 'opt_4_c', text: 'HTTP 429' },
          { id: 'opt_4_d', text: 'HTTP 451' },
        ],
        correctOptionId: 'opt_4_b',
      },
      {
        order: 5,
        text: 'In relational database indexes, which data structure is most widely implemented for disk-based B-Tree indexing?',
        type: 'MCQ',
        duration: 10,
        points: 1000,
        explanation: 'B+ Trees store all actual record pointers in leaf nodes linked sequentially, optimizing range queries and disk block reads.',
        options: [
          { id: 'opt_5_a', text: 'B+ Tree' },
          { id: 'opt_5_b', text: 'Min-Heap' },
          { id: 'opt_5_c', text: 'Trie' },
          { id: 'opt_5_d', text: 'Splay Tree' },
        ],
        correctOptionId: 'opt_5_a',
      },
      {
        order: 6,
        text: 'Which communication bus protocol requires only TWO physical wires (SDA and SCL) for synchronous serial communication between microcontrollers and sensors?',
        type: 'MCQ',
        duration: 10,
        points: 1000,
        explanation: 'I2C (Inter-Integrated Circuit) uses two bidirectional open-drain lines: Serial Data (SDA) and Serial Clock (SCL).',
        options: [
          { id: 'opt_6_a', text: 'SPI (Serial Peripheral Interface)' },
          { id: 'opt_6_b', text: 'I2C (Inter-Integrated Circuit)' },
          { id: 'opt_6_c', text: 'UART (Universal Asynchronous Receiver-Transmitter)' },
          { id: 'opt_6_d', text: 'CAN Bus' },
        ],
        correctOptionId: 'opt_6_b',
      },
      {
        order: 7,
        text: 'In operating systems, which of the following is NOT one of Coffman\'s four necessary conditions for a Deadlock to occur?',
        type: 'MCQ',
        duration: 10,
        points: 1000,
        explanation: 'The 4 Coffman conditions are: Mutual Exclusion, Hold & Wait, No Preemption, and Circular Wait. Preemption breaks deadlocks.',
        options: [
          { id: 'opt_7_a', text: 'Mutual Exclusion' },
          { id: 'opt_7_b', text: 'Hold and Wait' },
          { id: 'opt_7_c', text: 'Forced Preemption' },
          { id: 'opt_7_d', text: 'Circular Wait' },
        ],
        correctOptionId: 'opt_7_c',
      },
      {
        order: 8,
        text: 'What Linux kernel mechanism is primarily used by Docker to isolate CPU, memory, and I/O resource consumption between containers?',
        type: 'MCQ',
        duration: 10,
        points: 1000,
        explanation: 'Control Groups (cgroups) meter and limit resources (CPU, RAM, block I/O), while Namespaces isolate visibility (PID, NET, MNT).',
        options: [
          { id: 'opt_8_a', text: 'cgroups (Control Groups)' },
          { id: 'opt_8_b', text: 'Chroot Jails exclusively' },
          { id: 'opt_8_c', text: 'Hypervisor Ring-0 virtualization' },
          { id: 'opt_8_d', text: 'SELinux policies only' },
        ],
        correctOptionId: 'opt_8_a',
      },
      {
        order: 9,
        text: 'In asymmetric cryptography, which mathematical problem provides the foundational security for standard RSA encryption?',
        type: 'MCQ',
        duration: 10,
        points: 1000,
        explanation: 'RSA security relies on the computational difficulty of factoring the product of two large prime numbers.',
        options: [
          { id: 'opt_9_a', text: 'Integer Factorization of large prime products' },
          { id: 'opt_9_b', text: 'Discrete Logarithm on elliptic curves' },
          { id: 'opt_9_c', text: 'Fast Fourier Transform' },
          { id: 'opt_9_d', text: 'Traveling Salesperson Problem' },
        ],
        correctOptionId: 'opt_9_a',
      },
      {
        order: 10,
        text: 'In Git version control, how are commit objects, trees, and blobs identified and verified for integrity?',
        type: 'MCQ',
        duration: 10,
        points: 1000,
        explanation: 'Git uses SHA cryptographic hashes (SHA-1 / SHA-256) based on content to create a content-addressable Merkle DAG.',
        options: [
          { id: 'opt_10_a', text: 'Sequential auto-incrementing integer IDs' },
          { id: 'opt_10_b', text: 'SHA cryptographic hash of content' },
          { id: 'opt_10_c', text: 'Timestamp-based UUID version 4' },
          { id: 'opt_10_d', text: 'Central server registry index numbers' },
        ],
        correctOptionId: 'opt_10_b',
      },
    ];

    for (const q of technicalQuestions) {
      db.addQuestion({
        roundId: round1.id,
        ...q,
      });
    }
    console.log('✅ Seeded 10 authentic Technical Quiz Questions for Round 1');
  }
}
