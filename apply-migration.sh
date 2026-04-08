#!/bin/bash

# Script para executar a migration de metas_faturamento no Supabase

echo "Executando migration para adicionar tenant_id e metas_faturamento..."

# Você pode executar isso via CLI do Supabase ou copiar o SQL direto no editor
# Para usar via CLI (requer supabase-cli instalado):
# supabase db push

# Para usar manualmente:
# 1. Acesse https://app.supabase.com/project/[seu-projeto-id]/sql/new
# 2. Copie os comandos do arquivo supabase/migrations/20260407_add_metas_faturamento.sql
# 3. Cole no editor SQL e execute

echo "Para executar via CLI: supabase db push"
echo "Ou copie o SQL em supabase/migrations/20260407_add_metas_faturamento.sql para o editor SQL do Supabase"
