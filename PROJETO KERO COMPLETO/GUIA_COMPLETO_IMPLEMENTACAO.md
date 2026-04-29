Guia Completo de Implementacao
Plataforma SaaS de Gestao para Delivery
WhatsApp + IA Adaptativa + Mercado Pago OAuth + Anti-Ban
Versao 3.0 | 2026 | Para iniciantes — passo a passo completo

1. Visao Geral do Projeto
O KERO e um SaaS completo de gestao para restaurantes, bares e delivery. Cada cliente (tenant) possui painel admin proprio, cardapio digital publico, integracao com WhatsApp via IA, pagamentos automaticos via Mercado Pago OAuth e rastreamento de motoboys em tempo real.

Proposta de Valor
Cliente faz pedido pelo WhatsApp sem abrir nenhum app
IA processa o pedido e gera link de pagamento automatico via Mercado Pago
Dono do delivery recebe 100% via conta propria do Mercado Pago — voce nao toca no dinheiro
Painel admin em tempo real com pedidos, cardapio, financeiro e relatorios
Agente Consultor IA disponivel 24/7 com analises e sugestoes personalizadas
PWA instalavel no celular/PC com notificacoes push nativas
Rastreamento de motoboys em tempo real no mapa
Sistema de IA com 3 provedores e fallback automatico — zero downtime


2. Stack Tecnologica Completa

2.1 Frontend
Tecnologia
Status
React 19 + TypeScript 5.9 + Vite 8
Feito
Tailwind CSS 4 + shadcn/ui
Feito
React Router v7
Feito
React Query 5 (estado/cache)
Feito
React Hook Form + Zod (formularios)
Feito
Framer Motion 12 (animacoes)
Feito
Recharts 3 (graficos)
Feito
Leaflet + React-Leaflet (mapas)
Feito
Lucide React (icones)
Feito
PWA: Service Worker + Web Push (VAPID)
Faltando


2.2 Backend e Infraestrutura
Camada
Tecnologia
Custo
Banco de Dados
Supabase (PostgreSQL + Realtime)
Gratuito
Autenticacao
Clerk (ate 10k usuarios)
Gratuito
Imagens
Cloudflare R2
Gratis ate 10GB
VPS
Oracle Cloud ARM (4 CPU / 24GB RAM)
Forever Free
Gerenciador VPS
Easypanel + Docker
Gratis self-hosted
Automacao
N8N (self-hosted no Oracle Cloud)
Gratuito
WhatsApp
Evolution API Go (self-hosted)
Gratuito
IA Principal
Cerebras (Llama 4)
Gratis 1M tokens/dia
IA Pico
Cloudflare Workers AI (Llama 3)
Gratis 10k neurons/dia
IA Fallback
Groq API (Llama 3)
Gratis 14.400 req/dia
Cache / Historico IA
Upstash Redis
Gratuito
Pagamentos
Mercado Pago OAuth (conta do tenant)
Gratuito
DNS / Edge
Cloudflare
Gratuito
Deploy Frontend
Vercel
Gratuito
TOTAL MVP
—
So dominio ~R$40/ano



3. Arquitetura de IA Adaptativa — 3 Provedores
Esta e a parte mais inteligente do KERO. O sistema usa 3 provedores de IA de forma inteligente, garantindo que o WhatsApp NUNCA fique sem resposta, mesmo em horarios de pico com varios clientes simultaneos.

3.1 Logica de Funcionamento
O sistema tem dois modos de operacao: normal e pico. O N8N verifica o modo a cada mensagem e decide automaticamente qual IA usar.

Modo Normal (baixo trafego)
O Cerebras responde tudo sozinho. E o mais abundante: 1 milhao de tokens por dia gratuitamente.

Mensagem chega
      |
      v
Cerebras responde (30 req/min, 1M tokens/dia)

Modo Pico (alto trafego — varios clientes ao mesmo tempo)
Quando o Cerebras atinge 30 req/min, o Cloudflare entra para absorver o excedente. Os dois trabalham juntos, totalizando ate 300 req/min.

Mensagem chega
      |
      v
rpm_cerebras >= 30? (pico detectado)
  SIM -> Cloudflare absorve o excedente (ate 270 req/min a mais)
  NAO -> Cerebras responde normalmente

Fallback (quando qualquer um esgotar tokens/neurons)
Se o Cerebras esgotar 1M de tokens OU o Cloudflare esgotar 10k neurons, o Groq assume automaticamente todas as requisicoes ate a meia-noite UTC, quando os contadores resetam.

