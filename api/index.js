import { Redis } from '@upstash/redis';

export const config = {
  runtime: 'edge',
};

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

export default async function handler(req) {
  if (req.method === 'POST' && req.url.includes('/api/rooms')) {
    try {
      const { name } = await req.json();
      const roomId = Date.now().toString();

      await redis.hset(`room:${roomId}`, {
        id: roomId,
        name,
        inProgress: false,
        participants: '[]',
        currentSong: null
      });

      return new Response(JSON.stringify({ id: roomId, name }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to create room' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  if (req.method === 'GET' && req.url.includes('/api/rooms')) {
    try {
      const rooms = await redis.keys('room:*');
      const roomData = await Promise.all(
        rooms.map(key => redis.hgetall(key))
      );

      return new Response(JSON.stringify(roomData), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to fetch rooms' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  if (req.method === 'POST' && req.url.includes('/api/rooms/:roomId/join')) {
    try {
      const { roomId } = req.url.match(/\/api\/rooms\/(\d+)/)[1];
      const { userId, username } = await req.json();

      const room = await redis.hgetall(`room:${roomId}`);
      if (!room) {
        return new Response(JSON.stringify({ error: 'Room not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }

      const participants = JSON.parse(room.participants || '[]');
      if (!participants.find(p => p.userId === userId)) {
        participants.push({ userId, username, score: 0 });

        await redis.hset(`room:${roomId}`, {
          ...room,
          participants: JSON.stringify(participants)
        });
      }

      return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to join room' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  return new Response('Not found', { status: 404 });
}