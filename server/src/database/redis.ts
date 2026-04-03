import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient>;

export async function initializeRedis() {
  redisClient = createClient({
    url: process.env.REDIS_URL,
  });

  redisClient.on('error', (err) => console.error('Redis error:', err));

  await redisClient.connect();
  console.log('Connected to Redis');
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
