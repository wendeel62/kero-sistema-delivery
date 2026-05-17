# Guia de Autenticação em Duas Etapas (MFA)

## Visão Geral

Este sistema implementa autenticação de dois fatores (MFA) **obrigatória** para contas administrativas usando TOTP (Time-based One-Time Password).

## Papéis que Exigem MFA

- `admin`
- `super_admin`

## Fluxo de Autenticação

```
┌─────────────┐
│   Login     │
│ Email/Senha │
└──────┬──────┘
       │
       v
┌─────────────────────┐
│ Detecta Role        │
│ É admin/super_admin?│
└──────┬──────────────┘
       │
   ┌───┴───┐
   │ Sim   │ Não
   │       │
   v       v
┌──────────────┐  ┌─────────────┐
│ Verifica MFA │  │ Acesso      │
│ Configurado? │  │ Liberado    │
└──┬───────────┘  └─────────────┘
   │
   ├─── Sim ───> Acesso Liberado
   │
   └─── Não ─> /mfa-setup
               ├─> Setup MFA
               ├─> QR Code
               ├─> Verify Code
               └─> Backup Codes
```

## Componentes Principais

### 1. AuthContext.tsx

Gerencia todo o estado de autenticação e MFA:

```typescript
interface AuthContextType {
  user: User | null
  role: Role | null
  mfaConfig: MfaConfig | null
  isMfaRequired: boolean
  setupMFA: () => Promise<{ data: any; error: Error | null }>
  verifyMFA: (code: string) => Promise<{ error: Error | null }>
  // ... outros métodos
}
```

### 2. ProtectedRoute.tsx

Protege rotas e verifica MFA obrigatório:

```typescript
// Verifica se MFA é necessário
const needsMfa = role && isMfaRequired(role)
const mfaNotConfigured = !mfaConfig?.enabled || !mfaConfig?.verified

if (needsMfa && mfaNotConfigured) {
  return <Navigate to="/mfa-setup" replace />
}
```

### 3. MfaSetupPage.tsx

Página de configuração do MFA com:
- Geração de QR code
- Verificação de código
- Backup codes

### 4. MfaSetupModal.tsx

Modal para setup de MFA em qualquer lugar da aplicação.

## Schema Zod

Validação em `src/schemas/auth.ts`:

```typescript
// Roles que exigem MFA
export const MFA_REQUIRED_ROLES = ['admin', 'super_admin'] as const

// Verifica se role exige MFA
export function isMfaRequired(role: string | null): boolean {
  if (!role) return false
  return MFA_REQUIRED_ROLES.includes(role as any)
}

// Valida código MFA (6 dígitos)
export const mfaCodeSchema = z
  .string()
  .length(6, 'Código deve ter 6 dígitos')
  .regex(/^\d{6}$/, 'Código deve conter apenas números')
```

## Testando o Fluxo

### 1. Login como Admin

```typescript
const { signIn } = useAuth()
const result = await signIn('admin@kero.com', 'senha')

if (result.nextStep === 'mfa-setup') {
  // Redirecionar para setup
  navigate('/mfa-setup')
}
```

### 2. Setup do MFA

```typescript
const { setupMFA, verifyMFA } = useAuth()

// 1. Enroll no MFA
const { data } = await setupMFA()
// data.totp.qr_code_url - URL do QR code
// data.totp.secret - Chave secreta

// 2. Verificar código
const { error } = await verifyMFA('123456')
if (!error) {
  // MFA ativado com sucesso
}
```

### 3. Backup Codes

Após verificar o código, o sistema gera 5 backup codes:
- Armazenar em local seguro
- Cada código pode ser usado apenas uma vez
- Útil se perder o acesso ao autenticador

## Segurança

### Níveis de Garantia (AAL)

- **AAL1**: Apenas senha (baixa segurança)
- **AAL2**: Senha + MFA (alta segurança)

O sistema verifica o AAL e exige AAL2 para roles administrativos.

### Boas Práticas

1. **Backup Codes**: Armazenar em local seguro e criptografado
2. **QR Code**: Usar HTTPS em produção
3. **Timeout**: Sessão expira após inatividade
4. **Tentativas**: Limitar tentativas de códigos inválidos

## Troubleshooting

### MFA não está aparecendo

Verifique:
1. Role do usuário está correto?
2. `isMfaRequired(role)` retorna true?
3. Supabase MFA está habilitado?

### Código inválido

- Verificar fuso horário do servidor
- Confirmar que código tem 6 dígitos
- Testar com Google Authenticator ou Authy

### Backup Code não funciona

- Backup codes são gerados localmente
- Em produção, devem vir do servidor
- Implementar endpoint para resgate

## Próximos Passos

- [ ] Implementar envio de backup codes por email
- [ ] Adicionar opção de "lembrar deste dispositivo"
- [ ] Implementar MFA via SMS como alternativa
- [ ] Adicionar logs de auditoria para MFA
