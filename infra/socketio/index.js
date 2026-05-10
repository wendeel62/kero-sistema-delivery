const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client } = require('pg');
const redis = require('redis');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const db = new Client({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'kero',
  password: process.env.DB_PASSWORD || 'kero_pass',
  database: process.env.DB_NAME || 'kero'
});

const redisClient = redis.createClient({
  url: `redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || 6379}`
});

redisClient.on('error', err => console.log('Redis Error', err));

async function start() {
  await db.connect();
  await redisClient.connect();
  
  io.on('connection', socket => {
    console.log('Client connected:', socket.id);
    
    socket.on('join:tenant', async tenantId => {
      socket.join(`tenant:${tenantId}`);
      await redisClient.hSet(`wa:tenant:${tenantId}:sockets`, socket.id, 'active');
      console.log(`Tenant ${tenantId} joined`);
    });
    
    socket.on('message:send', async data => {
      const { conversationId, message, tenantId } = data;
      await redisClient.hIncrBy(`wa:tenant:${tenantId}:messages`, conversationId, 1);
      io.to(`tenant:${tenantId}`).emit('message:new', message);
    });
    
    socket.on('disconnect', async () => {
      console.log('Client disconnected:', socket.id);
      // Clean up Redis when socket disconnects
      for (const [tenantId] of socket.rooms) {
        if (tenantId.startsWith('tenant:')) {
          const actualTenantId = tenantId.replace('tenant:', '');
          try {
            await redisClient.hDel(`wa:tenant:${actualTenantId}:sockets`, socket.id);
          } catch (err) {
            console.error('Redis cleanup error:', err);
          }
        }
      }
    });
  });

  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => console.log(`Socket.io running on port ${PORT}`));
}

start().catch(console.error);