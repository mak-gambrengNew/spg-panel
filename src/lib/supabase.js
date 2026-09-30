import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_KEY } from './config'

export const supabase = createClient(SUPABASE_URL || 'https://placeholder.invalid', SUPABASE_KEY || 'placeholder', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})
