import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient> | null = null;

export async function initializeRedis() {
  if (!process.env.REDIS_URL) {
    console.log('Redis URL not found, skipping initialization (running in local-memory mode)');
    return;
  }
  
  redisClient = createClient({
    url: process.env.REDIS_URL,
  });

  redisClient.on('error', (err) => {
    console.error('Redis error:', err);
    redisClient = null;
  });

  try {
    await redisClient.connect();
    console.log('Connected to Redis');
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
    redisClient = null;
  }
}

export function getRedisClient() {
  return redisClient;
}

export async function cacheSet(key: string, value: any, ttl: number = 3600) {
  await redisClient.setEx(key, ttl, JSON.stringify(value));
}

export async function cacheGet(key: string) {
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

export async function cacheDel(key: string) {
  await redisClient.del(key);
}
