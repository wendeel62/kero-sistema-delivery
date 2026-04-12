-- Refined trigger to ensure slug is always generated if missing
-- Fires on ANY update to configuracoes to handle cases where nome_loja didn't change but slug is still null.

CREATE OR REPLACE FUNCTION public.handle_config_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_base_slug text;
    v_final_slug text;
    v_counter integer := 1;
BEGIN
    -- Only generate if nome_loja is present
    IF NEW.nome_loja IS NULL OR NEW.nome_loja = '' THEN
        RETURN NEW;
    END IF;

    -- Generate base slug
    v_base_slug := slugify(NEW.nome_loja);
    
    -- If slug is already set and NOT equal to our generated base (meaning it's already customized or slugified)
    -- AND nome_loja hasn't changed, keep it.
    -- However, if slug is NULL, we MUST generate it.
    IF TG_OP = 'UPDATE' AND OLD.nome_loja = NEW.nome_loja AND NEW.slug IS NOT NULL THEN
        RETURN NEW;
    END IF;

    v_final_slug := v_base_slug;

    -- Check for uniqueness and append suffix if needed
    WHILE EXISTS (SELECT 1 FROM configuracoes WHERE slug = v_final_slug AND tenant_id != NEW.tenant_id) LOOP
        v_final_slug := v_base_slug || '-' || v_counter;
        v_counter := v_counter + 1;
    END LOOP;

    NEW.slug := v_final_slug;
    RETURN NEW;
END;
$$;

-- Change trigger to fire on ANY update
DROP TRIGGER IF EXISTS tr_config_slug ON public.configuracoes;
CREATE TRIGGER tr_config_slug
BEFORE INSERT OR UPDATE ON public.configuracoes
FOR EACH ROW EXECUTE FUNCTION public.handle_config_slug();

-- Aggressive backfill for anything still missing a slug
UPDATE public.configuracoes 
SET slug = slugify(nome_loja) 
WHERE slug IS NULL AND nome_loja IS NOT NULL;
