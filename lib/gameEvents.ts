type GameEventHandler = (data: any) => void;

export class GameEvents {
  private eventSource: EventSource | null = null;
  private handlers: Map<string, GameEventHandler[]> = new Map();

  constructor() {
    this.connect();
  }

  private connect() {
    this.eventSource = new EventSource('/api/events');
    
    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const handlers = this.handlers.get(data.type) || [];
      handlers.forEach(handler => handler(data));
    };

    this.eventSource.onerror = () => {
      this.eventSource?.close();
      // Reconnect after a short delay
      setTimeout(() => this.connect(), 1000);
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
  }
}

export const gameEvents = new GameEvents();
