-- Migration: Tracking IDs
-- Data: 2026-04-30
-- Descrição: Adicionar campos para configuração de tracking e analytics

ALTER TABLE configuracoes
  ADD COLUMN IF NOT EXISTS meta_pixel_id text,
  ADD COLUMN IF NOT EXISTS ga4_measurement_id text,
  ADD COLUMN IF NOT EXISTS utmfy_token text;