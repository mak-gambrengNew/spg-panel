import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import { api } from './lib/api'
import { getGeraiSlug } from './lib/slug'
import { queue } from './lib/idb'
import { geraiStore, useGerai } from './state/geraiStore'
import { registerPwa } from './pwa/register'
import { Splash } from './components/Splash'
import { ClosedGate } from './components/ClosedGate'
import { Access } from './components/Access'
import { OpeningForm } from './components/OpeningForm'
import { Dashboard } from './components/Dashboard'
import { ToastHost, toast } from './components/Toast'
import './styles/app.css'

const LAST_SLUG_KEY = 'gerai:last-slug'

function resolveInitialSlug() {
  const fromUrl = getGeraiSlug()
  if (fromUrl) return fromUrl
  try { return localStorage.getItem(LAST_SLUG_KEY) || '' } catch (_) { return '' }
}

function isAuthError(e) {
  return e?.status === 401 || /unauthorized|jwt|not authenticated/i.test(e?.message || '')
}

export default function App() {
  const g = useGerai()
  const [slug] = useState(resolveInitialSlug)
  const [refreshTick, setRefreshTick] = useState(0)
  const realtimeRef = useRef(null)

  // Ambil context terbaru dari server.
  // `silent` = refresh di latar belakang (realtime / online lagi): jangan tampilkan Splash
  // dan jangan menimpa layar yang sedang dipakai dengan layar error.
  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!slug) return
    try {
      const data = await api.context(slug)
      geraiStore.set({
        context: data.context,
        phase: data.context.session ? 'open' : 'opening',
        error: null,
      })
    } catch (e) {
      if (isAuthError(e)) {
        // Sesi hilang / kedaluwarsa -> minta kode akses SPG lagi.
        geraiStore.set({ error: e, phase: 'access' })
        return
      }
      if (silent && geraiStore.get().context) {
        // Sudah ada data di layar (mis. sedang offline): pertahankan, cukup beri tahu.
        geraiStore.set({ error: e })
        return
      }
      geraiStore.set({ error: e, phase: 'error' })
    }
  }, [slug])

  // Boot awal: hanya sekali per slug.
  const boot = useCallback(async () => {
    geraiStore.set({ slug, phase: 'booting', error: null, online: navigator.onLine })
    if (!slug) {
      geraiStore.set({
        phase: 'error',
        error: new Error('Link Gerai tidak memiliki slug. Buka kembali link Gerai dari Owner.'),
      })
      return
    }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // Belum login: konteks Gerai butuh token SPG, jadi tampilkan gerbang TUTUP.
        geraiStore.set({ phase: 'closed', context: null })
        return
      }
      await refresh()
    } catch (e) {
      geraiStore.set({ phase: 'closed', context: null, error: e })
    }
  }, [slug, refresh])

  useEffect(() => {
    registerPwa()
  }, [])

  useEffect(() => {
    if (slug) {
      try { localStorage.setItem(LAST_SLUG_KEY, slug) } catch (_) {}
    }
    boot()
  }, [slug, boot])

  // Refresh senyap saat ada trigger realtime / koneksi kembali.
  useEffect(() => {
    if (refreshTick === 0) return
    if (!geraiStore.get().context) return
    refresh({ silent: true })
  }, [refreshTick, refresh])

  useEffect(() => {
    const online = () => { geraiStore.set({ online: true }); setRefreshTick(x => x + 1) }
    const offline = () => geraiStore.set({ online: false })
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [])

  // Realtime hanya sebagai pemicu refresh context.
  useEffect(() => {
    const storeId = g.context?.store?.id
    const businessId = g.context?.business?.id
    if (!storeId || !businessId) return
    const bump = () => setRefreshTick(x => x + 1)
    const channel = supabase
      .channel(`gerai-${storeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menus', filter: `business_id=eq.${businessId}` }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items', filter: `business_id=eq.${businessId}` }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stores', filter: `id=eq.${storeId}` }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_inventory_items', filter: `store_id=eq.${storeId}` }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_operation_sessions', filter: `store_id=eq.${storeId}` }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monitoring_sales_events', filter: `store_id=eq.${storeId}` }, bump)
      .subscribe()
    realtimeRef.current = channel
    return () => { channel.unsubscribe() }
  }, [g.context?.store?.id, g.context?.business?.id])

  // Sinkronisasi antrean transaksi offline.
  useEffect(() => {
    let stopped = false
    async function sync() {
      if (stopped || !navigator.onLine) return
      const items = await queue.all()
      geraiStore.set({ pending: items.length })
      for (const item of items) {
        try {
          await api.sale('POST', item)
          await queue.remove(item.transaction_id)
          geraiStore.set({ pending: Math.max(0, (geraiStore.get().pending || 1) - 1) })
          toast('Transaksi offline berhasil disinkronkan.', 'success')
        } catch (e) {
          if (e.status === 409 || e.status === 401) { toast(e.message, 'error') }
          break
        }
      }
    }
    sync()
    const handler = () => sync()
    window.addEventListener('online', handler)
    const timer = setInterval(sync, 15000)
    return () => {
      stopped = true
      window.removeEventListener('online', handler)
      clearInterval(timer)
    }
  }, [g.online])

  async function afterLogin() { await refresh() }

  async function logout() {
    await supabase.auth.signOut()
    geraiStore.set({ context: null, phase: 'closed', pending: 0 })
    toast('Sesi SPG ditutup.', 'info')
  }

  const goAccess = () => geraiStore.set({ phase: 'access' })
  const goClosed = () => geraiStore.set({ phase: 'closed' })

  // ===== Render =====
  // URUTAN PENTING: 'access' harus dicek SEBELUM `!g.context`.
  // Perangkat yang belum login belum punya context, jadi jika cek context didahulukan,
  // tombol "Buka Sekarang" tidak pernah menampilkan form kode akses.

  if (g.phase === 'booting') return <><Splash /><ToastHost /></>

  if (g.phase === 'error') {
    return (
      <>
        <main className="error-page">
          <section className="gate-card">
            <div className="status-pill closed">● LINK TIDAK SIAP</div>
            <h1>Gerai tidak dapat dibuka</h1>
            <p className="muted">{g.error?.message || 'Terjadi kesalahan.'}</p>
            <button className="primary" onClick={boot}>Coba lagi</button>
          </section>
        </main>
        <ToastHost />
      </>
    )
  }

  if (g.phase === 'access') {
    return <><Access slug={slug} store={g.context?.store || null} onSuccess={afterLogin} onBack={goClosed} /><ToastHost /></>
  }

  if (!g.context || g.phase === 'closed') {
    return <><ClosedGate store={g.context?.store || null} onOpen={goAccess} /><ToastHost /></>
  }

  if (g.phase === 'open') {
    return <><Dashboard context={g.context} online={g.online} pending={g.pending} onRefresh={() => refresh({ silent: true })} onLogout={logout} /><ToastHost /></>
  }

  return <><OpeningForm context={g.context} onOpened={refresh} /><ToastHost /></>
}
