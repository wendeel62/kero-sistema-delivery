import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { ROLES } from '../constants'
import type { Role } from '../constants'

export interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  role: Role | null
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  setUser: (user: User | null) => void
}

// ============================================
// CONTEXT
// ============================================

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ============================================
// PROVIDER
// ============================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<Role | null>(null)

  // Fetch user role from database
    const fetchRole = useCallback(async (userId: string, tenantId?: string) => {
      let query = supabase
        .from('user_roles')
        .select('role, tenant_id')
        .eq('user_id', userId)

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error } = await query

    if (data && data.length > 0 && !error) {
      const roles = data.map(r => r.role);
      // Priority: super_admin > admin > gerente > atendente > caixa > cozinheiro > motoboy/entregador > cliente
      if (roles.includes(ROLES.SUPER_ADMIN)) {
        setRole(ROLES.SUPER_ADMIN);
      } else if (roles.includes(ROLES.ADMIN)) {
        setRole(ROLES.ADMIN);
      } else if (roles.includes(ROLES.GERENTE)) {
        setRole(ROLES.GERENTE);
      } else if (roles.includes(ROLES.ATENDENTE)) {
        setRole(ROLES.ATENDENTE);
      } else if (roles.includes(ROLES.CAIXA)) {
        setRole(ROLES.CAIXA);
      } else if (roles.includes(ROLES.COZINHEIRO)) {
        setRole(ROLES.COZINHEIRO);
      } else if (roles.includes(ROLES.MOTOBOY) || roles.includes(ROLES.ENTREGADOR)) {
        setRole(ROLES.MOTOBOY);
      } else {
        setRole(ROLES.CLIENTE);
      }
    } else {
      setRole(ROLES.CLIENTE)
    }
  }, [])

  // Initialize auth state and listen for changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchRole(session.user.id)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchRole(session.user.id)
      } else {
        setRole(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [fetchRole])

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? new Error(error.message) : null }
  }

  // Sign up new user
  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error || !data.user) {
      return { error: error ? new Error(error.message) : new Error('Signup failed') }
    }

    // Create tenant config for new user
    const { error: tenantError } = await supabase
      .from('configuracoes')
      .insert({
        id: data.user.id,
        tenant_id: data.user.id,
        loja_aberta: false,
        taxa_entrega: 0,
        pedido_minimo: 0,
        slug: 'minha-loja',
      })

    if (tenantError) {
      console.error('Failed to create tenant config:', tenantError.message)
    }

    // Assign admin role to new user for their tenant
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: data.user.id,
        tenant_id: data.user.id,
        role: 'admin',
      })

    if (roleError) {
      console.error('Failed to assign role:', roleError.message)
    }

    return { error: null }
  }

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      role,
      signIn,
      signUp,
      signOut,
      setUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// ============================================
// HOOK
// ============================================

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
