import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { user, signIn, loading, setUser } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-container border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error } = await signIn(email, password)
    if (error) {
      console.error('Login error:', error)
      setError('E-mail ou senha incorretos.')
    }
    setSubmitting(false)
  }

  const handleBypass = () => {
    // Apenas para teste local enquanto o Supabase Auth está sendo configurado
    setUser({ email: 'admin@kerodelivery.com.br', id: 'test-id' } as unknown as User)
  }

  return (
    <div className="bg-background text-on-background min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background kinetic decorations - pointer-events-none is CRITICAL here */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-container opacity-[0.03] blur-[120px] rounded-full pointer-events-none select-none" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-secondary opacity-[0.03] blur-[100px] rounded-full pointer-events-none select-none" />
      
      {/* Background image overlay */}
      <div className="absolute inset-0 z-[-1] opacity-[0.04] pointer-events-none select-none">
        <img 
          className="w-full h-full object-cover grayscale"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuA2A3Jg7AToVymKPA_Obm9ZGN1sVkxjvnXKTyoAUYkvN9PZq17rN0ClF_MHC7KepoYbMbHdVtqD85TWYSGYj-jih7hlbworI2fjTa3Pj996sWThDHSapEMqAK494uXVGLKNSvgH-2wwx8vIO-XNSuhOcS_DdOanRh5yrTiGixOGbALYtrLHLNlyio9sqwJfT5uGhwcyuXmWjmlWpRCsIDQWF6baiU5uC048YibR0tjeAOe484uqa9YzINhvISt2eQRA9dSIpJ53BkwL"
          alt=""
        />
      </div>

      <div className="w-full max-w-[1200px] grid lg:grid-cols-2 items-center gap-8 lg:gap-12 relative z-10">
        {/* Left Side: Brand Narrative */}
        <div className="hidden lg:flex flex-col space-y-8 pr-12">
          <div className="space-y-2">
            <span className="text-primary font-body text-xs uppercase tracking-[0.2em] font-bold">Gestão Inteligente</span>
            <h1 className="text-4xl xl:text-5xl font-soft font-bold leading-[1.1] tracking-tight text-on-surface">
              O CONTROLE <br />QUE SEU DELIVERY <br /><span className="text-primary-container italic font-soft">MERECE.</span>
            </h1>
          </div>
          <div className="flex items-center gap-6 pt-4">
            <div className="h-[1px] w-12 bg-outline-variant opacity-30" />
            <p className="text-sm text-on-surface-variant max-w-[320px] leading-relaxed">
              Integre pedidos do WhatsApp, gerencie seu cardápio digital e coordene entregas em uma única plataforma de alta performance.
            </p>
          </div>
          {/* Bento Mini Grid for Visual Context */}
          <div className="grid grid-cols-2 gap-4 pt-8">
            <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/5">
              <span className="material-symbols-outlined text-primary-container mb-4 block">restaurant_menu</span>
              <div className="text-2xl font-headline font-bold">100%</div>
              <div className="text-[10px] uppercase tracking-widest text-on-surface-variant">Cardápio Digital</div>
            </div>
            <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/5">
              <span className="material-symbols-outlined text-secondary mb-4 block">forum</span>
              <div className="text-2xl font-headline font-bold">Auto</div>
              <div className="text-[10px] uppercase tracking-widest text-on-surface-variant">Pedidos via WhatsApp</div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="flex justify-center lg:justify-end">
          <div className="w-full max-w-md bg-surface-container rounded-2xl p-6 sm:p-8 lg:p-10 shadow-2xl relative overflow-hidden group border border-outline-variant/10 z-50">
            {/* Subtle Gradient Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-container/5 to-transparent pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center">
              {/* Logo Header */}
              <div className="mb-8 lg:mb-10 text-center">
                <div className="inline-flex items-center justify-center mb-4">
                  <span className="text-3xl sm:text-4xl font-black italic tracking-tighter text-primary-container font-headline">KERO</span>
                </div>
                <h2 className="text-lg sm:text-xl font-headline font-bold text-on-surface tracking-tight">Bem-vindo de volta</h2>
                <p className="text-xs text-on-surface-variant mt-1 uppercase tracking-widest font-body">Painel de Controle</p>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="w-full space-y-5">
                {error && (
                  <div className="bg-error-container/20 text-error text-xs p-3 rounded-lg text-center font-bold">
                    {error}
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.1em] font-bold text-on-surface-variant ml-1" htmlFor="email">E-mail Corporativo</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">alternate_email</span>
                    <input 
                      className="w-full bg-surface-container-lowest border-none focus:ring-1 focus:ring-primary rounded-xl py-3.5 sm:py-4 pl-12 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/40 transition-all cursor-text"
                      id="email" 
                      placeholder="exemplo@kerodelivery.com.br" 
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex justify-between items-end ml-1">
                    <label className="text-[10px] uppercase tracking-[0.1em] font-bold text-on-surface-variant" htmlFor="password">Senha de Acesso</label>
                    <a className="text-[10px] uppercase tracking-[0.1em] font-bold text-primary hover:opacity-80 transition-opacity" href="#">Esqueci minha senha</a>
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">lock</span>
                    <input 
                      className="w-full bg-surface-container-lowest border-none focus:ring-1 focus:ring-primary rounded-xl py-3.5 sm:py-4 pl-12 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/40 transition-all cursor-text"
                      id="password" 
                      placeholder="••••••••••••" 
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                
                {/* Submit Button */}
                <button 
                  className="w-full bg-primary-container text-on-primary-fixed font-headline font-bold text-sm uppercase tracking-widest py-4 sm:py-5 rounded-xl transition-all active:scale-[0.98] hover:shadow-[0_0_30px_-10px_rgba(255,86,55,0.4)] flex items-center justify-center gap-2 group cursor-pointer" 
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-on-primary-fixed border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Entrar no Sistema</span>
                      <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>

              {/* Bypass for Test */}
              <button 
                onClick={() => {
                  console.log('Bypass login triggered...')
                  handleBypass()
                }}
                className="mt-4 text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              >
                Pular Login (Modo de Teste)
              </button>


              {/* Footer Options */}
              <div className="mt-8 lg:mt-10 pt-6 lg:pt-8 border-t border-outline-variant/10 w-full text-center">
                <p className="text-xs text-on-surface-variant font-body">Não possui conta? <a className="text-primary font-bold hover:underline" href="#">Solicite acesso</a></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
