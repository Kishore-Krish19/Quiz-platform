# Gadget Code — Stress Testing & Concurrency Suite

Automated, end-to-end load testing suite designed to evaluate real-time performance, concurrency limits, timer accuracy, and event synchronization for the **Gadget Code Technical Quiz Platform**.

## Architecture & Features

- **Zero-Mock Real Testing**: Interacts directly with Express REST API, Socket.IO WebSockets, and MongoDB Community Server on `localhost:3000`.
- **Target Concurrency**: Validated for **40+ simultaneous players** (and up to 100 players).
- **Safe Test Namespace**: All generated bots use `stress_player_001..100` and `round_stress_test` so real competition data is never impacted.

---

## Available Commands

| Command | Description |
| :--- | :--- |
| `npm run stress:setup` | Initializes 100 test accounts and dedicated 10-question test round |
| `npm run stress:10` | Runs 10-player baseline test |
| `npm run stress:25` | Runs 25-player ramp test |
| `npm run stress:40` | Runs 40-player competition requirement test |
| `npm run stress:50` | Runs 50-player load test |
| `npm run stress:75` | Runs 75-player load test |
| `npm run stress:100` | Runs 100-player stress/safety test |
| `npm run stress:ramp` | Progressively tests 10 → 25 → 40 → 50 → 75 → 100 players |
| `npm run stress:all` | Runs full test battery including ramp, timer, scoring, reconnect & 10-Q round |
| `npm run stress:cleanup` | Safely purges test users and test round |
| `npm run stress:help` | Displays CLI help |

---

## Tested Scenarios

1. **Authentication Concurrency**: Simultaneous REST logins & JWT signature verification.
2. **Socket.IO Connection Storm**: Concurrent WebSocket connection handshakes & initial state delivery.
3. **Lobby Stability & Hold**: Long-duration connection maintenance without memory leaks or drops.
4. **Question Broadcast Synchronization**: Broadcast latency spread analysis (<50ms LAN target).
5. **Server-Authoritative Timer Enforcement**: Exact deadline cutoff with sub-millisecond precision.
6. **Simultaneous Answer Storm**: 40-100 player burst submissions within <50ms.
7. **Double Submission Defense**: Ensures immediate duplicate/secondary submissions are rejected.
8. **Scoring Accuracy & Result Embargo**: Validates the linear speed-based decay formula and point calculations, and asserts that a submission receipt never leaks correctness, points or standings while the question is still running.
9. **Leaderboard Integrity**: Multi-tier deterministic tie-breaking and rank consistency.
10. **Mid-Quiz Reconnection**: Reconnecting dropped players with state and score recovery.
11. **Multi-Question Round Simulation**: Full 10-question round (400 total answers).
12. **Privilege Escalation & Security**: Validates role enforcement and unauthorized event blocking.
