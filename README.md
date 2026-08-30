# ⚡ GADGET CODE — Technical Quiz Platform

A high-concurrency, real-time technical quiz competition platform engineered for local computer-lab events, LAN hackathons, and classroom competitions. Built with **React 19 + TypeScript**, **Node.js + Express**, **Socket.IO**, and **MongoDB**.

Verified and stress-tested to support **40+ simultaneous players** with sub-3ms question broadcast synchronization, server-authoritative timer enforcement, and zero data corruption.

---

## 🚀 Key Features

- **⏱️ Server-Authoritative Engine:** Centralized timer management preventing client-side timer tampering.
- **⚡ Ultra-Low Latency Broadcasts:** Real-time question dispatching via Socket.IO with $<3\text{ ms}$ timestamp spread across all connected clients.
- **🧮 Dynamic Speed-Based Scoring:** Linear point decay based on response time:
  $$\text{Points} = \text{round}\left(\text{minPoints} + (\text{basePoints} - \text{minPoints}) \times \frac{T_{\text{remaining}}}{T_{\text{duration}}}\right)$$
- **🏆 Live Deterministic Leaderboard:** Instantaneous ranking updates with deterministic multi-tier tie-breaking:
  1. Highest Score $\to$ 2. Correct Answers Count $\to$ 3. Lowest Avg Response Time $\to$ 4. Alphabetical Username.
- **🛡️ Race & Exploit Defense:** Prevents double submissions, late submissions beyond deadline, and unauthorized admin event execution.
- **🔄 Mid-Quiz Reconnection & Resilience:** Automatically restores player identity, score history, and active question state upon reconnect.
- **📊 Admin Control Center:** Full round management, question trigger controls, live answer statistics, CSV exports (matrix & leaderboard), and player management.
- **🧪 Built-in Stress Testing Suite:** Automated zero-mock load-testing system supporting up to 100 concurrent players.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Canvas Confetti |
| **Backend** | Node.js, Express, Socket.IO 4.8, JWT Authentication, BcryptJS |
| **Database** | MongoDB Community Server (Local), Mongoose 9.x |
| **Testing** | Automated TypeScript Stress & Concurrency Suite (`stress-test/`) |

---

## 📦 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **MongoDB Community Server** running locally on port `27017`

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=gadget-code-secret-key-2026-super-secure
MONGODB_URI=mongodb://127.0.0.1:27017/gadget_code
CLIENT_URL=http://localhost:3000
```

### 3. Install Dependencies & Start Server
```bash
npm install
npm run dev
```

The application will bind to `0.0.0.0:3000` for both local and LAN access:
- **Local URL:** `http://localhost:3000`
- **LAN Access:** `http://<SERVER_LAN_IP>:3000`

---

## 🔑 Default Credentials

On initial startup, the platform automatically provisions default administrative and player accounts:

- **Admin Portal:**
  - Username: `admin`
  - Password: `Admin@123`
- **Player Accounts (10 Default Players):**
  - Usernames: `player01` through `player10`
  - Password: `player123`

---

## 🧪 40+ Player Concurrency & Stress Testing Suite

The project includes an automated, zero-mock stress testing environment in `stress-test/` that connects to the real local Express, Socket.IO, and MongoDB instance.

### Stress Test Commands

```bash
# Display CLI help
npm run stress:help

# Provision 100 test players (stress_player_001..100) and test round
npm run stress:setup

# Run specific concurrency levels
npm run stress:10      # 10-player baseline test
npm run stress:25      # 25-player ramp test
npm run stress:40      # 40-player competition requirement test (PASSED)
npm run stress:50      # 50-player load test
npm run stress:75      # 75-player load test
npm run stress:100     # 100-player stress/safety test

# Run progressive ramp (10 -> 25 -> 40 -> 50 -> 75 -> 100 players)
npm run stress:ramp

# Run full test battery (Ramp + Specialized Audits + 10-Question Round)
npm run stress:all

# Safely delete test users and test round without touching real competition data
npm run stress:cleanup
```

### Validated Audit Results

| Concurrency Level | Concurrent Logins (avg) | Socket.IO Latency | Question Sync Spread | Answer Storm Burst (<50ms trigger) | Errors | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **10 Players** | 884 ms | 27 ms | **0.93 ms** | 41 ms | 0 | ✅ **PASSED** |
| **25 Players** | 2,241 ms | 38 ms | **2.86 ms** | 59 ms | 0 | ✅ **PASSED** |
| **40 Players (Target)** | **3,246 ms** | **65 ms** | **2.16 ms** | **103 ms** | **0** | ✅ **PASSED** |
| **50 Players** | 3,408 ms | 82 ms | **1.87 ms** | 106 ms | 0 | ✅ **PASSED** |
| **75 Players** | 4,388 ms | 132 ms | **1.70 ms** | 159 ms | 0 | ✅ **PASSED** |
| **100 Players (Stress)** | **5,458 ms** | **195 ms** | **5.63 ms** | **312 ms** | **0** | ✅ **PASSED** |

- **Report Artifact:** [stress-test/reports/stress_test_report.md](file:///d:/gadget-code-%E2%80%94-technical-quiz-platform/stress-test/reports/stress_test_report.md)

---

## 📁 Repository Structure

```
├── data/                  # Offline fallback data store (when MongoDB unavailable)
├── server/
│   ├── config/            # DB store & MongoDB connection setup
│   ├── controllers/       # Auth, Admin, Quiz, and Export controllers
│   ├── middleware/        # JWT auth & role validation middleware
│   ├── models/            # Mongoose schemas (User, Round, Question, AnswerLog, QuizSession)
│   ├── routes/            # REST API endpoints (/api/*)
│   ├── services/          # QuizEngine state machine & ScoringService
│   └── sockets/           # Real-time Socket.IO event handlers
├── src/                   # React 19 Frontend application
├── stress-test/           # Automated load & concurrency testing subsystem
│   ├── scenarios/         # Test scenarios (auth, connection, lobby, timer, storm, etc.)
│   ├── setup.ts           # Controlled test data provisioning
│   ├── cleanup.ts         # Safe teardown of test accounts
│   └── run-stress-test.ts # Master CLI runner
├── server.ts              # Express + Socket.IO + Vite bootstrapper
├── package.json
└── tsconfig.json
```

---

## 📄 License
Private project for Technical Quiz Competition. All rights reserved.
