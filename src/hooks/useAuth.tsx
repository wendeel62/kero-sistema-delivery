/**
 * useAuth Hook - Re-exporta do AuthContext
 * 
 * Este arquivo apenas re-exporta o hook useAuth e o AuthProvider
 * do contexto principal. Isso mantém a compatibilidade com imports
 * existentes enquanto centraliza a lógica no AuthContext.
 * 
 * @deprecated Importe diretamente de 'contexts/AuthContext' em vez deste arquivo
 */

export { AuthProvider, useAuth, AuthContext } from '../contexts/AuthContext'
export type { User, Session } from '@supabase/supabase-js'
