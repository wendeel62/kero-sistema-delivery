import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function FixRLSPage() {
  const [status, setStatus] = useState<'idle' | 'success'>('idle')
  const navigate = useNavigate()

  const sqlCode = `-- Copie este SQL e execute no Supabase SQL Editor
-- https://kmtjfapbooqzhysllrbe.supabase.co

-- 1. Drop policies antigas
DROP POLICY IF EXISTS produtos_tenant_insert ON public.produtos;
DROP POLICY IF EXISTS produtos_tenant_select ON public.produtos;
DROP POLICY IF EXISTS produtos_tenant_update ON public.produtos;
DROP POLICY IF EXISTS produtos_tenant_delete ON public.produtos;

-- 2. Nova função app.current_tenant_id()
CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (NULLIF(auth.jwt() ->> 'tenant_id', ''))::uuid,
    (SELECT ur.tenant_id FROM public.user_roles ur 
     WHERE ur.user_id = auth.uid() AND ur.tenant_id IS NOT NULL 
     AND ur.role IN ('admin', 'super_admin', 'editor')
     ORDER BY CASE ur.role WHEN 'super_admin' THEN 1 WHEN 'admin' THEN 2 WHEN 'editor' THEN 3 END LIMIT 1),
    auth.uid()
  )
$$;

-- 3. Novas policies
CREATE POLICY produtos_tenant_insert ON public.produtos
FOR INSERT TO authenticated WITH CHECK (
  tenant_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id 
    AND ur.role IN ('admin', 'super_admin', 'editor')
  )
);

CREATE POLICY produtos_tenant_select ON public.produtos
FOR SELECT TO authenticated USING (
  tenant_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id 
    AND ur.role IN ('admin', 'super_admin', 'editor')
  )
);

CREATE POLICY produtos_tenant_update ON public.produtos
FOR UPDATE TO authenticated 
USING (
  tenant_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id 
    AND ur.role IN ('admin', 'super_admin', 'editor')
  )
)
WITH CHECK (
  tenant_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id 
    AND ur.role IN ('admin', 'super_admin', 'editor')
  )
);

CREATE POLICY produtos_tenant_delete ON public.produtos
FOR DELETE TO authenticated USING (
  tenant_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id 
    AND ur.role IN ('admin', 'super_admin', 'editor')
  )
);

-- 4. Backfill
UPDATE public.user_roles SET tenant_id = user_id WHERE tenant_id IS NULL;`

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">🔧 Correção RLS - Produtos</h1>
          <p className="text-on-surface-variant">
            Siga os passos abaixo para corrigir o erro de RLS ao criar produtos.
          </p>
        </div>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="bg-surface-container rounded-xl p-6 border border-outline">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[#e8391a] text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">Acessar Supabase Dashboard</h3>
                <p className="text-on-surface-variant text-sm mb-3">
                  Clique no botão abaixo para abrir o dashboard do Supabase em uma nova aba.
                </p>
                <a
                  href="https://kmtjfapbooqzhysllrbe.supabase.co"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-[#e8391a] text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
                >
                  Abrir Supabase Dashboard
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                </a>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-surface-container rounded-xl p-6 border border-outline">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[#e8391a] text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">Ir para SQL Editor</h3>
                <p className="text-on-surface-variant text-sm mb-3">
                  No menu lateral esquerdo do Supabase, clique em <strong>SQL Editor</strong> (ícone de arquivo SQL).
                </p>
                <div className="bg-surface-container-lowest rounded-lg p-4 border border-outline-variant">
                  <p className="text-xs text-on-surface-variant">
                    💡 <strong>Dica:</strong> Se não encontrar, procure por "SQL Editor" ou "Query" no menu lateral.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-surface-container rounded-xl p-6 border border-outline">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[#e8391a] text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">Copiar e Colar SQL</h3>
                <p className="text-on-surface-variant text-sm mb-3">
                  Copie o código abaixo e cole no editor SQL do Supabase:
                </p>
                
                <div className="relative bg-[#0a0a0a] rounded-lg border border-outline overflow-hidden">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(sqlCode)
                      setStatus('success')
                      setTimeout(() => setStatus('idle'), 2000)
                    }}
                    className="absolute top-2 right-2 bg-surface-container text-on-surface px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-surface-container-high transition-colors"
                  >
                    {status === 'success' ? (
                      <>
                        <span className="material-symbols-outlined text-emerald-400 text-sm">check</span>
                        Copiado!
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                        Copiar
                      </>
                    )}
                  </button>
                  <pre className="text-xs text-on-surface-variant p-4 pt-10 overflow-x-auto whitespace-pre-wrap break-all font-mono max-h-96 overflow-y-auto">
                    {sqlCode}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-surface-container rounded-xl p-6 border border-outline">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[#e8391a] text-white flex items-center justify-center font-bold flex-shrink-0">4</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">Executar SQL</h3>
                <p className="text-on-surface-variant text-sm mb-3">
                  No Supabase, clique em <strong>RUN</strong> (botão no canto inferior direito) para executar o SQL.
                </p>
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                  <p className="text-emerald-400 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined">check_circle</span>
                    Após executar, você verá a mensagem: "Correção RLS aplicada com sucesso!"
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Final Step */}
          <div className="bg-surface-container rounded-xl p-6 border border-outline">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold flex-shrink-0">✓</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">Testar Criação de Produto</h3>
                <p className="text-on-surface-variant text-sm mb-4">
                  Volte para o Cardápio Admin e tente criar um produto. O erro de RLS não deve mais aparecer.
                </p>
                <button
                  onClick={() => navigate('/cardapio-admin')}
                  className="bg-[#e8391a] text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">restaurant_menu</span>
                  Ir para Cardápio Admin
                </button>
              </div>
            </div>
          </div>

          {/* Help */}
          <div className="bg-surface-container-low rounded-xl p-6 border border-outline">
            <h3 className="text-lg font-bold text-white mb-2">Precisa de Ajuda?</h3>
            <p className="text-on-surface-variant text-sm mb-3">
              Se tiver dificuldades, consulte o arquivo completo em:
            </p>
            <code className="text-xs bg-[#0a0a0a] text-on-surface-variant px-3 py-1.5 rounded-lg block w-fit">
              supabase/migrations/fix_rls_produtos.sql
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}
