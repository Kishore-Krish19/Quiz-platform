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
- **🖼️ Image-Based Questions:** Any question can carry a picture — players see **image → question → options**. Each question can also carry a second image that holds the player screens between questions until the admin starts the next one. Images are uploaded from the admin panel and served from the server, so they work with no internet.
- **🔒 Simultaneous Answer Reveal:** Nobody learns anything early. Submitting returns a receipt only — correctness, points and standings are all withheld until the timer ends, then released to every screen in the same instant.
- **🛡️ Race & Exploit Defense:** Prevents double submissions, late submissions beyond deadline, and unauthorized admin event execution.
- **💾 MongoDB Outage Safety:** If MongoDB drops mid-event the quiz keeps running. Writes are held in order in `data/.mongo-pending.jsonl` (one line each) and saved the moment MongoDB is back — or at the next start, if the server was restarted during the outage.
- **🔄 Mid-Quiz Reconnection & Resilience:** Automatically restores player identity, score history, their own submitted answer, and active question state upon reconnect — a reload mid-question cannot be used to peek at the answer early.
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
Copy `.env.example` to `.env`. These values are loaded at start-up (`dotenv/config`, the first import in `server.ts`).
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/gadget_code
CLIENT_URL=http://localhost:3000
JWT_SECRET=
ADMIN_PASSWORD=<choose one, at least 10 characters>
```

- **`ADMIN_PASSWORD`** is required on a fresh install: it becomes the password of the `admin` account. The server refuses to start while any admin account still uses a published default password.
- **`JWT_SECRET`** should stay empty. On first start the server generates a random secret for this install and keeps it in `data/.jwt-secret` (git-ignored — never share it). If you set one yourself it must be at least 32 random characters; a short or published secret is refused at startup.

### 3. Install Dependencies & Start Server
```bash
npm install
npm run dev
```

The application will bind to `0.0.0.0:3000` for both local and LAN access:
- **Local URL:** `http://localhost:3000`
- **LAN Access:** `http://<SERVER_LAN_IP>:3000`

### 4. Event Day: Production Mode
`npm run dev` is for working on the app. For the event itself, build it and run the build:
```bash
npm run build
```
Then set `NODE_ENV=production` in `.env` and start it:
```bash
npm start
```
- **Start MongoDB first.** In production the server refuses to start without it. In development it quietly falls back to the sample data file in `data/` and runs the event on that.
- Players' browsers load one prebuilt bundle instead of hundreds of source files, and no development server is exposed on the network.
- Run `npm run build` again after any code change — otherwise the previous build keeps running.

---

## 🔑 Accounts & Passwords

No password is published anywhere: competitors can read this README too.

- **Admin (`admin`):** the password is `ADMIN_PASSWORD` from `.env`. Change it any time under **Settings → Admin Account**; that signs out every other admin screen. A password changed there survives restarts. If you forget it, put a *new* value in `ADMIN_PASSWORD` and restart — a changed value resets the `admin` password.
- **Players:** every account gets its own generated password. A fresh install seeds `player01`–`player10` and prints their passwords once in the server console; the **Bulk Generator** shows a sheet for the accounts it creates. **Players → ISSUE NEW PASSWORDS** replaces every player's password and gives you a sheet to copy, download as CSV, or print as cut-out slips. The Players page warns if any accounts share a password.
- **Failed sign-ins** are limited to 10 per minute per machine, so passwords cannot be guessed at speed.

### Before the event
1. Set `ADMIN_PASSWORD` in `.env` and start the server.
2. Open **Players → ISSUE NEW PASSWORDS**, print the slips, and hand one to each team.
3. Keep `data/.jwt-secret` private — anyone holding it could sign their own admin token.

---

## 🖼️ Question Images

Open **Questions → Add / Edit** in the admin panel. Each question has two optional image slots:

| Slot | Shown | Purpose |
| :--- | :--- | :--- |
| **Question Image** | Above the question text, for the whole time the question is live | Diagrams, circuits, code screenshots, logos to identify |
| **After-Question Image** | On every player screen once the question closes, until you start the next one | Sponsor boards, round titles, an intermission card |

- Accepts **PNG, JPEG, GIF, WEBP**, up to **5 MB** each. SVG is rejected on purpose: uploads are served from the app's own origin and an SVG can carry script.
- Files are written to `data/uploads/` and served over HTTP. Only a short URL travels in the Socket.IO payload, so question broadcasts stay small and the sync spread is unaffected.
- The admin Quiz Control screen shows a thumbnail of whatever is currently on the player screens, plus a **HOLD IMAGE** chip on any question that has one queued.
- A question without an after-image simply falls back to the usual standby card, and the final question of a round goes straight to the podium.

> **Backups:** `admin/export/backup.json` contains image *URLs*, not the image bytes. When moving an event to another machine, copy the `data/uploads/` folder across alongside the JSON, or the pictures will be missing.
>
> **Cleanup:** when an edit replaces or removes a question's image, or a question or round is deleted, the image file is deleted too — unless another question still uses it. An older backup can therefore point at images that no longer exist.

---

## 🧪 40+ Player Concurrency & Stress Testing Suite

The project includes an automated, zero-mock stress testing environment in `stress-test/` that connects to the real local Express, Socket.IO, and MongoDB instance.

### Stress Test Commands

The suite signs in as `admin` with `ADMIN_PASSWORD` from `.env` (or the environment). If you have changed the admin password in the console since, pass the current one: `ADMIN_PASSWORD=... npm run stress:40`.

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
│   ├── uploads/           # Admin-uploaded question images (git-ignored, not in JSON backups)
│   ├── .jwt-secret        # Per-install token signing secret (git-ignored, generated on first start)
│   └── .mongo-pending.jsonl  # Writes held during a MongoDB outage (git-ignored, transient)
├── server/
│   ├── config/            # DB store & MongoDB connection setup
│   ├── controllers/       # Auth, Admin, Quiz, Export, and Image Upload controllers
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
