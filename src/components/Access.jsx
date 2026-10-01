import { useState } from 'react'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'
import { toast } from './Toast'

export function Access({slug,store,onSuccess,onBack}){
  const [code,setCode]=useState('')
  const [busy,setBusy]=useState(false)

  async function submit(e){
    e.preventDefault()
    if(!code.trim()) return toast('Masukkan kode akses SPG.','error')
    setBusy(true)
    try{
      const r=await api.login(code.trim(),slug)
      if(!r.session) throw new Error('Sesi SPG tidak diterima server.')
      const {error}=await supabase.auth.setSession({
        access_token:r.session.access_token,
        refresh_token:r.session.refresh_token
      })
      if(error) throw error
      await onSuccess(r)
    }catch(e){
      toast(e.message,'error')
    }finally{
      setBusy(false)
    }
  }

  return <main className="gate-page">
    <section className="gate-card">
      <button className="text-button" onClick={onBack}>← Kembali</button>
      <img className="login-logo" src="/assets/brand-logo-transparent.png"/>
      <div className="eyebrow">AKSES SPG</div>
      <h1>{store?.name||'Gerai'}</h1>
      <p>Masukkan kode akses SPG. Identitas, business, dan gerai diverifikasi oleh server.</p>
      <form onSubmit={submit}>
        <label>
          Kode akses
          <input
            autoFocus
            inputMode="numeric"
            type="password"
            value={code}
            onChange={e=>setCode(e.target.value)}
            autoComplete="one-time-code"
            placeholder="Masukkan kode akses"
          />
        </label>
        <button className="primary big" disabled={busy}>
          {busy?'Memverifikasi…':'Masuk ke Gerai'}
        </button>
      </form>
    </section>
  </main>
}