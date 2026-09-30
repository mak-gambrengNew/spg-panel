import { useEffect, useState } from 'react'
import { enableGeraiPush, getPushState } from '../lib/push'
import { toast } from './Toast'

export function PushNotificationControl() {
  const [state, setState] = useState({ supported: false, permission: 'unknown', subscribed: false })
  const [busy, setBusy] = useState(false)

  useEffect(() => { getPushState().then(setState).catch(() => {}) }, [])

  if (!state.supported) return null
  if (state.subscribed) return <span className="push-status enabled" title="Notifikasi aktif">🔔 Aktif</span>

  async function enable() {
    setBusy(true)
    try {
      const next = await enableGeraiPush()
      setState(next)
      toast('Notifikasi Gerai berhasil diaktifkan.', 'success')
    } catch (e) {
      toast(e.message || 'Notifikasi belum dapat diaktifkan.', 'error')
    } finally { setBusy(false) }
  }

  return <button className="ghost push-button" disabled={busy} onClick={enable}>{busy ? 'Menyiapkan…' : '🔔 Aktifkan notifikasi'}</button>
}
