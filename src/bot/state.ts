export interface BotStateSnapshot {
  connected: boolean;
  username: string;
  host: string;
  port: number;
  startTime: number;
  lastActivity: number;
  reconnectAttempts: number;
}

export class BotState {
  private snapshot: BotStateSnapshot;

  constructor(username: string, host: string, port: number) {
    this.snapshot = {
      connected: false,
      username,
      host,
      port,
      startTime: Date.now(),
      lastActivity: Date.now(),
      reconnectAttempts: 0,
    };
  }

  update(partial: Partial<BotStateSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...partial };
  }

  get(): BotStateSnapshot {
    return { ...this.snapshot };
  }
}
