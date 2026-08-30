import {
  AnswerResult,
  EventSettings,
  LeaderboardEntry,
  Question,
  QuizSessionState,
  Round,
  User,
} from '../types';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('gadget_code_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = 'API request failed';
    try {
      const data = await res.json();
      errorMsg = data.error || errorMsg;
    } catch {
      errorMsg = res.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  // Auth
  async login(username: string, password: string, expectedRole?: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, expectedRole }),
    });
    return handleResponse<{ token: string; user: User }>(res);
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ user: User }>(res);
  },

  // Quiz Public / Player
  async getQuizState() {
    const res = await fetch(`${API_BASE}/quiz/state`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ state: QuizSessionState }>(res);
  },

  async submitAnswer(questionId: string, selectedOptionId: string) {
    const res = await fetch(`${API_BASE}/quiz/answer`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ questionId, selectedOptionId }),
    });
    return handleResponse<{ result: AnswerResult }>(res);
  },

  async getLeaderboard(roundId?: string) {
    const url = roundId ? `${API_BASE}/quiz/leaderboard?roundId=${roundId}` : `${API_BASE}/quiz/leaderboard`;
    const res = await fetch(url, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ leaderboard: LeaderboardEntry[] }>(res);
  },

  // Admin Quiz Controls
  async startRound(roundId: string) {
    const res = await fetch(`${API_BASE}/admin/quiz/round`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ roundId }),
    });
    return handleResponse<any>(res);
  },

  async startQuestion(questionId?: string, duration?: number) {
    const res = await fetch(`${API_BASE}/admin/quiz/start-question`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ questionId, duration }),
    });
    return handleResponse<any>(res);
  },

  async endQuestion() {
    const res = await fetch(`${API_BASE}/admin/quiz/end-question`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },

  async nextQuestion() {
    const res = await fetch(`${API_BASE}/admin/quiz/next-question`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },

  async previousQuestion() {
    const res = await fetch(`${API_BASE}/admin/quiz/previous-question`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },

  async resetScores(roundId?: string) {
    const res = await fetch(`${API_BASE}/admin/quiz/reset-scores`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ roundId }),
    });
    return handleResponse<any>(res);
  },

  // Admin Players Management
  async getPlayers() {
    const res = await fetch(`${API_BASE}/admin/players`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{
      players: (User & {
        score: number;
        correctAnswers: number;
        questionsAnswered: number;
        isConnected: boolean;
      })[];
    }>(res);
  },

  async createPlayer(player: { username: string; displayName?: string; password?: string }) {
    const res = await fetch(`${API_BASE}/admin/players`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(player),
    });
    return handleResponse<{ player: User }>(res);
  },

  async bulkCreatePlayers(count: number, prefix = 'player', defaultPassword = 'quiz123') {
    const res = await fetch(`${API_BASE}/admin/players/bulk`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ count, prefix, defaultPassword }),
    });
    return handleResponse<{ message: string; players: User[]; defaultPassword: string }>(res);
  },

  async updatePlayer(id: string, updates: any) {
    const res = await fetch(`${API_BASE}/admin/players/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse<{ player: User }>(res);
  },

  async deletePlayer(id: string) {
    const res = await fetch(`${API_BASE}/admin/players/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string; id: string }>(res);
  },

  // Admin Rounds Management
  async getRounds() {
    const res = await fetch(`${API_BASE}/admin/rounds`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ rounds: Round[] }>(res);
  },

  async createRound(round: Partial<Round>) {
    const res = await fetch(`${API_BASE}/admin/rounds`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(round),
    });
    return handleResponse<{ round: Round }>(res);
  },

  async updateRound(id: string, updates: Partial<Round>) {
    const res = await fetch(`${API_BASE}/admin/rounds/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse<{ round: Round }>(res);
  },

  async deleteRound(id: string) {
    const res = await fetch(`${API_BASE}/admin/rounds/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string; id: string }>(res);
  },

  async setActiveRound(roundId: string) {
    const res = await fetch(`${API_BASE}/admin/rounds/set-active`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ roundId }),
    });
    return handleResponse<any>(res);
  },

  // Admin Questions Management
  async getQuestions(roundId: string) {
    const res = await fetch(`${API_BASE}/admin/rounds/${roundId}/questions`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ questions: Question[] }>(res);
  },

  async createQuestion(roundId: string, question: Partial<Question>) {
    const res = await fetch(`${API_BASE}/admin/rounds/${roundId}/questions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(question),
    });
    return handleResponse<{ question: Question }>(res);
  },

  async updateQuestion(id: string, updates: Partial<Question>) {
    const res = await fetch(`${API_BASE}/admin/questions/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse<{ question: Question }>(res);
  },

  async deleteQuestion(id: string) {
    const res = await fetch(`${API_BASE}/admin/questions/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string; id: string }>(res);
  },

  // Settings & System
  async getSettings() {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{
      settings: EventSettings;
      system: {
        uptimeSeconds: number;
        nodeVersion: string;
        platform: string;
        memoryMb: number;
        lanIps: string[];
        port: number;
      };
    }>(res);
  },

  async updateSettings(settings: Partial<EventSettings>) {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings),
    });
    return handleResponse<{ settings: EventSettings }>(res);
  },

  // Exports & Backups
  async exportLeaderboardCSV(roundId?: string) {
    const url = roundId ? `${API_BASE}/admin/export/leaderboard.csv?roundId=${roundId}` : `${API_BASE}/admin/export/leaderboard.csv`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Export CSV failed');
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `gadget_code_leaderboard_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
  },

  async exportPlayerMatrixCSV() {
    const res = await fetch(`${API_BASE}/admin/export/matrix.csv`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Export matrix CSV failed');
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `gadget_code_player_matrix_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
  },

  async backupDatabase() {
    const res = await fetch(`${API_BASE}/admin/export/backup.json`, { headers: getAuthHeaders() });
    return handleResponse<any>(res);
  },

  async getDbStatus() {
    const res = await fetch(`${API_BASE}/db-status`);
    return handleResponse<{
      database: {
        connected: boolean;
        mode: string;
        databaseName: string;
        uri: string;
        error: string | null;
        stats: {
          usersCount: number;
          roundsCount: number;
          questionsCount: number;
          answersCount: number;
        };
      };
    }>(res);
  },
};
