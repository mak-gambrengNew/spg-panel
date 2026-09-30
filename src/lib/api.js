import { supabase } from './supabase'
import { FUNCTION_BASE, assertConfig } from './config'

async function invoke(name, body, options = {}) {
  assertConfig()
  const { data: { session } } = await supabase.auth.getSession()
  const token = options.auth === false ? null : session?.access_token
  const res = await fetch(`${FUNCTION_BASE}/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body || {}),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json?.ok === false || json?.success === false) {
    const err = new Error(json?.error || json?.message || `Request ${name} gagal (${res.status})`)
    err.status = res.status
    err.payload = json
    throw err
  }
  return json
}

export const api = {
  async login(accessCode, slug) { return invoke('spg-login', { access_code: accessCode, slug }, { auth: false }) },
  async context(slug) { return invoke('gerai-context', { slug }) },
  async operation(action, body) { return invoke('gerai-operations', { action, ...body }) },
  async history(storeId, limit = 50) { return invoke('gerai-data', { action: 'history', store_id: storeId, limit }) },
  async contacts() { return invoke('gerai-data', { action: 'chat_contacts' }) },
  async openChat(targetUserId) { return invoke('gerai-data', { action: 'chat_open', target_user_id: targetUserId }) },
  async messages(conversationId) { return invoke('gerai-data', { action: 'chat_messages', conversation_id: conversationId }) },
  async sendMessage(conversationId, body, clientMessageId) { return invoke('gerai-data', { action: 'chat_send', conversation_id: conversationId, body, client_message_id: clientMessageId }) },
  async sale(method, payload) {
    assertConfig()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Sesi SPG tidak tersedia.')
    const res = await fetch(`${FUNCTION_BASE}/monitoring-ingest-sale`, {
      method,
      headers: { 'content-type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || json?.ok === false) {
      const err = new Error(json?.error || `Transaksi gagal (${res.status})`)
      err.status = res.status; err.payload = json; throw err
    }
    return json
  },
}
