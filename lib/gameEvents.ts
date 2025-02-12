type GameEventHandler = (data: any) => void;

export class GameEvents {
  private eventSource: EventSource | null = null;
  private handlers: Map<string, GameEventHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.eventSource = new EventSource('/api/events');

    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'ping') return; // Ignore keepalive pings

      const handlers = this.handlers.get(data.type) || [];
      handlers.forEach(handler => handler(data));
    };

    this.eventSource.onerror = () => {
      this.eventSource?.close();
      this.reconnectAttempts++;
      // Exponential backoff for reconnection
      setTimeout(() => this.connect(), Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000));
    };

    this.eventSource.onopen = () => {
      this.reconnectAttempts = 0; // Reset reconnection attempts on successful connection
    };
  }

  public on(type: string, handler: GameEventHandler) {
    const handlers = this.handlers.get(type) || [];
    handlers.push(handler);
    this.handlers.set(type, handlers);
  }

  public off(type: string, handler: GameEventHandler) {
    const handlers = this.handlers.get(type) || [];
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
      this.handlers.set(type, handlers);
    }
  }

  public async makeGuess(roomId: string, guess: string) {
    const response = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, type: 'guess', guess })
    });

    if (!response.ok) {
      throw new Error('Failed to submit guess');
    }
  }

  public disconnect() {
    this.eventSource?.close();
    this.handlers.clear();
    this.reconnectAttempts = 0;
  }
}

export const gameEvents = new GameEvents();