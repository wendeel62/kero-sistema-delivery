import express from 'express';
import { Pool } from 'pg';
import axios from 'axios';
import { Server } from 'socket.io';

const app = express();
const server = require('http').createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'kero',
  password: process.env.DB_PASSWORD || 'kero_pass',
  database: process.env.DB_NAME || 'kero'
});

const EVO_API = process.env.EVO_API || 'http://evolution_api:8080';
const SOCKET_PORT = process.env.SOCKET_PORT || 3001;

// Middleware
app.use(express.json());

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join:tenant', async (tenantId) => {
    socket.join(`tenant:${tenantId}`);
    console.log(`Tenant ${tenantId} joined room`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// API Routes

// GET /api/whatsapp/devices - List devices
app.get('/api/whatsapp/devices', async (req, res) => {
  const { tenant_id } = req.query;
  try {
    const result = await pool.query(
      'SELECT * FROM whatsapp_devices WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenant_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/devices - Create new device
app.post('/api/whatsapp/devices', async (req, res) => {
  const { tenant_id, device_name } = req.body;
  const instance_name = `device_${Date.now()}`;
  
  try {
    // Insert device
    const result = await pool.query(
      `INSERT INTO whatsapp_devices (tenant_id, device_name, instance_name, state) 
       VALUES ($1, $2, $3, 'pending') RETURNING *`,
      [tenant_id, device_name, instance_name]
    );
    const device = result.rows[0];
    
    // Call Evolution API to create instance
    try {
      await axios.post(`${EVO_API}/instance/create`, {
        instanceName: instance_name
      });
    } catch (evoErr) {
      console.error('Evolution API error:', evoErr.message);
    }
    
    // Emit to socket
    io.to(`tenant:${tenant_id}`).emit('device:created', device);
    
    res.json(device);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/whatsapp/devices/:id/qr - Get QR code
app.get('/api/whatsapp/devices/:id/qr', async (req, res) => {
  const { id } = req.params;
  
  try {
    const device = await pool.query(
      'SELECT * FROM whatsapp_devices WHERE id = $1',
      [id]
    );
    
    if (device.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    const instance_name = device.rows[0].instance_name;
    
    // Get QR from Evolution API
    try {
      const evoRes = await axios.get(`${EVO_API}/instance/connect/${instance_name}`);
      const qr = evoRes.data?.qr?.code || evoRes.data?.qrcode;
      
      // Update device state
      await pool.query(
        `UPDATE whatsapp_devices SET qr_code = $1, qr_updated_at = NOW(), state = 'pending' WHERE id = $2`,
        [qr, id]
      );
      
      res.json({ qr_code: qr, state: 'pending' });
    } catch (evoErr) {
      res.json({ qr_code: device.rows[0].qr_code, state: device.rows[0].state });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/whatsapp/devices/:id/status - Get connection status
app.get('/api/whatsapp/devices/:id/status', async (req, res) => {
  const { id } = req.params;
  const tenant_id = req.query.tenant_id;
  
  try {
    const device = await pool.query(
      'SELECT * FROM whatsapp_devices WHERE id = $1 AND tenant_id = $2',
      [id, tenant_id]
    );
    
    if (device.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    const instance_name = device.rows[0].instance_name;
    
    // Get status from Evolution API
    try {
      const evoRes = await axios.get(`${EVO_API}/instance/connectionState/${instance_name}`);
      const state = evoRes.data?.state || device.rows[0].state;
      
      // Update device state if changed
      if (state !== device.rows[0].state) {
        await pool.query(
          'UPDATE whatsapp_devices SET state = $1, updated_at = NOW() WHERE id = $2',
          [state, id]
        );
        
        // Emit status change
        io.to(`tenant:${tenant_id}`).emit('device:status', { id, state });
      }
      
      res.json({ state, instance_name });
    } catch (evoErr) {
      res.json({ state: device.rows[0].state, instance_name });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/whatsapp/conversations - List conversations
app.get('/api/whatsapp/conversations', async (req, res) => {
  const { tenant_id, device_id } = req.query;
  
  try {
    let query = 'SELECT c.* FROM whatsapp_conversations c';
    let params = [];
    
    if (device_id) {
      query += ' JOIN whatsapp_devices d ON c.device_id = d.id WHERE d.id = $1 AND d.tenant_id = $2';
      params = [device_id, tenant_id];
    } else {
      query += ' JOIN whatsapp_devices d ON c.device_id = d.id WHERE d.tenant_id = $1';
      params = [tenant_id];
    }
    
    query += ' ORDER BY c.updated_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/whatsapp/conversations/:id/messages - Get messages
app.get('/api/whatsapp/conversations/:id/messages', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT * FROM whatsapp_messages WHERE conversation_id = $1 ORDER BY timestamp DESC LIMIT 100',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/send - Send message
app.post('/api/whatsapp/send', async (req, res) => {
  const { tenant_id, conversation_id, text } = req.body;
  
  try {
    // Get conversation
    const conv = await pool.query(
      'SELECT c.*, d.instance_name FROM whatsapp_conversations c JOIN whatsapp_devices d ON c.device_id = d.id WHERE c.id = $1 AND d.tenant_id = $2',
      [conversation_id, tenant_id]
    );
    
    if (conv.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    const { jid, instance_name } = conv.rows[0];
    
    // Send via Evolution API
    const evoRes = await axios.post(`${EVO_API}/message/sendText/${instance_name}`, {
      number: jid.replace('@s.whatsapp.net', ''),
      text
    });
    
    // Save message
    const msgResult = await pool.query(
      `INSERT INTO whatsapp_messages (device_id, conversation_id, message_id, direction, content, content_type, from_me, timestamp)
       VALUES ((SELECT device_id FROM whatsapp_conversations WHERE id = $1), $1, $2, 'out', $3, 'text', true, NOW()) RETURNING *`,
      [conversation_id, evoRes.data?.messageId || `msg_${Date.now()}`, text]
    );
    
    // Emit new message
    io.to(`tenant:${tenant_id}`).emit('message:new', msgResult.rows[0]);
    
    res.json(msgResult.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook from Evolution API
app.post('/webhook/evolution', async (req, res) => {
  const { event, session, message } = req.body;
  
  try {
    // Find device by instance_name
    const device = await pool.query(
      'SELECT id, tenant_id FROM whatsapp_devices WHERE instance_name = $1',
      [session]
    );
    
    if (device.rows.length === 0) {
      return res.json({ status: 'ok' });
    }
    
    const { id: device_id, tenant_id } = device.rows[0];
    
    if (message) {
      const jid = message.key?.remoteJid;
      const fromMe = message.key?.fromMe;
      
      if (jid && !fromMe) {
        // Get or create conversation
        let conv = await pool.query(
          'SELECT id FROM whatsapp_conversations WHERE device_id = $1 AND jid = $2',
          [device_id, jid]
        );
        
        let conversation_id;
        if (conv.rows.length === 0) {
          const newConv = await pool.query(
            `INSERT INTO whatsapp_conversations (device_id, jid, name)
             VALUES ($1, $2, $3) RETURNING id`,
            [device_id, jid, message.pushName || jid]
          );
          conversation_id = newConv.rows[0].id;
        } else {
          conversation_id = conv.rows[0].id;
        }
        
        // Save message
        const msgResult = await pool.query(
          `INSERT INTO whatsapp_messages (device_id, conversation_id, message_id, direction, content, content_type, from_me, timestamp)
           VALUES ($1, $2, $3, 'in', $4, $5, $6, NOW()) RETURNING *`,
          [device_id, conversation_id, message.id, message.content?.text || '', message.type || 'text', false]
        );
        
        // Emit to socket
        io.to(`tenant:${tenant_id}`).emit('message:new', msgResult.rows[0]);
      }
    }
    
    // Check connection state
    if (event === 'connection.update') {
      const state = message?.state;
      if (state === 'open' || state === 'close') {
        await pool.query(
          'UPDATE whatsapp_devices SET state = $1, updated_at = NOW() WHERE id = $2',
          [state, device_id]
        );
        
        io.to(`tenant:${tenant_id}`).emit('device:status', { id: device_id, state });
      }
    }
    
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.json({ status: 'error' });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`WhatsApp API running on port ${PORT}`);
});

export default app;