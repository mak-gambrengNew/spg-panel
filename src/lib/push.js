import { supabase } from './supabase'
import { FUNCTION_BASE, assertConfig } from './config'

function base64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map(char => char.charCodeAt(0)))
}

async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Sesi SPG tidak tersedia.')
  return session.access_token
}

export async function getPushSupport() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function getPushState() {
  if (!(await getPushSupport())) return { supported: false, permission: 'unsupported', subscribed: false }
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  return { supported: true, permission: Notification.permission, subscribed: Boolean(subscription) }
}

export async function enableGeraiPush() {
  assertConfig()
  if (!(await getPushSupport())) throw new Error('Browser ini belum mendukung Web Push.')
  if (Notification.permission === 'denied') throw new Error('Notifikasi diblokir browser. Izinkan notifikasi untuk PWA Gerai dari pengaturan situs.')

  const token = await getAuthToken()
  let publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
  try {
    const cfg = await fetch(`${FUNCTION_BASE}/gerai-push-config`, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` } })
    const data = await cfg.json().catch(() => ({}))
    if (cfg.ok && data.public_key) publicKey = data.public_key
  } catch (_) {}
  if (!publicKey) throw new Error('VAPID public key belum dikonfigurasi.')

  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Izin notifikasi belum diberikan.')

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(publicKey),
    })
  }

  const json = subscription.toJSON()
  const registerRes = await fetch(`${FUNCTION_BASE}/chat-register-push`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth_key: json.keys?.auth,
      device_label: 'PWA Gerai',
    }),
  })
  const registered = await registerRes.json().catch(() => ({}))
  if (!registerRes.ok || !registered.ok) throw new Error(registered.error || 'Registrasi perangkat push gagal.')
  return { supported: true, permission, subscribed: true, subscription_id: registered.subscription_id }
}

export async function disableGeraiPush() {
  if (!(await getPushSupport())) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) await subscription.unsubscribe()
}