Cerebras esgotou 1M tokens? OU Cloudflare esgotou 10k neurons?
  SIM -> Groq assume tudo (30 req/min, 14.400 req/dia)
  NAO -> continua no modo normal ou pico

3.2 Capacidade Total Combinada
Cenario
Capacidade
Observacao
Dia normal (so Cerebras)
~3.000 conversas/dia
1M tokens dividido por ~330 tokens/conversa
Horario de pico (Cerebras + CF)
300 req/min combinados
Cerebras 30 + Cloudflare 270
Fallback ativo (Groq)
+14.400 req/dia
Entra quando os outros esgotam
TOTAL combinado do dia
~17.000+ conversas/dia
Mais que suficiente pro MVP


3.3 Contadores no Upstash Redis
O N8N usa o Upstash Redis para rastrear o uso de cada provedor em tempo real. Cada chave tem um TTL (tempo de vida) que zera automaticamente.

Chave Redis
O que guarda
TTL
ai:cerebras:tokens:YYYY-MM-DD
Tokens usados no Cerebras hoje
24 horas
ai:cloudflare:neurons:YYYY-MM-DD
Neurons usados no Cloudflare hoje
24 horas
ai:rpm:cerebras
Requisicoes feitas no ultimo minuto
60 segundos
ai:fallback:active
groq ou null (fallback ativo?)
24 horas



4. Sistema Anti-Ban — Delay Humanizado
Este e um dos recursos mais importantes do KERO para proteger o numero de WhatsApp dos seus clientes. Sem delay, o WhatsApp detecta respostas instantaneas como comportamento de bot e pode banir o numero permanentemente.

4.1 Por que isso e importante
O WhatsApp monitora o tempo entre receber e responder mensagens
Respostas instantaneas (menos de 1 segundo) sao um sinal classico de bot
Um numero banido significa perda total do canal de vendas do cliente
Com delay humanizado, o sistema parece um atendente humano real

4.2 Regras de Delay
Tipo de Resposta
Criterio
Delay Base
Variacao
Range Final
Curta
Menos de 300 caracteres
5 segundos
+/- 1 segundo aleatorio
4 a 6 segundos
Longa
300 ou mais caracteres
10 segundos
+/- 1 segundo aleatorio
8 a 12 segundos


A variacao aleatoria e essencial — se o delay fosse sempre exatamente 5s ou 10s, o WhatsApp ainda poderia detectar o padrao. Com variacao, cada resposta tem um tempo ligeiramente diferente, igual a um humano real.

4.3 Simulando Digitacao — Presence Composing
Alem do delay, o sistema envia o status 'digitando...' para o cliente durante todo o tempo de espera. Isso e feito via Evolution API com o comando sendPresence.

O cliente ve exatamente isso no WhatsApp durante o delay:

  [Nome do Delivery]
  digitando...          <- aparece por 5 ou 10 segundos

  [mensagem chega aqui]  <- parece 100% humano

4.4 Implementacao no N8N — Passo a Passo
Apos o node da IA gerar a resposta, adicione os seguintes nodes na sequencia:

Node 1: Function Node — Calcular Delay
Este node JavaScript calcula o delay baseado no tamanho da resposta:

// Pega a resposta gerada pela IA
const resposta = $json.resposta_ia;
const caracteres = resposta.length;

// Define delay base: curta = 5s, longa = 10s
const isLonga = caracteres >= 300;
const delayBase = isLonga ? 10000 : 5000;

// Adiciona variacao aleatoria de -1000ms a +1000ms
const variacao = Math.floor(Math.random() * 2000) - 1000;
const delayFinal = delayBase + variacao;

return [{
  json: {
    ...($json),
    delay_ms: delayFinal,
    tipo_resposta: isLonga ? 'longa' : 'curta',
    caracteres: caracteres
  }
}];

Node 2: HTTP Request — Enviar 'digitando...'
Chama a Evolution API para mostrar o status de digitacao ao cliente:

Metodo: POST
URL: https://api.seudominio.com/chat/sendPresence

Body (JSON):
{
  "number": "{{ $json.telefone }}",
  "options": {
    "presence": "composing",
    "delay": {{ $json.delay_ms }}
  }
}

Node 3: Wait Node — Aguardar o Delay
Pausa o fluxo pelo tempo calculado antes de enviar a mensagem real:

Tipo: Wait
Unidade: Milliseconds
Duracao: {{ $json.delay_ms }}

