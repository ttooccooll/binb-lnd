import express from 'express';
import { Redis } from '@upstash/redis';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json());

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

// Room management
app.post('/api/rooms', async (req, res) => {
  const { name } = req.body;
  const roomId = Date.now().toString();

  await redis.hset(`room:${roomId}`, {
    id: roomId,
    name,
    inProgress: false,
    participants: '[]',
    currentSong: null
  });

  res.json({ id: roomId, name });
});

app.get('/api/rooms', async (req, res) => {
  const rooms = await redis.keys('room:*');
  const roomData = await Promise.all(
    rooms.map(key => redis.hgetall(key))
  );
  res.json(roomData);
});

app.post('/api/rooms/:roomId/join', async (req, res) => {
  const { roomId } = req.params;
  const { userId, username } = req.body;
  
  const room = await redis.hgetall(`room:${roomId}`);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  const participants = JSON.parse(room.participants || '[]');

  if (!participants.find(p => p.userId === userId)) {
    participants.push({ userId, username, score: 0 });
    await redis.hset(`room:${roomId}`, {
      ...room,
      participants: JSON.stringify(participants)
    });
  }

  
  res.json({ success: true });
});

export default app;
