import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Handles Supabase errors consistently across the app.
 * Logs via logger (or console in dev) and returns a user-friendly message.
 */
export function handleSupabaseError(
  error: PostgrestError | null,
  context: string
): boolean {
  if (!error) return false

  const message = `[${context}] ${error.message}${error.details ? ` — ${error.details}` : ''}${error.hint ? ` — ${error.hint}` : ''}`

  // In production, this would integrate with Sentry
  if (import.meta.env.DEV) {
    console.error(message)
  }

  return true
}

/**
 * Wraps a Supabase mutation with error handling.
 * Returns true if an error occurred.
 */
export async function safeMutation(
  mutation: () => Promise<{ error: PostgrestError | null }>,
  context: string,
  onSuccess?: () => void | Promise<void>
): Promise<boolean> {
  try {
    const { error } = await mutation()
    if (handleSupabaseError(error, context)) return true
    await onSuccess?.()
    return false
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[${context}] Unexpected error:`, message)
    return true
  }
}
