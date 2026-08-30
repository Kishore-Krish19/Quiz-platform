import { io, Socket } from 'socket.io-client';
import { STRESS_CONFIG } from './config';

export interface ReceivedEvent {
  eventName: string;
  payload: any;
  receivedAt: number; // high-resolution performance.now() or Date.now()
}

export class StressSocketClient {
  public socket: Socket | null = null;
  public isConnected = false;
  public connectDurationMs = 0;
  public lastState: any = null;
  public lastQuestion: any = null;
  public lastAnswerResult: any = null;
  public eventLog: ReceivedEvent[] = [];
  public errors: string[] = [];

  constructor(
    public readonly playerId: string,
    public readonly username: string,
    private readonly token: string
  ) {}

  public async connect(): Promise<number> {
    const startTime = performance.now();

    return new Promise<number>((resolve, reject) => {
      this.socket = io(STRESS_CONFIG.SOCKET_URL, {
        auth: { token: this.token },
        query: { token: this.token },
        transports: ['websocket', 'polling'],
        reconnection: false,
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        this.connectDurationMs = performance.now() - startTime;
        resolve(this.connectDurationMs);
      });

      this.socket.on('connect_error', (err) => {
        this.isConnected = false;
        this.errors.push(`Connect error: ${err.message}`);
        reject(err);
      });

      this.socket.on('disconnect', (reason) => {
        this.isConnected = false;
        this.recordEvent('disconnect', { reason });
      });

      this.socket.on('quiz:state', (data) => {
        this.lastState = data;
        this.recordEvent('quiz:state', data);
      });

      this.socket.on('quiz:question_started', (data) => {
        this.lastQuestion = data;
        this.recordEvent('quiz:question_started', data);
      });

      this.socket.on('quiz:question_ended', (data) => {
        this.recordEvent('quiz:question_ended', data);
      });

      this.socket.on('quiz:leaderboard_updated', (data) => {
        this.recordEvent('quiz:leaderboard_updated', data);
      });

      this.socket.on('player:answer_result', (data) => {
        this.lastAnswerResult = data;
        this.recordEvent('player:answer_result', data);
      });

      this.socket.on('system:error', (data) => {
        this.errors.push(typeof data === 'string' ? data : JSON.stringify(data));
        this.recordEvent('system:error', data);
      });
    });
  }

  private recordEvent(eventName: string, payload: any) {
    this.eventLog.push({
      eventName,
      payload,
      receivedAt: performance.now(),
    });
  }

  public submitAnswer(questionId: string, selectedOptionId: string) {
    if (!this.socket || !this.isConnected) {
      throw new Error(`Socket not connected for player ${this.username}`);
    }
    this.socket.emit('player:submit_answer', { questionId, selectedOptionId });
  }

  public requestSync() {
    if (this.socket && this.isConnected) {
      this.socket.emit('quiz:request_sync');
    }
  }

  public emitRaw(event: string, payload?: any) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, payload);
    }
  }

  public waitForEvent(eventName: string, timeoutMs = 5000): Promise<ReceivedEvent> {
    return new Promise((resolve, reject) => {
      // Check if already received recently
      const existing = this.eventLog.find((e) => e.eventName === eventName);
      if (existing) {
        return resolve(existing);
      }

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Timed out waiting for event "${eventName}" on player ${this.username}`));
      }, timeoutMs);

      const handler = (data: any) => {
        cleanup();
        resolve({
          eventName,
          payload: data,
          receivedAt: performance.now(),
        });
      };

      const cleanup = () => {
        clearTimeout(timer);
        if (this.socket) {
          this.socket.off(eventName, handler);
        }
      };

      if (this.socket) {
        this.socket.once(eventName, handler);
      } else {
        clearTimeout(timer);
        reject(new Error('Socket is not initialized'));
      }
    });
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}