Node 4: HTTP Request — Enviar Mensagem
Envia a resposta real para o cliente via Evolution API:

Metodo: POST
URL: https://api.seudominio.com/message/sendText

Body (JSON):
{
  "number": "{{ $json.telefone }}",
  "text": "{{ $json.resposta_ia }}"
}

4.5 Fluxo Completo com Delay no N8N
#
Node
Tipo
O que faz
1
Webhook Entry
Webhook
Recebe mensagem da Evolution API
2
Extrair dados
Function
Extrai telefone, mensagem, tenant_id
3
Buscar historico
HTTP Request
Busca historico de conversa no Upstash Redis
4
Verificar modo IA
HTTP Request
Checa contadores Cerebras/CF/Groq no Upstash
5
Decidir provedor
IF / Switch
Cerebras, Cloudflare ou Groq?
6a
Cerebras AI
HTTP Request
Chama Cerebras (modo normal)
6b
Cloudflare AI
HTTP Request
Chama Cloudflare (modo pico)
6c
Groq API
HTTP Request
Chama Groq (fallback)
7
Atualizar contadores
HTTP Request
Incrementa contadores no Upstash
8
Salvar historico
HTTP Request
Salva conversa no Upstash (TTL 24h)
9
Calcular delay
Function
Define 5s ou 10s + variacao aleatoria
10
Enviar composing
HTTP Request
Manda 'digitando...' via Evolution API
11
Wait
Wait
Aguarda delay_ms milissegundos
12
IF pedido confirmado?
IF
IA confirmou o pedido?
13
Criar pedido
HTTP Request
Salva pedido no Supabase
14
Gerar link MP
HTTP Request
Chama Edge Function do Supabase
15
Enviar resposta
HTTP Request
Envia mensagem final via Evolution API



5. Sites para Cadastro (na ordem certa)
Cadastre-se nesses servicos antes de comecar a implementacao. Todos sao gratuitos.

#
Site
Para que serve
Gratuito?
1
oracle.com/cloud/free
VPS 4 CPU / 24GB RAM para sempre
Forever Free
2
cloudflare.com
DNS, R2 (imagens) e Workers AI
Sim
3
supabase.com
Banco de dados PostgreSQL
Sim
4
clerk.com
Autenticacao dos donos de delivery
Ate 10k usuarios
5
upstash.com
Redis: cache e historico da IA
Sim
6
cerebras.ai
IA principal — 1M tokens/dia
Sim
7
console.groq.com
IA fallback — 14.400 req/dia
Sim
8
mercadopago.com.br/developers
API de pagamentos OAuth
Sim
9
vercel.com
Deploy do frontend React
Sim
10
registro.br ou namecheap.com
Dominio (unico custo do projeto)
~R$40/ano



6. Fase 1 — Configurar VPS Oracle Cloud
Esta e a base de toda a infraestrutura. O Oracle Cloud oferece uma VPS ARM com 4 CPUs e 24GB de RAM gratuitamente para sempre — mais poderoso que a maioria dos servidores pagos.

6.1 Criar a instancia ARM
Acesse oracle.com/cloud/free e crie sua conta (pode pedir cartao, mas nao cobra)
Faca login no Oracle Cloud Console
Va em: Menu > Compute > Instances > Create Instance
Nome da instancia: kero-server
Em 'Image and shape', clique em 'Change image'
Selecione: Ubuntu 22.04 (Canonical)
Clique em 'Change shape'
Selecione: Ampere > VM.Standard.A1.Flex
Configure: OCPUs = 4 e Memory = 24 GB
Em 'Add SSH keys', gere ou importe sua chave SSH
Clique em Create — aguarde 2-3 minutos
Anote o IP publico da instancia (ex: 150.230.xxx.xxx)

6.2 Liberar portas no painel Oracle (Security List)
Sem isso, os servicos nao ficam acessiveis externamente.

Va em: Networking > Virtual Cloud Networks
Clique na sua VCN (criada automaticamente)
Clique em: Security Lists > Default Security List
Clique em: Add Ingress Rules
Adicione uma regra para cada porta abaixo:

Porta
Protocolo
Para que serve
22
TCP
SSH — acesso ao servidor
80
TCP
HTTP
443
TCP
HTTPS
3000
TCP
Easypanel (painel de controle)
5678
TCP
N8N (automacoes)
8080
TCP
Evolution API (WhatsApp)


