import axios from 'axios';
import { Request, Response } from 'express';
import { getPool } from '../database/postgres.js';
import { cacheSet, cacheGet } from '../database/redis.js';

const API_URL = process.env.EVOLUTION_API_URL || 'http://evolution-api:8080';
const API_KEY = process.env.EVOLUTION_API_KEY;

const evolutionAPI = axios.create({
  baseURL: API_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
});

export async function createInstance(req: Request, res: Response) {
  try {
    const { instanceName } = req.body;

    if (!instanceName) {
      return res.status(400).json({ error: 'instanceName is required' });
    }

    const response = await evolutionAPI.post('/instance/create', {
      instanceName,
      qrcode: true,
    });

    const pool = getPool();
    await pool.query(
      'INSERT INTO instances (instance_name, status) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [instanceName, 'pending'],
    );

    await cacheSet(`instance:${instanceName}`, response.data);

    res.json(response.data);
  } catch (error: any) {
    console.error('Error creating instance:', error.message);
    res.status(500).json({ error: error.message });
  }
}

export async function listInstances(req: Request, res: Response) {
  try {
    const cached = await cacheGet('instances:list');
    if (cached) {
      return res.json(cached);
    }

    const response = await evolutionAPI.get('/instance/fetchInstances');

    await cacheSet('instances:list', response.data, 300);

    res.json(response.data);
  } catch (error: any) {
    console.error('Error listing instances:', error.message);
    res.status(500).json({ error: error.message });
  }
}

export async function getInstanceDetails(req: Request, res: Response) {
  try {
    const { instanceName } = req.params;

    const cached = await cacheGet(`instance:${instanceName}`);
    if (cached) {
      return res.json(cached);
    }

    const response = await evolutionAPI.get(`/instance/fetchInstances/${instanceName}`);

    await cacheSet(`instance:${instanceName}`, response.data);

    res.json(response.data);
  } catch (error: any) {
    console.error('Error fetching instance:', error.message);
    res.status(500).json({ error: error.message });
  }
}

export async function deleteInstance(req: Request, res: Response) {
  try {
    const { instanceName } = req.params;

    const response = await evolutionAPI.delete(`/instance/delete/${instanceName}`);

    const pool = getPool();
    await pool.query('DELETE FROM instances WHERE instance_name = $1', [instanceName]);

    await cacheSet(`instance:${instanceName}`, null);

    res.json(response.data);
  } catch (error: any) {
    console.error('Error deleting instance:', error.message);
    res.status(500).json({ error: error.message });
  }
}

export async function sendMessage(req: Request, res: Response) {
  try {
    const { instanceName, number, message } = req.body;

    if (!instanceName || !number || !message) {
      return res.status(400).json({
        error: 'instanceName, number, and message are required',
      });
    }

    const response = await evolutionAPI.post(`/message/sendText/${instanceName}`, {
      number,
      text: message,
    });

    const pool = getPool();
    const instance = await pool.query(
      'SELECT id FROM instances WHERE instance_name = $1',
      [instanceName],
    );

    if (instance.rows.length > 0) {
      await pool.query(
        'INSERT INTO messages (instance_id, phone_number, message_text, direction, status) VALUES ($1, $2, $3, $4, $5)',
        [instance.rows[0].id, number, message, 'outgoing', 'sent'],
      );
    }

    res.json(response.data);
  } catch (error: any) {
    console.error('Error sending message:', error.message);
    res.status(500).json({ error: error.message });
  }
}

export async function handleWebhook(req: Request, res: Response) {
  try {
    const { event, data, instance } = req.body;
    
    // We only care about new messages for now
    if (event !== 'MESSAGES_UPSERT' || !data || !data.messages || data.messages.length === 0) {
      return res.json({ success: true, ignored: true });
    }

    const pool = getPool();
    const instanceName = instance;
    const msg = data.messages[0];
    const remoteJid = msg.key.remoteJid;
    
    // Extract message content safely
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const fromMe = msg.key.fromMe || false;
    const phoneNumber = remoteJid.split('@')[0];

    const instanceResult = await pool.query(
      'SELECT id FROM instances WHERE instance_name = $1',
      [instanceName],
    );

    if (instanceResult.rows.length > 0 && messageText) {
      await pool.query(
        'INSERT INTO messages (instance_id, phone_number, message_text, direction, status) VALUES ($1, $2, $3, $4, $5)',
        [instanceResult.rows[0].id, phoneNumber, messageText, fromMe ? 'outgoing' : 'incoming', 'received'],
      );
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error handling webhook:', error.message);
    res.status(500).json({ error: error.message });
  }
}
