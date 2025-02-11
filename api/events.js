import { Redis } from '@upstash/redis';

export const config = {
  runtime: 'edge',
};

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

export default async function handler(req) {
  const headers = {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
  };

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };

      // Initial connection
      sendEvent({ type: 'connected' });

      // Setup Redis pub/sub for real-time updates
      const subscription = redis.subscribe('game-events', (message) => {
        sendEvent(JSON.parse(message));
      });

      // Handle connection close
      req.signal.addEventListener('abort', () => {
        subscription.unsubscribe();
      });
    }
  });

  return new Response(stream, { headers });
}