6.3 Liberar portas no Ubuntu (firewall interno)
O Oracle tem dois firewalls: um externo (Security List, feito acima) e um interno no Ubuntu. Precisa liberar nos dois.

Conecte na VPS via SSH:
ssh ubuntu@SEU_IP_ORACLE

Execute os comandos um por um:
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 3000 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 5678 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 8080 -j ACCEPT
sudo apt install iptables-persistent -y
sudo netfilter-persistent save

6.4 Apontar dominio para a VPS
Compre seu dominio (ex: keroapp.com.br)
No painel do registro do dominio, substitua os nameservers pelos do Cloudflare
Aguarde ate 24h para propagar (geralmente menos de 1h)
No Cloudflare, va em DNS > Add Record:

Tipo
Nome
Valor
Proxy
A
@
SEU_IP_ORACLE
Sim (laranja)
A
n8n
SEU_IP_ORACLE
Sim (laranja)
A
api
SEU_IP_ORACLE
Sim (laranja)



7. Fase 2 — Instalar Easypanel
O Easypanel e uma interface visual para gerenciar Docker na sua VPS. Sem ele, voce precisaria digitar comandos complexos no terminal toda vez. Com ele, e so clicar.

7.1 Instalar
Com SSH na VPS, rode este unico comando:

curl -sSL https://easypanel.io/install.sh | sh

Aguarde 2-3 minutos. Depois acesso no navegador:
http://SEU_IP_ORACLE:3000

Crie sua conta admin. Guarde bem a senha.

7.2 Configurar dominio e SSL no Easypanel
Va em: Settings > Domain
Digite seu dominio principal (ex: keroapp.com.br)
Clique em Save
O Easypanel vai gerar certificado SSL automatico via Let's Encrypt
Aguarde 1-2 minutos e acesso https://SEU_DOMINIO:3000


8. Fase 3 — Subir Servicos no Easypanel

8.1 Subir o N8N
O N8N e o cerebro das automacoes. Ele conecta WhatsApp, IA e Supabase.

No Easypanel, clique em: + New Project
Nome do projeto: n8n
Clique em: Add Service > App
Preencha:

Campo
Valor
Nome
n8n
Imagem Docker
n8nio/n8n
Porta
5678
Dominio
n8n.seudominio.com


Va em Environment e adicione as variaveis:

N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=suasenhaforte123
N8N_HOST=n8n.seudominio.com
WEBHOOK_URL=https://n8n.seudominio.com

Clique em Deploy e aguarde 1-2 minutos
Acesse https://n8n.seudominio.com e faca login

8.2 Subir a Evolution API (WhatsApp)
Crie novo App no Easypanel
Preencha:

Campo
Valor
Nome
evolution
Imagem Docker
atendai/evolution-api:latest
Porta
8080
Dominio
api.seudominio.com


Variaveis de ambiente:

SERVER_URL=https://api.seudominio.com
AUTHENTICATION_TYPE=apikey
AUTHENTICATION_API_KEY=crie-uma-chave-secreta-aqui
QRCODE_LIMIT=30

Clique em Deploy

8.3 Conectar WhatsApp na Evolution API
Acesse: https://api.seudominio.com/manager
Clique em: Create Instance
Nome da instancia: delivery-nome-do-cliente (ex: delivery-pizzaria-sul)
Clique em Connect
Aparece um QR Code — escaneie com o WhatsApp do cliente (igual entrar no WhatsApp Web)
Quando aparecer 'Connected', o numero esta pronto
Anote o nome da instancia — voce vai usar no N8N

8.4 Configurar Webhook da Evolution API para o N8N
Na Evolution API Manager, clique na sua instancia
Va em: Webhooks > Add Webhook
Preencha:

URL: https://n8n.seudominio.com/webhook/whatsapp
Eventos: messages.upsert

Salve — agora toda mensagem que chegar sera enviada automaticamente pro N8N


9. Fase 4 — Configurar Supabase (Banco de Dados)
O Supabase sera usado SOMENTE como banco de dados (PostgreSQL). Autenticacao fica no Clerk, imagens no Cloudflare R2.

9.1 Criar o projeto
Acesse supabase.com e crie uma conta
Clique em: New Project
Nome: kero-production
Regiao: South America (sa-east-1)
Defina uma senha forte para o banco
Clique em Create Project — aguarde 2 minutos
Va em: Settings > API
Anote: Project URL e service_role key (nao compartilhe essa chave)

