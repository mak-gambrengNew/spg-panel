import { useState } from 'react'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'
import { toast } from './Toast'

export function Access({ slug, store, onSuccess, onBack }) {
  const [code,setCode]=useState(''); const [busy,setBusy]=useState(false)
  async function submit(e){ e.preventDefault(); if(code.trim().length<6) return toast('Kode akses minimal 6 karakter.','error'); setBusy(true); try { const result=await api.login(code.trim(),slug); if(!result.session) throw new Error('Sesi SPG tidak diterima server.'); const {error}=await supabase.auth.setSession({access_token:result.session.access_token,refresh_token:result.session.refresh_token}); if(error) throw error; await onSuccess(result); } catch(e){ toast(e.message,'error') } finally { setBusy(false) } }
  return <main className="gate-page"><section className="gate-card"><button className="text-button" onClick={onBack}>← Kembali</button><div className="eyebrow">AKSES SPG</div><h1>{store?.name || 'Gerai'}</h1><p className="muted">Masukkan kode akses SPG. Sistem akan mengenali identitas dan business Anda dari server.</p><form onSubmit={submit}><label>Kode akses<input autoFocus inputMode="numeric" type="password" value={code} onChange={e=>setCode(e.target.value)} autoComplete="one-time-code" /></label><button className="primary big" disabled={busy}>{busy?'Memverifikasi…':'Masuk & Lanjut'}</button></form></section></main>
}
