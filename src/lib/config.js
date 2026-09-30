export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
export const FUNCTION_BASE = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : ''

export function assertConfig() {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Konfigurasi Supabase belum diisi.')
}
