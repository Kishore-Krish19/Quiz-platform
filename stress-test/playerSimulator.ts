import { STRESS_CONFIG } from './config';
import { StressSocketClient } from './socketClient';

export interface LoginResult {
  success: boolean;
  durationMs: number;
  token?: string;
  user?: any;
  error?: string;
}

export class PlayerSimulator {
  public token: string | null = null;
  public user: any = null;
  public socketClient: StressSocketClient | null = null;
  public loginDurationMs = 0;

  constructor(
    public readonly username: string,
    public readonly password = STRESS_CONFIG.DEFAULT_PASSWORD,
    public readonly displayName = username
  ) {}

  public async login(): Promise<LoginResult> {
    const startTime = performance.now();
    try {
      const res = await fetch(`${STRESS_CONFIG.BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: this.username,
          password: this.password,
          expectedRole: 'PLAYER',
        }),
      });

      const durationMs = performance.now() - startTime;
      this.loginDurationMs = durationMs;

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return {
          success: false,
          durationMs,
          error: errJson.error || `HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      this.token = data.token;
      this.user = data.user;

      return {
        success: true,
        durationMs,
        token: this.token!,
        user: this.user,
      };
    } catch (err: any) {
      const durationMs = performance.now() - startTime;
      return {
        success: false,
        durationMs,
        error: err.message,
      };
    }
  }

  public async connectSocket(): Promise<number> {
    if (!this.token || !this.user) {
      throw new Error(`Cannot connect socket: player ${this.username} not logged in.`);
    }

    this.socketClient = new StressSocketClient(this.user.id, this.username, this.token);
    return await this.socketClient.connect();
  }

  public disconnectSocket() {
    if (this.socketClient) {
      this.socketClient.disconnect();
    }
  }

  public async reconnectSocket(): Promise<number> {
    this.disconnectSocket();
    return await this.connectSocket();
  }

  public submitAnswer(questionId: string, selectedOptionId: string) {
    if (!this.socketClient) {
      throw new Error(`Player ${this.username} socket client not connected`);
    }
    this.socketClient.submitAnswer(questionId, selectedOptionId);
  }

  public submitAnswerRest(questionId: string, selectedOptionId: string) {
    if (!this.token) {
      throw new Error(`Player ${this.username} not logged in`);
    }
    return fetch(`${STRESS_CONFIG.BASE_URL}/api/quiz/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ questionId, selectedOptionId }),
    }).then((res) => res.json());
  }
}