9.2 Criar as tabelas — rode no SQL Editor
Va em: SQL Editor > New Query. Cole e execute cada bloco abaixo separadamente.

Tabela: tenants (donos de delivery)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  whatsapp TEXT,
  slug TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

Tabela: mp_credentials (tokens do Mercado Pago)
CREATE TABLE mp_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

Tabela: products (cardapio)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  category TEXT,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

Tabela: orders (pedidos)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  status TEXT DEFAULT 'pending',
  total DECIMAL(10,2),
  mp_payment_id TEXT,
  mp_payment_link TEXT,
  ai_provider TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

Tabela: order_items (itens do pedido)
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL
);

Tabela: posicoes_motoboy (GPS em tempo real)
CREATE TABLE posicoes_motoboy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  motoboy_id UUID,
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  updated_at TIMESTAMP DEFAULT NOW()
);

Tabela: push_subscriptions (notificacoes PWA)
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  endpoint TEXT NOT NULL,
  p256dh TEXT,
  auth TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

9.3 Ativar Realtime para pedidos
Va em: Database > Replication
Ative o Realtime para a tabela orders
Isso permite o painel admin atualizar automaticamente sem precisar recarregar a pagina


10. Fase 5 — Configurar Clerk (Autenticacao)
O Clerk cuida do login dos donos de delivery. E gratis ate 10.000 usuarios. No futuro, pode ser migrado para Better Auth na propria VPS.

10.1 Criar aplicacao
Acesse clerk.com e crie uma conta
Clique em: Add application
Nome: KERO
Selecione: Email, Google (metodos de login)
Clique em Create Application
Va em: API Keys
Anote: Publishable Key e Secret Key

10.2 Configurar webhook para criar tenant
Va em: Webhooks > Add Endpoint
URL: https://seudominio.com/api/webhooks/clerk
Eventos: user.created
Salve e anote o Signing Secret

Quando um novo usuario se cadastra no Clerk, o webhook dispara e uma Edge Function do Supabase cria automaticamente o registro na tabela tenants com o clerk_user_id do usuario.

10.3 Instalar no frontend
npm install @clerk/clerk-react

No arquivo main.tsx:
import { ClerkProvider } from '@clerk/clerk-react'

<ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
  <App />
</ClerkProvider>

10.4 Regra critica para migracao futura
Para facilitar a migracao do Clerk para Better Auth no futuro, siga esta regra sempre:
SEMPRE salve o clerk_user_id na tabela tenants do Supabase
NUNCA use dados do Clerk como fonte de verdade — use o Supabase
Crie um hook customizado useCurrentTenant() que busca dados do Supabase

const useCurrentTenant = () => {
  const { userId } = useAuth() // unico uso do Clerk
  const [tenant, setTenant] = useState(null)
  useEffect(() => {
    if (userId) {
      supabase.from('tenants')
        .select('*')
        .eq('clerk_user_id', userId)
        .single()
        .then(({ data }) => setTenant(data))
    }
  }, [userId])
  return tenant
}


11. Fase 6 — Cloudflare R2 (Armazenamento de Imagens)
O R2 armazena as fotos dos produtos do cardapio. E gratuito ate 10GB e muito mais rapido que guardar imagens no Supabase.

