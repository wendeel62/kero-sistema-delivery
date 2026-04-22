// ==========================================
// CONSTANTES CENTRALIZADAS - PROJETO KERO
// ==========================================

// --------------------
// ROLES
// --------------------
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  GERENTE: 'gerente',
  ATENDENTE: 'atendente',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: 4,
  [ROLES.ADMIN]: 3,
  [ROLES.GERENTE]: 2,
  [ROLES.ATENDENTE]: 1,
} as const;

// --------------------
// STATUS DE PEDIDO
// --------------------
export const PEDIDO_STATUS = {
  NOVO: 'novo',
  EM_PREPARO: 'em_preparo',
  PRONTO: 'pronto',
  SAIU_ENTREGA: 'saiu_entrega',
  ENTREGUE: 'entregue',
  CANCELADO: 'cancelado',
} as const;

export const PEDIDO_STATUS_KANBAN = {
  NOVO: 'novo',
  EM_PREPARO: 'em_preparo',
  SAIU_ENTREGA: 'saiu_entrega',
  ENTREGUE: 'entregue',
  CANCELADO: 'cancelado',
} as const;

// --------------------
// STATUS GERAL
// --------------------
export const STATUS = {
  ATIVO: 'ativo',
  INATIVO: 'inativo',
  PENDENTE: 'pendente',
  CANCELADO: 'cancelado',
} as const;

// --------------------
// PERFIL DE CLIENTE
// --------------------
export const PERFIL_CLIENTE = {
  NOVO: 'novo',
  RECORRENTE: 'recorrente',
  VIP: 'vip',
} as const;

// --------------------
// CANAL DE PEDIDO
// --------------------
export const CANAL = {
  BALCAO: 'balcao',
  MESA: 'mesa',
  ENTREGA: 'entrega',
  TELEFONE: 'telefone',
  APP: 'app',
  IFOOD: 'ifood',
  RAPPI: 'rappi',
  WHATSAPP: 'whatsapp',
} as const;

// --------------------
// FORMA DE PAGAMENTO
// --------------------
export const FORMA_PAGAMENTO = {
  DINHEIRO: 'dinheiro',
  DEBITO: 'debito',
  CREDITO: 'credito',
  PIX: 'pix',
  IFOOD: 'ifood',
  RAPPI: 'rappi',
} as const;

// --------------------
// CONFIGURAÇÕES DE API
// --------------------
export const API_CONFIG = {
  TIMEOUT_MS: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
} as const;

// --------------------
// CONFIGURAÇÕES DE UI
// --------------------
export const UI_CONFIG = {
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEBOUNCE_MS: 300,
  TOAST_DURATION_MS: 5000,
  ANIMATION_DURATION_MS: 300,
} as const;

// --------------------
// MENSAGENS DE ERRO
// --------------------
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Você não tem permissão para acessar este recurso',
  NOT_FOUND: 'Recurso não encontrado',
  VALIDATION_ERROR: 'Dados inválidos',
  SERVER_ERROR: 'Erro no servidor. Tente novamente.',
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet.',
  REQUIRE_AUTH: 'É necessário fazer login para continuar.',
  TENANT_REQUIRED: 'Usuário não possui tenant associado.',
} as const;

// --------------------
// LABELS
// --------------------
export const LABELS = {
  LOADING: 'Carregando...',
  NO_DATA: 'Nenhum dado encontrado',
  SAVE: 'Salvar',
  CANCEL: 'Cancelar',
  DELETE: 'Excluir',
  EDIT: 'Editar',
  CREATE: 'Criar',
  SEARCH: 'Buscar...',
} as const;

// --------------------
// UNIDADES DE MEDIDA
// --------------------
export const UNIDADE_MEDIDA = {
  KG: 'kg',
  G: 'g',
  LT: 'lt',
  ML: 'ml',
  UN: 'un',
} as const;

// --------------------
// TAMANHOS DE PIZZA
// --------------------
export const TAMANHO_PIZZA = {
  PEQUENA: 'pequena',
  MEDIA: 'média',
  GRANDE: 'grande',
  GIGANTE: 'gigante',
} as const;