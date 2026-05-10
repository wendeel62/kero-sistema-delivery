-- Migration: Impressão térmica
-- Data: 2026-04-30
-- Descrição: Adicionar campos para configuração de impressão térmica

ALTER TABLE configuracoes
  ADD COLUMN IF NOT EXISTS impressao_automatica boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS largura_papel integer DEFAULT 80;