No Cloudflare, va em: R2 Object Storage > Create Bucket
Nome do bucket: kero-images
Va em: Settings > Public Access > Allow Access
Copie o endpoint publico (ex: https://pub-xxx.r2.dev)
Va em: Manage R2 API Tokens > Create API Token
Permissoes: Object Read e Write
Anote: Access Key ID e Secret Access Key

Logica de upload de imagem
Quando o dono do delivery faz upload de foto de produto no painel admin:

Frontend envia a imagem para uma Edge Function do Supabase
Edge Function recebe, envia para o R2 via API
R2 retorna a URL publica da imagem
URL e salva no campo image_url da tabela products


12. Fase 7 — Upstash Redis (Cache e Historico da IA)
O Upstash Redis e usado para duas funcoes criticas: guardar o historico de conversa de cada cliente no WhatsApp (para a IA ter contexto) e controlar os contadores de uso das IAs.

Acesse upstash.com e crie uma conta
Clique em: Create Database
Tipo: Redis
Regiao: us-east-1 (ou sa-east-1 se disponivel)
Clique em Create
Anote: UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN

Estrutura das chaves Redis
Chave
O que guarda
TTL
chat:+5511999999999
Array JSON com historico da conversa do cliente
24 horas
ai:cerebras:tokens:2026-04-17
Tokens usados no Cerebras hoje
24 horas
ai:cloudflare:neurons:2026-04-17
Neurons usados no Cloudflare hoje
24 horas
ai:rpm:cerebras
Requisicoes feitas no ultimo minuto
60 segundos
ai:fallback:active
null ou 'groq' — fallback esta ativo?
24 horas



13. Fase 8 — Mercado Pago OAuth
Esta e a integracao de pagamentos. O modelo e OAuth por tenant: cada dono de delivery conecta a propria conta MP e recebe os pagamentos DIRETO na conta dele. Voce nao toca no dinheiro.

13.1 Criar aplicacao no portal de devs
Acesse: mercadopago.com.br/developers
Va em: Suas integracoes > Criar aplicacao
Nome: KERO Platform
Produto: Pagamentos online
Em Redirect URI coloque: https://seudominio.com/api/mp/callback
Salve e anote: Client ID e Client Secret

13.2 Fluxo OAuth — como o cliente conecta a conta MP
Dono do delivery acessa Configuracoes no painel KERO
Clica no botao 'Conectar Mercado Pago'
E redirecionado para a pagina de autorizacao do Mercado Pago
Faz login na conta MP dele e clica em Autorizar
MP redireciona de volta para https://seudominio.com/api/mp/callback
Edge Function do Supabase troca o codigo pelo access_token
Token salvo na tabela mp_credentials — pronto!

13.3 Codigo da Edge Function de callback
// supabase/functions/mp-callback/index.ts
const code = url.searchParams.get('code')
const tenantId = url.searchParams.get('state')

const response = await fetch('https://api.mercadopago.com/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_id: Deno.env.get('MP_CLIENT_ID'),
    client_secret: Deno.env.get('MP_CLIENT_SECRET'),
    code,
    grant_type: 'authorization_code',
    redirect_uri: 'https://seudominio.com/api/mp/callback'
  })
})
const { access_token, refresh_token } = await response.json()
await supabase.from('mp_credentials').upsert({
  tenant_id: tenantId,
  access_token,
  refresh_token
})

13.4 Como o link de pagamento e enviado pelo WhatsApp
Quando a IA confirma o pedido, o N8N chama uma Edge Function que cria o link automaticamente:

N8N detecta que pedido foi confirmado pela IA
Chama Edge Function: criar-pagamento
Edge Function busca o access_token do tenant na tabela mp_credentials
Cria preferencia de pagamento na API do MP com o token do tenant
MP retorna o init_point (link de pagamento)
N8N calcula o delay (resposta longa = 10s)
N8N envia 'digitando...' via Evolution API
Aguarda o delay
Envia a mensagem com o link para o cliente no WhatsApp

Exemplo de mensagem enviada ao cliente:
Perfeito! Seu pedido foi confirmado!

1x X-Burguer Duplo......R$ 28,00
1x Coca-Cola 350ml.....R$ 8,00
─────────────────────────────
Total: R$ 36,00

Pague aqui (Pix, cartao ou saldo MP):
https://mpago.la/xxxxxxx

Seu pedido entra na fila assim que o pagamento
for confirmado! Tempo estimado: 35 minutos


14. Fase 9 — Fluxo N8N Completo

14.1 System Prompt da IA
Este e o prompt que voce cola nos 3 nodes de IA (Cerebras, Cloudflare e Groq). E o mesmo para os tres.

Voce e um atendente simpatico do delivery {{nome_delivery}}.

CARDAPIO DISPONIVEL:
{{lista_produtos_json}}

REGRAS IMPORTANTES:
1. Seja breve, amigavel e use emojis com moderacao
2. Aceite APENAS itens que estao no cardapio acima
3. Confirme o pedido antes de finalizar
4. Quando o cliente confirmar, responda SOMENTE com este JSON:
   {"pedido_confirmado": true, "itens": [{"nome": "X", "qtd": 1, "preco": 0.00}], "total": 0.00}
5. Se o cliente perguntar algo fora do cardapio, redirecione gentilmente
6. Nunca invente precos ou produtos

14.2 Logica de decisao do provedor IA no N8N
Este e o codigo JavaScript do Function Node que decide qual IA usar:

// Busca contadores do Upstash (feito no node anterior)
const cerebrasTokens = parseInt($json.cerebras_tokens || 0);
const cloudfareNeurons = parseInt($json.cloudflare_neurons || 0);
const cerebrasRpm = parseInt($json.cerebras_rpm || 0);

