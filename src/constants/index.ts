// ==========================================
// CONSTANTES CENTRALIZADAS - PROJETO KERO
// ==========================================

// --------------------
// ROLES — Single Source of Truth
// Must match database enum in user_roles.role
// --------------------
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  GERENTE: 'gerente',
  ATENDENTE: 'atendente',
  CAIXA: 'caixa',
  COZINHEIRO: 'cozinheiro',
  ENTREGADOR: 'entregador',
  MOTOBOY: 'motoboy',
  CLIENTE: 'cliente',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const ROLE_HIERARCHY: Record<Role, number> = {
  [ROLES.SUPER_ADMIN]: 9,
  [ROLES.ADMIN]: 8,
  [ROLES.GERENTE]: 7,
  [ROLES.ATENDENTE]: 5,
  [ROLES.CAIXA]: 5,
  [ROLES.COZINHEIRO]: 4,
  [ROLES.ENTREGADOR]: 3,
  [ROLES.MOTOBOY]: 3,
  [ROLES.CLIENTE]: 1,
} as const;

// --------------------
// STATUS DE PEDIDO
// --------------------
export const PEDIDO_STATUS = {
  NOVO: 'novo',
  CONFIRMADO: 'confirmado',
  EM_PREPARO: 'em_preparo',
  PRONTO: 'pronto',
  SAIU_ENTREGA: 'saiu_entrega',
  ENTREGUE: 'entregue',
  CANCELADO: 'cancelado',
  AGUARDANDO_PAGAMENTO: 'aguardando_pagamento',
} as const;

export const PEDIDO_STATUS_KANBAN = {
  NOVO: 'novo',
  EM_PREPARO: 'em_preparo',
  PRONTO: 'pronto',
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
// STATUS DE MESA
// --------------------
export const MESA_STATUS = {
  LIVRE: 'livre',
  OCUPADA: 'ocupada',
  AGUARDANDO_PAGAMENTO: 'aguardando_pagamento',
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
} as const;

// --------------------
// FORMA DE PAGAMENTO
// --------------------
export const FORMA_PAGAMENTO = {
  DINHEIRO: 'dinheiro',
  DEBITO: 'debito',
  CREDITO: 'credito',
  PIX: 'pix',
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

// --------------------
// LOCAL STORAGE KEYS
// --------------------
export const STORAGE_KEYS = {
  THEME: 'kero_theme',
  CART: 'kero_cart',
  SIDEBAR_COLLAPSED: 'kero_sidebar_collapsed',
} as const;

// --------------------
// ALERTAS DE ESTOQUE
// --------------------
export const ESTOQUE_CONFIG = {
  ALERTA_VENCIMENTO_DIAS: 7,
} as const;
