# ADR-001: Usar Supabase como Backend

## Contexto

Precisamos de um backend rápido de implementar, com autenticação, banco de dados e Edge Functions para um sistema de gestão de restaurantes.

## Decisão

Usar Supabase como solução completa:
- PostgreSQL para banco de dados
- Row Level Security (RLS) para segurança multi-tenant
- Edge Functions para lógica server-side
- Auth para autenticação

## Alternativas Consideradas

- Firebase: Opção, mas preferimos SQL
- Node.js customizado: Mais trabalho
- Express + Prisma: Boa opção, mas Supabase é mais rápido

## Consequências

### Positivo
- Desenvolvimento rápido
- RLS nativo
- Realtime automático
- Edge Functions serverless

### Negativo
- Vendor lock-in
- Limitações em queries complexas

## Status

Aprovado - Implementado em produção