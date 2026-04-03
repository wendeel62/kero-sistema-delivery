import { Request, Response } from 'express';
import { getPool } from '../database/postgres.js';
import { cacheSet } from '../database/redis.js';
import axios from 'axios';

const API_URL = process.env.EVOLUTION_API_URL || 'http://evolution-api:8080';
const API_KEY = process.env.EVOLUTION_API_KEY;

const evolutionAPI = axios.create({
  baseURL: API_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
});

export async function syncInstances(req: Request, res: Response) {
  try {
    const response = await evolutionAPI.get('/instance/fetchInstances');
    const pool = getPool();

    for (const instance of response.data.instances || []) {
      await pool.query(
        'INSERT INTO instances (instance_name, status) VALUES ($1, $2) ON CONFLICT (instance_name) DO UPDATE SET status = $2',
        [instance.instanceName, instance.status],
      );
    }

    await cacheSet('instances:list', response.data, 300);

    res.json({ synced: response.data.instances?.length || 0 });
  } catch (error: any) {
    console.error('Error syncing instances:', error.message);
    res.status(500).json({ error: error.message });
  }
}

export async function syncMessages(req: Request, res: Response) {
  try {
    const pool = getPool();
    const instances = await pool.query('SELECT instance_name FROM instances');

    let totalMessages = 0;

    for (const instance of instances.rows) {
      try {
        const response = await evolutionAPI.get(`/chat/messages/${instance.instance_name}`);
        totalMessages += response.data.messages?.length || 0;
      } catch (error) {
        console.error(`Error syncing messages for ${instance.instance_name}:`, error);
      }
    }

    res.json({ synced: totalMessages });
  } catch (error: any) {
    console.error('Error syncing messages:', error.message);
    res.status(500).json({ error: error.message });
  }
}

export async function syncContacts(req: Request, res: Response) {
  try {
    const pool = getPool();
    const instances = await pool.query('SELECT id, instance_name FROM instances');

    let totalContacts = 0;

    for (const instance of instances.rows) {
      try {
        const response = await evolutionAPI.get(`/chat/contacts/${instance.instance_name}`);

        for (const contact of response.data.contacts || []) {
          await pool.query(
            'INSERT INTO contacts (instance_id, phone_number, name) VALUES ($1, $2, $3) ON CONFLICT (phone_number) DO UPDATE SET name = $3',
            [instance.id, contact.id, contact.name],
          );
          totalContacts++;
        }
      } catch (error) {
        console.error(`Error syncing contacts for ${instance.instance_name}:`, error);
      }
    }

    res.json({ synced: totalContacts });
  } catch (error: any) {
    console.error('Error syncing contacts:', error.message);
    res.status(500).json({ error: error.message });
  }
}

export async function getSyncStatus(req: Request, res: Response) {
  try {
    const pool = getPool();

    const instances = await pool.query('SELECT COUNT(*) as count FROM instances');
    const messages = await pool.query('SELECT COUNT(*) as count FROM messages');
    const contacts = await pool.query('SELECT COUNT(*) as count FROM contacts');

    res.json({
      instances: parseInt(instances.rows[0].count),
      messages: parseInt(messages.rows[0].count),
      contacts: parseInt(contacts.rows[0].count),
      lastSync: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error getting sync status:', error.message);
    res.status(500).json({ error: error.message });
  }
}
