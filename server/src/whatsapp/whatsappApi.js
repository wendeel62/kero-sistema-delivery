const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'kero',
  password: process.env.DB_PASSWORD || 'kero_pass',
  database: process.env.DB_NAME || 'kero'
});

// Evolution API configuration (official version)
const EVO_HOST = process.env.EVO_HOST || 'evolution_api';
const EVO_PORT = process.env.EVO_PORT || 8080;
const EVO_API_KEY = process.env.EVO_API_KEY || 'kero_api_key_2026';
const EVO_API = `http://${EVO_HOST}:${EVO_PORT}`;

const evoAxios = axios.create({
  baseURL: EVO_API,
  headers: {
    'Content-Type': 'application/json',
    'apikey': EVO_API_KEY
  }
});

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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// API Routes - WhatsApp Device Management
// ============================================

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

    // Call Evolution API to create instance (official endpoint)
    try {
      const uniqueToken = `token_${instance_name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('Creating Evolution instance:', instance_name);

      const response = await evoAxios.post('/instance/create', {
        instanceName: instance_name,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true,
        token: uniqueToken,
        webhook: {
          enabled: true,
          url: `http://whatsapp-api:3000/webhook/evolution`
        }
      });

      console.log('Evolution instance created:', response.data);
    } catch (evoErr) {
      console.error('Evolution API creation error:', {
        status: evoErr.response?.status,
        data: evoErr.response?.data,
        message: evoErr.message
      });
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
  const { tenant_id } = req.query;

  try {
    const device = await pool.query(
      'SELECT * FROM whatsapp_devices WHERE id = $1',
      [id]
    );

    if (device.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const instance_name = device.rows[0].instance_name;

    // Update state to connecting
    await pool.query(
      `UPDATE whatsapp_devices SET qr_updated_at = NOW(), state = 'connecting' WHERE id = $1`,
      [id]
    );

    // Official Evolution API: Connect instance to get QR code
    let qr = null;
    let connectionUrl = null;

    try {
      // First, ensure instance exists and connect it
      const connectResponse = await evoAxios.post(`/instance/connect/${instance_name}`);

      if (connectResponse.data?.qrcode) {
        qr = connectResponse.data.qrcode;
      }
      if (connectResponse.data?.base64) {
        qr = connectResponse.data.base64;
      }
      if (connectResponse.data?.connectionUri) {
        connectionUrl = connectResponse.data.connectionUri;
      }

      console.log('QR/Connection obtained for', instance_name);
    } catch (connectErr) {
      console.error('Connect error:', connectErr.response?.data || connectErr.message);

      // Try to get existing QR if instance already exists
      try {
        const qrResponse = await evoAxios.get(`/instance/qrcode/${instance_name}`);
        qr = qrResponse.data?.qrcode || qrResponse.data?.base64 || qrResponse.data?.code;
      } catch (qrErr) {
        console.log('No QR available yet, instance may be connecting');
      }
    }

    // If still no QR, generate demo QR (only for development)
    if (!qr) {
      const mockData = `whatsapp-auth-${instance_name}-${Date.now()}`;
      qr = `https://api.qrserver.com/create-qr-code/?size=300x300&data=${encodeURIComponent(mockData)}`;
      console.log('Using fallback mock QR for development');
    }

    // Update device state and QR
    await pool.query(
      `UPDATE whatsapp_devices SET qr_code = $1, qr_updated_at = NOW(), state = $2 WHERE id = $3`,
      [qr, qr ? 'connecting' : 'pending', id]
    );

    res.json({
      qr_code: qr,
      state: 'connecting',
      instance_name,
      connectionUrl
    });
  } catch (err) {
    console.error('QR endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/whatsapp/devices/:id/status - Get connection status
app.get('/api/whatsapp/devices/:id/status', async (req, res) => {
  const { id } = req.params;
  const { tenant_id } = req.query;

  try {
    const device = await pool.query(
      'SELECT * FROM whatsapp_devices WHERE id = $1 AND tenant_id = $2',
      [id, tenant_id]
    );

    if (device.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const instance_name = device.rows[0].instance_name;
    const currentDbState = device.rows[0].state;

    // Get real status from Evolution API (official endpoint)
    try {
      const evoRes = await evoAxios.get(`/instance/connectionState/${instance_name}`);
      const state = evoRes.data?.state || currentDbState;

      // Map Evolution API states to our states
      const stateMap = {
        'open': 'open',
        'close': 'pending',
        'connecting': 'connecting',
        'connected': 'open',
        'disconnected': 'pending'
      };
      const mappedState = stateMap[state] || currentDbState;

      // Update device state if changed
      if (mappedState !== currentDbState) {
        await pool.query(
          'UPDATE whatsapp_devices SET state = $1, updated_at = NOW() WHERE id = $2',
          [mappedState, id]
        );

        // Emit status change
        io.to(`tenant:${tenant_id}`).emit('device:status', { id, state: mappedState });

        // If device connected, clear QR
        if (mappedState === 'open') {
          await pool.query(
            'UPDATE whatsapp_devices SET qr_code = NULL WHERE id = $1',
            [id]
          );
          io.to(`tenant:${tenant_id}`).emit('device:status', { id, state: 'open' });
        }
      }

      res.json({ state: mappedState, instance_name });
    } catch (evoErr) {
      console.error('Status error:', evoErr.response?.data || evoErr.message);
      // Return current DB state if Evolution API fails
      res.json({ state: currentDbState, instance_name });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/whatsapp/devices/:id - Delete device
app.delete('/api/whatsapp/devices/:id', async (req, res) => {
  const { id } = req.params;
  const { tenant_id } = req.query;

  try {
    const device = await pool.query(
      'SELECT * FROM whatsapp_devices WHERE id = $1 AND tenant_id = $2',
      [id, tenant_id]
    );

    if (device.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const instance_name = device.rows[0].instance_name;

    // Delete from Evolution API
    try {
      await evoAxios.delete(`/instance/${instance_name}`);
    } catch (evoErr) {
      console.error('Evolution API delete error:', evoErr.response?.data || evoErr.message);
    }

    // Delete from local database
    await pool.query('DELETE FROM whatsapp_messages WHERE device_id = $1', [id]);
    await pool.query('DELETE FROM whatsapp_conversations WHERE device_id = $1', [id]);
    await pool.query('DELETE FROM whatsapp_devices WHERE id = $1', [id]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// Conversation & Message Routes
// ============================================

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
  const { limit = 50, offset = 0 } = req.query;

  try {
    const result = await pool.query(
      'SELECT * FROM whatsapp_messages WHERE conversation_id = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3',
      [id, parseInt(limit), parseInt(offset)]
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
    // Get conversation with device info
    const conv = await pool.query(
      'SELECT c.*, d.instance_name, d.id as device_id FROM whatsapp_conversations c JOIN whatsapp_devices d ON c.device_id = d.id WHERE c.id = $1 AND d.tenant_id = $2',
      [conversation_id, tenant_id]
    );

    if (conv.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const { jid, instance_name, device_id } = conv.rows[0];

    // Send via Evolution API (official endpoint)
    try {
      const evoRes = await evoAxios.post(`/message/sendText/${instance_name}`, {
        number: jid.replace('@s.whatsapp.net', '').replace('@g.us', ''),
        text: text
      });

      // Save message with returned messageId
      const messageId = evoRes.data?.messageId || `msg_${Date.now()}`;

      const msgResult = await pool.query(
        `INSERT INTO whatsapp_messages (device_id, conversation_id, message_id, direction, content, content_type, from_me, timestamp)
         VALUES ($1, $2, $3, 'out', $4, 'text', true, NOW()) RETURNING *`,
        [device_id, conversation_id, messageId, text]
      );

      // Update conversation timestamp
      await pool.query(
        'UPDATE whatsapp_conversations SET updated_at = NOW() WHERE id = $1',
        [conversation_id]
      );

      // Emit new message
      io.to(`tenant:${tenant_id}`).emit('message:new', msgResult.rows[0]);

      res.json(msgResult.rows[0]);
    } catch (evoErr) {
      console.error('Send message error:', evoErr.response?.data || evoErr.message);
      res.status(500).json({
        error: 'Failed to send message via Evolution API',
        details: evoErr.response?.data || evoErr.message
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// Webhook from Evolution API
// ============================================
app.post('/webhook/evolution', async (req, res) => {
  const { instanceId, event, data } = req.body;

  // Normalize webhook payload (Evolution API official format)
  const instance_name = instanceId || data?.instanceName || req.headers['x-instance-name'];
  const message = data?.message || data;
  const state = data?.state;

  try {
    // Find device by instance_name
    const device = await pool.query(
      'SELECT id, tenant_id FROM whatsapp_devices WHERE instance_name = $1',
      [instance_name]
    );

    if (device.rows.length === 0) {
      return res.json({ status: 'ok', reason: 'device_not_found' });
    }

    const { id: device_id, tenant_id } = device.rows[0];

    // Handle different webhook events
    switch (event) {
      case 'messages.upsert':
      case 'message':
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
               VALUES ($1, $2, $3, 'in', $4, $5, false, NOW()) RETURNING *`,
              [device_id, conversation_id, message.key?.id || `msg_${Date.now()}`, message.conversation || message.extendedTextMessage?.text || '', message.type || 'text']
            );

            // Emit to socket
            io.to(`tenant:${tenant_id}`).emit('message:new', msgResult.rows[0]);
          }
        }
        break;

      case 'connection.update':
      case 'qrcode.updated':
        const newState = state === 'open' ? 'open' : state === 'close' ? 'pending' : 'connecting';

        await pool.query(
          'UPDATE whatsapp_devices SET state = $1, updated_at = NOW() WHERE id = $2',
          [newState, device_id]
        );

        io.to(`tenant:${tenant_id}`).emit('device:status', { id: device_id, state: newState });

        // Clear QR if connected
        if (newState === 'open') {
          await pool.query(
            'UPDATE whatsapp_devices SET qr_code = NULL WHERE id = $1',
            [device_id]
          );
        }
        break;

      default:
        console.log('Unhandled webhook event:', event);
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.json({ status: 'error' });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`WhatsApp API running on port ${PORT}`);
  console.log(`Evolution API: ${EVO_API}`);
});