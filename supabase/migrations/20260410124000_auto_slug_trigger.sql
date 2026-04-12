-- Function to slugify strings (remove accents, spaces to hyphens, lowercase)
CREATE OR REPLACE FUNCTION public.slugify(v_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  v_text := lower(v_text);
  v_text := translate(v_text, 'áàâãäåāăąaeéèêëēĕėęěiíìîïīĭįıoóòôõöøōŏőuúùûüūŭůűųyýÿçćĉċčďđĝğġģĥħjĵkķĺļľŀłńņňŉŋrŕŗřśŝşšțťŧŵŷźżž', 'aaaaaaaaaaeeeeeeeeeeiiiiiiiiioooooooooouuuuuuuuuuyyycccccddegggg hhjkklllllnnnn rrrrsssstttwyzzz');
  v_text := regexp_replace(v_text, '[^a-z0-9]', '-', 'g');
  v_text := regexp_replace(v_text, '-+', '-', 'g');
  v_text := trim(both '-' from v_text);
  RETURN v_text;
END;
$$;

-- Trigger function to handle slug generation
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
    
    -- If slug already matches and isn't null, and we're just updating other fields, don't change it
    -- (This prevents breaking links if someone just changes the delivery fee)
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

-- Apply trigger to configuracoes
DROP TRIGGER IF EXISTS tr_config_slug ON public.configuracoes;
CREATE TRIGGER tr_config_slug
BEFORE INSERT OR UPDATE OF nome_loja ON public.configuracoes
FOR EACH ROW EXECUTE FUNCTION public.handle_config_slug();

-- Backfill existing records
UPDATE public.configuracoes SET slug = slugify(nome_loja) WHERE slug IS NULL AND nome_loja IS NOT NULL;
