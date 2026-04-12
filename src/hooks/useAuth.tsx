import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  aal: 'aal1' | 'aal2' | null
  role: 'super_admin' | 'admin' | 'editor' | 'user' | 'consultor' | 'motoboy' | 'cozinha' | null
  signIn: (email: string, password: string) => Promise<{ error: Error | null; nextStep?: 'mfa' }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  setUser: (user: User | null) => void
  verifyOtp: (code: string) => Promise<{ error: Error | null }>
  enrollMfa: () => Promise<{ data: any; error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [aal, setAal] = useState<'aal1' | 'aal2' | null>(null)
  const [role, setRole] = useState<'super_admin' | 'admin' | 'editor' | 'user' | 'consultor' | 'motoboy' | 'cozinha' | null>(null)

  const fetchRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role, tenant_id')
      .eq('user_id', userId)
    
    if (data && data.length > 0 && !error) {
      // Priority: super_admin > admin > editor > consultor > cozinha > motoboy > user
      const roles = data.map(r => r.role);
      if (roles.includes('super_admin')) {
        setRole('super_admin');
      } else if (roles.includes('admin')) {
        setRole('admin');
      } else if (roles.includes('editor')) {
        setRole('editor');
      } else if (roles.includes('consultor')) {
        setRole('consultor');
      } else if (roles.includes('cozinha')) {
        setRole('cozinha');
      } else if (roles.includes('motoboy')) {
        setRole('motoboy');
      } else {
        setRole('user');
      }
    } else {
      setRole('user')
    }
  }

  const checkAal = async () => {
    try {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      const assuranceLevel = (data as any)?.assuranceLevel
      if (assuranceLevel) {
        setAal(assuranceLevel as 'aal1' | 'aal2')
      }
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchRole(session.user.id)
      checkAal()
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchRole(session.user.id)
      else setRole(null)
      checkAal()
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (data?.session) {
      try {
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        const assuranceLevel = (aalData as any)?.assuranceLevel
        if (assuranceLevel === 'aal1' && data.session.user.factors?.some(f => f.status === 'verified')) {
          return { error: null, nextStep: 'mfa' as const }
        }
      } catch (e) {
        // continue sem MFA
      }
    }

    return { error: error ? new Error(error.message) : null }
  }

  const verifyOtp = async (code: string) => {
    const { data: factors } = await supabase.auth.mfa.listFactors()
    const factor = factors?.totp.find(f => f.status === 'verified')
    
    if (!factor) return { error: new Error('Nenhum fator MFA verificado encontrado.') }

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id })
    if (challengeError) return { error: new Error(challengeError.message) }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.id,
      code
    })

    if (!verifyError) await checkAal()
    
    return { error: verifyError ? new Error(verifyError.message) : null }
  }

  const enrollMfa = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'Kero System',
      friendlyName: user?.email
    })
    return { data, error: error ? new Error(error.message) : null }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error ? new Error(error.message) : null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, aal, role, signIn, signUp, signOut, setUser, verifyOtp, enrollMfa }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

