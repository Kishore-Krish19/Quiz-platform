export const STRESS_CONFIG = {
  BASE_URL: process.env.STRESS_BASE_URL || 'http://localhost:3000',
  SOCKET_URL: process.env.STRESS_SOCKET_URL || 'http://localhost:3000',
  ADMIN_USER: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'Admin@123',
  },
  PLAYER_PREFIX: 'stress_player_',
  DEFAULT_PASSWORD: 'stress_pass_123',
  TEST_ROUND_ID: 'round_stress_test',
  TEST_ROUND_NAME: 'Stress Test — High Concurrency Round',
  DEFAULT_QUESTION_DURATION: 10, // seconds
  DEFAULT_POINTS: 1000,
  TOTAL_TEST_QUESTIONS: 10,
  MAX_PLAYERS: 100,
};
