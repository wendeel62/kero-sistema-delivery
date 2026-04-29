-- Backfill slugs for all stores that don't have one
UPDATE public.configuracoes 
SET slug = public.slugify(nome_loja) 
WHERE slug IS NULL AND nome_loja IS NOT NULL;

-- Ensure all tenants have a configurations row (if somehow missing)
INSERT INTO public.configuracoes (tenant_id, nome_loja, slug)
SELECT DISTINCT tenant_id, 'Minha Loja', public.slugify('Minha Loja')
FROM public.produtos
WHERE tenant_id NOT IN (SELECT tenant_id FROM public.configuracoes)
ON CONFLICT (tenant_id) DO NOTHING;

-- Force update of existing slugs if they are empty
UPDATE public.configuracoes 
SET slug = public.slugify(nome_loja) 
WHERE slug = '';
