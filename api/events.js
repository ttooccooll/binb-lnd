import { Redis } from '@upstash/redis';

export const config = {
  runtime: 'edge'
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
    'Access-Control-Allow-Origin': '*'
  };

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };

      // Initial connection
      sendEvent({ type: 'connected' });

      // Keep the connection alive with a ping every 30 seconds
      const interval = setInterval(() => {
        sendEvent({ type: 'ping' });
      }, 30000);

      // Clean up on close
      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
      });
    }
  });

  return new Response(stream, { headers });
}