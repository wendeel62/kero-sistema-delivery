import { Request, Response } from 'express';
import { getPool } from '../database/postgres.js';
import { cacheSet } from '../database/redis.js';

export async function syncInstances(req: Request, res: Response) {
  try {
    const pool = getPool();
    // SyncInstances agora é local - retorna status atual das instances do DB
    const result = await pool.query(`
      SELECT instance_name, status, qr_code, created_at, updated_at 
      FROM instances 
      ORDER BY updated_at DESC
    `);

    await cacheSet('instances:list', result.rows, 300);

    res.json({ 
      synced: result.rows.length,
      instances: result.rows 
    });
  } catch (error: any) {
    console.error('Error syncing instances:', error.message);
    res.status(500).json({ error: error.message });
  }
}

export async function syncMessages(req: Request, res: Response) {
  try {
    const pool = getPool();
    const result = await pool.query(`
      SELECT COUNT(*) as count FROM messages 
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    const totalMessages = parseInt(result.rows[0].count);

    res.json({ synced: totalMessages });
  } catch (error: any) {
    console.error('Error syncing messages:', error.message);
    res.status(500).json({ error: error.message });
  }
}

export async function syncContacts(req: Request, res: Response) {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT COUNT(*) as count FROM contacts');
    const totalContacts = parseInt(result.rows[0].count);

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

