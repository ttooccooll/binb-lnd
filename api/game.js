import { Redis } from '@upstash/redis';

export const config = {
  runtime: 'edge',
};

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const data = await req.json();
  const { roomId, type, guess } = data;

  if (type === 'guess') {
    const room = await redis.hgetall(`room:${roomId}`);
    if (!room) {
      return new Response('Room not found', { status: 404 });
    }

    // Simple string comparison for guessing (you can enhance this logic)
    const currentSong = JSON.parse(room.currentSong || 'null');
    const isCorrect = currentSong && 
      (guess.toLowerCase() === currentSong.title.toLowerCase() ||
       guess.toLowerCase() === currentSong.artist.toLowerCase());

    // Publish the guess result
    await redis.publish('game-events', JSON.stringify({
      type: 'guess_result',
      roomId,
      correct: isCorrect,
      guess
    }));

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response('Invalid game action', { status: 400 });
}
