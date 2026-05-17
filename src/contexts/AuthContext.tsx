import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { isMfaRequired } from '../schemas/auth'

// ============================================
// TYPES
// ============================================

export type Role = 'super_admin' | 'admin' | 'editor' | 'user' | 'consultor' | 'motoboy' | 'cozinha'
export type Aal = 'aal1' | 'aal2'

export interface MfaConfig {
  enabled: boolean
  verified: boolean
  factors: Array<{
    id: string
    factor_type: string
    status: string
    friendly_name?: string
  }>
}

export interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  aal: Aal | null
  role: Role | null
  mfaConfig: MfaConfig | null
  isMfaRequired: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null; nextStep?: 'mfa' | 'mfa-setup' }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  setUser: (user: User | null) => void
  verifyOtp: (code: string) => Promise<{ error: Error | null }>
  enrollMfa: () => Promise<{ data: any; error: Error | null }>
  setupMFA: () => Promise<{ data: any; error: Error | null }>
  verifyMFA: (code: string) => Promise<{ error: Error | null }>
  requiresMfaRedirect: boolean
  checkMfaRequirement: () => Promise<boolean>
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
  const [aal, setAal] = useState<Aal | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [mfaConfig, setMfaConfig] = useState<MfaConfig | null>(null)

  // Fetch user role from database
  const fetchRole = useCallback(async (userId: string) => {
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
  }, [])

  // Check AAL (Authenticator Assurance Level)
  const checkAal = useCallback(async () => {
    try {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      const assuranceLevel = (data as any)?.assuranceLevel
      if (assuranceLevel) {
        setAal(assuranceLevel as Aal)
      }
    } catch (e) {
      // ignore
    }
  }, [])

  // Check MFA configuration
  const checkMfaConfig = useCallback(async () => {
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totpFactors = factors?.totp || []
      const verifiedFactors = totpFactors.filter(f => f.status === 'verified')
      
      setMfaConfig({
        enabled: totpFactors.length > 0,
        verified: verifiedFactors.length > 0,
        factors: totpFactors.map(f => ({
          id: f.id,
          factor_type: f.factor_type,
          status: f.status,
          friendly_name: f.friendly_name
        }))
      })
    } catch (e) {
      setMfaConfig({
        enabled: false,
        verified: false,
        factors: []
      })
    }
  }, [])

  // Check if MFA is required for current role
  const checkMfaRequirement = useCallback(async (): Promise<boolean> => {
    if (!role) return false
    
    const requiresMfa = isMfaRequired(role)
    if (!requiresMfa) return false
    
    // If MFA is required, check if it's enabled and verified
    await checkMfaConfig()
    return true
  }, [role, checkMfaConfig])

  // Check if user requires MFA redirect
  const requiresMfaRedirect = useCallback(() => {
    if (!role || !user) return false
    
    const requiresMfa = isMfaRequired(role)
    if (!requiresMfa) return false
    
    // Check if MFA is enabled and verified
    const mfaEnabled = mfaConfig?.enabled && mfaConfig.verified
    return !mfaEnabled
  }, [role, user, mfaConfig])

  // Initialize auth state and listen for changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchRole(session.user.id)
        checkAal()
        checkMfaConfig()
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchRole(session.user.id)
        checkAal()
        checkMfaConfig()
      } else {
        setRole(null)
        setMfaConfig(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [fetchRole, checkAal, checkMfaConfig])

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (data?.session) {
      try {
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        const assuranceLevel = (aalData as any)?.assuranceLevel
        
        // Check if MFA is required for this user's role
        await fetchRole(data.session.user.id)
        const requiresMfa = isMfaRequired(role)
        
        if (requiresMfa && assuranceLevel === 'aal1') {
          // MFA required but not verified - redirect to setup
          return { error: null, nextStep: 'mfa-setup' as const }
        }
        
        if (assuranceLevel === 'aal1' && data.session.user.factors?.some(f => f.status === 'verified')) {
          // MFA required but not yet verified
          return { error: null, nextStep: 'mfa' as const }
        }
      } catch (e) {
        // continue sem MFA
      }
    }

    return { error: error ? new Error(error.message) : null }
  }

  // Verify OTP code for MFA
  const verifyOtp = async (code: string) => {
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const factor = factors?.totp.find(f => f.status === 'verified')

      if (!factor) {
        // Try to verify unverified factor
        const unverifiedFactor = factors?.totp.find(f => f.status === 'unverified')
        if (unverifiedFactor) {
          const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ 
            factorId: unverifiedFactor.id 
          })
          if (challengeError) return { error: new Error(challengeError.message) }

          const { error: verifyError } = await supabase.auth.mfa.verify({
            factorId: unverifiedFactor.id,
            challengeId: challenge.id,
            code
          })

          if (!verifyError) {
            await checkAal()
            await checkMfaConfig()
          }

          return { error: verifyError ? new Error(verifyError.message) : null }
        }
        return { error: new Error('Nenhum fator MFA encontrado.') }
      }

      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id })
      if (challengeError) return { error: new Error(challengeError.message) }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challenge.id,
        code
      })

      if (!verifyError) {
        await checkAal()
        await checkMfaConfig()
      }

      return { error: verifyError ? new Error(verifyError.message) : null }
    } catch (e: any) {
      return { error: new Error(e.message || 'Erro ao verificar MFA') }
    }
  }

  // Enroll in MFA (setup)
  const enrollMfa = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Kero System',
        friendlyName: user?.email || 'Kero MFA'
      })
      return { data, error: error ? new Error(error.message) : null }
    } catch (e: any) {
      return { data: null, error: new Error(e.message || 'Erro ao configurar MFA') }
    }
  }

  // Setup MFA - wrapper for enroll
  const setupMFA = async () => {
    return await enrollMfa()
  }

  // Verify MFA code after setup
  const verifyMFA = async (code: string) => {
    return await verifyOtp(code)
  }

  // Sign up new user
  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error ? new Error(error.message) : null }
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
      aal,
      role,
      mfaConfig,
      isMfaRequired: requiresMfaRedirect(),
      signIn,
      signUp,
      signOut,
      setUser,
      verifyOtp,
      enrollMfa,
      setupMFA,
      verifyMFA,
      checkMfaRequirement,
      requiresMfaRedirect: requiresMfaRedirect()
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
