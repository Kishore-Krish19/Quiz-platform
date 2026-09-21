import { STRESS_CONFIG } from './config';

export class AdminClient {
  private token: string | null = null;

  public async login(): Promise<string> {
    const res = await fetch(`${STRESS_CONFIG.BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: STRESS_CONFIG.ADMIN_USER.username,
        password: STRESS_CONFIG.ADMIN_USER.password,
        expectedRole: 'ADMIN',
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Admin login failed: ${res.status} ${JSON.stringify(err)}`);
    }

    const data = await res.json();
    this.token = data.token;
    return this.token!;
  }

  public getToken(): string {
    if (!this.token) {
      throw new Error('Admin not authenticated. Call login() first.');
    }
    return this.token;
  }

  private authHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.getToken()}`,
    };
  }

  public async getHealth() {
    const res = await fetch(`${STRESS_CONFIG.BASE_URL}/api/health`);
    return await res.json();
  }

  public async getDbStatus() {
    const res = await fetch(`${STRESS_CONFIG.BASE_URL}/api/db-status`);
    return await res.json();
  }

  public async getPlayers() {
    const res = await fetch(`${STRESS_CONFIG.BASE_URL}/api/admin/players`, {
      headers: this.authHeaders(),
    });
    return await res.json();
  }

  public async createPlayer(username: string, displayName: string, password = STRESS_CONFIG.DEFAULT_PASSWORD) {
    const res = await fetch(`${STRESS_CONFIG.BASE_URL}/api/admin/players`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({ username, displayName, password }),
    });
    return await res.json();
  }

  public async deletePlayer(id: string) {
    const res = await fetch(`${STRESS_CONFIG.BASE_URL}/api/admin/players/${id}`, {
      method: 'DELETE',
      headers: this.authHeaders(),
    });
    return await res.json();
  }

  public async getRounds() {
    const res = await fetch(`${STRESS_CONFIG.BASE_URL}/api/admin/rounds`, {
      headers: this.authHeaders(),
    });
    return await res.json();
  }

  public async createRound(roundData: any) {
    const res = await fetch(`${STRESS_CONFIG.BASE_URL}/api/admin/rounds`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(roundData),
    });
    return await res.json();
  }

  public async deleteRound(id: string) {
    const res = await fetch(`${STRESS_CONFIG.BASE_URL}/api/admin/rounds/${id}`, {
      method: 'DELETE',
      headers: this.authHeaders(),
    });
    return await res.json();
  }

  public async setActiveRound(roundId: string) {
    const res = await fetch(`${STRESS_CONFIG.BASE_URL}/api/admin/rounds/set-active`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({ roundId }),
    });
    return await res.json();
  }

  public async createQuestion(roundId: string, questionData: any) {
    const res = await fetch(`${STRESS_CONFIG.BASE_URL}/api/admin/rounds/${roundId}/questions`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(questionData),
    });
    return await res.json();
  }

  public async getQuestions(roundId: string) {
    const res = await fetch(`${STRESS_CONFIG.BASE_URL}/api/admin/rounds/${roundId}/questions`, {
      headers: this.authHeaders(),
    });
    return await res.json();
  }

  public async startQuestion(questionId?: string, duration?: number) {
    const res = await fetch(`${STRESS_CONFIG.BASE_URL}/api/admin/quiz/start-question`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({ questionId, duration }),
    });
    return await res.json();
  }

  public async endQuestion() {
    const res = await fetch(`${STRESS_CONFIG.BASE_URL}/api/admin/quiz/end-question`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({}),
    });
    return await res.json();
  }

  public async nextQuestion() {
    const res = await fetch(`${STRESS_CONFIG.BASE_URL}/api/admin/quiz/next-question`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({}),
    });
    return await res.json();
  }

  public async resetScores(roundId?: string) {
    const res = await fetch(`${STRESS_CONFIG.BASE_URL}/api/admin/quiz/reset-scores`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({ roundId }),
    });
    return await res.json();
  }

  /**
   * Resolves the round the stress scenarios are allowed to operate on.
   *
   * The dedicated stress round wins outright. Scenarios call resetScores() on
   * whatever round they are handed, so resolving to "whatever is currently active"
   * would let a load test wipe a live competition round's answer log. That is the
   * namespace guarantee in this suite's README, and it must not depend on which
   * round an operator happens to have selected.
   *
   * (This previously read state.session?.activeRoundId — a key that never exists,
   * since /api/quiz/state returns { state }. The active-round branch was therefore
   * dead, and the safe fallback below is what has actually been running. Rather
   * than revive that branch and make the suite destructive, the safe order is now
   * the explicit contract.)
   */
  public async getActiveOrTestRoundId(): Promise<string> {
    const roundsRes = await this.getRounds();
    const stressRound = (roundsRes.rounds || []).find(
      (r: any) => r.name === STRESS_CONFIG.TEST_ROUND_NAME || r.id === STRESS_CONFIG.TEST_ROUND_ID
    );
    if (stressRound) return stressRound.id;

    // No stress round provisioned (setup never run): fall back to the active round,
    // then to the first round that exists.
    const state = await this.getQuizState();
    if (state.state?.activeRoundId) {
      return state.state.activeRoundId;
    }
    return (roundsRes.rounds || [])[0]?.id || '';
  }

  public async getQuizState() {
    const res = await fetch(`${STRESS_CONFIG.BASE_URL}/api/quiz/state`, {
      headers: this.authHeaders(),
    });
    return await res.json();
  }

  public async getLeaderboard(roundId?: string) {
    const url = roundId
      ? `${STRESS_CONFIG.BASE_URL}/api/quiz/leaderboard?roundId=${encodeURIComponent(roundId)}`
      : `${STRESS_CONFIG.BASE_URL}/api/quiz/leaderboard`;
    const res = await fetch(url, { headers: this.authHeaders() });
    return await res.json();
  }
}
