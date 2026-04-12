import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'your-verify-token-here'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify']
    const challenge = req.query['hub.challenge']

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified successfully')
      res.status(200).send(challenge)
    } else {
      res.status(403).json({ error: 'Verification failed' })
    }
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const payload = req.body
    const event = payload.event

    if (event === 'MESSAGES_UPSERT') {
      const messages = payload.data?.messages || []

      for (const msg of messages) {
        const msgKey = msg.key
        const numero = msgKey?.remoteJid?.replace('@s.whatsapp.net', '').replace('@g.us', '')
        const conteudo = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''

        if (numero && conteudo && msgKey?.fromMe === false) {
          await supabase.from('mensagens_whatsapp').insert({
            tenant_id: payload.instance_id || 'default',
            contato_telefone: numero,
            contato_nome: msg.pushName || null,
            direcao: 'recebida',
            conteudo: conteudo,
            lida: false,
          })
        }
      }
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}