// Limites
const CEREBRAS_LIMIT = 950000;  // 1M com margem de seguranca
const CF_LIMIT = 9500;          // 10k com margem de seguranca
const CEREBRAS_RPM = 28;        // 30 com margem de seguranca

// Fallback ativo? (um dos dois esgotou)
if (cerebrasTokens >= CEREBRAS_LIMIT || cloudfareNeurons >= CF_LIMIT) {
  return [{ json: { ...($json), provider: 'groq' } }];
}

// Pico? (Cerebras no limite de RPM)
if (cerebrasRpm >= CEREBRAS_RPM) {
  return [{ json: { ...($json), provider: 'cloudflare' } }];
}

// Normal: Cerebras
return [{ json: { ...($json), provider: 'cerebras' } }];


15. Fase 10 — Frontend React (Painel Admin)

15.1 Instalar dependencias
npm create vite@latest kero-admin -- --template react-ts
cd kero-admin
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npx shadcn@latest init
npm install @clerk/clerk-react
npm install @supabase/supabase-js

15.2 Modulos implementados
Modulo
Rota
Status
Dashboard (KPIs)
/dashboard
Feito
Pedidos (Kanban)
/pedidos
Feito
PDV
/pdv
Feito
Cardapio Admin
/cardapio-admin
Feito
Cardapio Online
/cardapio
Feito
Gestao de Mesas
/mesa/:numero
Feito
Clientes (CRM)
/clientes
Feito
Estoque
/estoque
Feito
Financeiro
/financeiro
Feito
Entregas + Mapa
/entregas
Feito
WhatsApp Inbox
/whatsapp
Parcial — integracao pendente
Cozinha (KDS)
/cozinha
Feito
App Motoboy
/motoboy
Feito — GPS pendente
Admin SaaS
/admin/*
Feito
Login / Auth
/login
Feito
Agente Consultor IA
Botao flutuante
Faltando
PWA + Push
—
Faltando
GPS Motoboys
/entregas + /motoboy
Faltando
Marketing / Pixels
/configuracoes
Faltando
Mercado Pago OAuth
/configuracoes
Faltando



16. Variaveis de Ambiente

16.1 Frontend (.env)
Variavel
Descricao
VITE_CLERK_PUBLISHABLE_KEY
Chave publica do Clerk
VITE_SUPABASE_URL
URL do projeto Supabase
VITE_SUPABASE_ANON_KEY
Chave anonima do Supabase
VITE_R2_PUBLIC_URL
URL publica do bucket Cloudflare R2
VITE_MP_CLIENT_ID
Client ID do Mercado Pago
VITE_VAPID_PUBLIC_KEY
Chave publica VAPID para push notifications


16.2 Supabase Edge Functions
Variavel
Descricao
MP_CLIENT_ID
Client ID do Mercado Pago
MP_CLIENT_SECRET
Client Secret do Mercado Pago
CLERK_SECRET_KEY
Chave secreta do Clerk (webhook)
UPSTASH_REDIS_REST_URL
URL REST do Upstash Redis
UPSTASH_REDIS_REST_TOKEN
Token do Upstash Redis
CEREBRAS_API_KEY
Chave da API do Cerebras
CLOUDFLARE_ACCOUNT_ID
Account ID do Cloudflare Workers AI
CLOUDFLARE_AI_TOKEN
Token da Cloudflare Workers AI
GROQ_API_KEY
Chave da Groq API (fallback)
R2_ACCESS_KEY_ID
Access Key do Cloudflare R2
R2_SECRET_ACCESS_KEY
Secret Key do Cloudflare R2
R2_BUCKET_NAME
Nome do bucket R2 (kero-images)
VAPID_PRIVATE_KEY
Chave privada VAPID para push
VAPID_EMAIL
Email para identificacao VAPID



17. Fluxo Completo de um Pedido — Ponta a Ponta
Etapa
O que acontece
Tecnologia
1
Cliente manda mensagem no WhatsApp do delivery
WhatsApp
2
Evolution API recebe e dispara webhook para o N8N
Evolution API Go
3
N8N busca historico da conversa no Upstash Redis
Upstash Redis
4
N8N verifica contadores: Cerebras tokens, Cloudflare neurons, RPM
Upstash Redis
5
N8N decide: Cerebras (normal), Cloudflare (pico) ou Groq (fallback)
N8N Function Node
6
IA processa com historico + cardapio do tenant
Cerebras / CF / Groq
7
N8N atualiza contadores e historico no Upstash (TTL 24h)
Upstash Redis
8
N8N calcula delay: curta=5s, longa=10s (+ variacao aleatoria)
N8N Function Node
9
N8N envia status 'digitando...' via Evolution API
Evolution API
10
N8N aguarda o delay calculado (anti-ban)
N8N Wait Node
11
Cliente confirma pedido — IA retorna JSON com itens e total
IA escolhida
12
N8N chama Edge Function para criar pedido no Supabase
Supabase Edge Function
13
Edge Function busca access_token MP do tenant
Supabase (mp_credentials)
14
Edge Function cria preferencia de pagamento no MP
Mercado Pago OAuth
15
N8N calcula novo delay (resposta longa com link = 10s)
N8N Function Node
16
N8N envia 'digitando...' novamente
Evolution API
17
N8N aguarda delay e envia link de pagamento no WhatsApp
Evolution API
18
Cliente paga via Pix, cartao ou saldo MP
Mercado Pago
19
MP dispara webhook para N8N confirmando pagamento
MP Webhook
20
N8N atualiza status do pedido para 'paid' no Supabase
Supabase
21
Painel admin atualiza em tempo real
Supabase Realtime
22
Push notification enviada ao dono do delivery
PWA Web Push
23
N8N envia alerta WhatsApp para o dono do delivery
Evolution API Go



18. Ordem de Implementacao — Passo a Passo Final
Prioridade
O que fazer
Tempo estimado
1 - CRITICO
Cadastrar em todos os sites da secao 5
1-2 horas
2 - CRITICO
Configurar VPS Oracle + liberar portas
2-3 horas
3 - CRITICO
Instalar Easypanel + configurar dominio + SSL
1-2 horas
4 - CRITICO
Subir N8N via Easypanel
30 minutos
5 - CRITICO
Subir Evolution API + conectar WhatsApp via QR
1 hora
6 - CRITICO
Configurar Cloudflare DNS + R2
1 hora
7 - CRITICO
Criar projeto Supabase + rodar SQL das tabelas
1 hora
8 - CRITICO
Configurar Clerk + webhook para criar tenant
1 hora
9 - CRITICO
Configurar Upstash Redis
30 minutos
10 - CRITICO
Configurar Cerebras + Groq (API keys)
30 minutos
11 - CRITICO
Implementar OAuth do Mercado Pago
3-4 horas
12 - CRITICO
Montar fluxo N8N com IA adaptativa + delay anti-ban
4-5 horas
13 - ALTA
Implementar PWA: manifest + Service Worker + push
6-8 horas
14 - ALTA
Implementar Agente Consultor IA (chat flutuante Groq)
8-10 horas
15 - ALTA
GPS motoboys em tempo real + links de rota
4-6 horas
16 - MEDIA
Modal Marketing: Pixel, GA4, UTMfy
3-4 horas
17 - MEDIA
Ficha Tecnica completa (CMV + margem)
4-5 horas
18 - BAIXA
Testes E2E e ajustes finais
4-6 horas
19 - FINAL
Deploy Vercel + onboarding primeiro cliente
1-2 horas


Tempo total estimado: 50-65 horas de desenvolvimento


19. Boas Praticas e Regras Criticas

19.1 Multi-Tenant — CRITICO
SEMPRE filtre por tenant_id em todas as queries. Sem o filtro, um tenant pode ver os dados de outro.

// CORRETO
supabase.from('pedidos').select('*').eq('tenant_id', tenantId)

// ERRADO — vaza dados de todos os tenants!
supabase.from('pedidos').select('*')

19.2 Anti-Ban WhatsApp — Regras do Delay
SEMPRE use delay antes de enviar mensagens (minimo 4 segundos)
SEMPRE envie 'digitando...' antes da mensagem
NUNCA envie mais de 1 mensagem por vez para o mesmo numero
NUNCA responda instantaneamente (menos de 3 segundos)
Adicione variacao aleatoria no delay para parecer mais humano

19.3 IA — Regras do Agente Consultor
NUNCA execute acoes (alterar preco, criar promocao) sem aprovacao explicita do dono
Sempre apresente: analise + proposta + botao Aprovar + botao Recusar
Logar todas as acoes aprovadas e recusadas na tabela historico_agente

19.4 Supabase Realtime
Use o hook useRealtime(tabela, callback) para subscricoes
Sempre cancele subscricao no cleanup: return () => channel.unsubscribe()
Nao misture polling com Realtime no mesmo modulo