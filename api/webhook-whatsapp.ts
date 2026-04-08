import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://kmtjfapbooqzhysllrbe.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0ODkwMDgsImV4cCI6MjA5MDA2NTAwOH0.eVy1GLS-DU74TUKPpIyCq8xTvGMxub1R2DIt4I3AEIw'
)

export default async function handler(req, res) {
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
            tenant_id: 'default', // TODO: Map instance to tenant
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
