/**
 * Format a number as Brazilian Real currency (R$).
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/**
 * Format a date to Brazilian locale (DD/MM/YYYY).
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('pt-BR')
}

/**
 * Format a phone number to Brazilian format.
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return phone
}

/**
 * Check if a date is within N days from now.
 */
export function isWithinDays(dateStr: string, days: number): boolean {
  const now = new Date()
  const target = new Date(dateStr)
  const diffMs = target.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays <= days && diffDays >= 0
}

/**
 * Get a badge class for client profile.
 */
export function getPerfilBadge(perfil: string): string {
  switch (perfil) {
    case 'vip': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    case 'recorrente': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    default: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  }
}

/**
 * Capitalize first letter of a string.
 */
export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
