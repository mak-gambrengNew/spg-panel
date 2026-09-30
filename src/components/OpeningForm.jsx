import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { number, rupiah } from '../lib/format'
import { toast } from './Toast'

export function OpeningForm({ context, onOpened }) {
  const items = context?.inventory || []
  const [cash,setCash]=useState('0'); const [qty,setQty]=useState({}); const [busy,setBusy]=useState(false)
  useEffect(()=>{ const next={}; items.forEach(x=>next[x.inventory_item_id]=String(x.quantity ?? 0)); setQty(next) },[items])
  const totalItems=useMemo(()=>Object.values(qty).reduce((a,v)=>a+Number(v||0),0),[qty])
  async function submit(e){ e.preventDefault(); if(!navigator.onLine) return toast('Pembukaan Gerai harus online agar status server benar.','error'); setBusy(true); try { const payload=items.map(x=>({inventory_item_id:x.inventory_item_id,quantity:Number(qty[x.inventory_item_id]||0)})); await api.operation('open',{store_id:context.store.id,opening_cash:Number(cash||0),items:payload}); toast('Gerai berhasil dibuka.','success'); await onOpened(); } catch(e){ toast(e.message,'error') } finally {setBusy(false)} }
  return <main className="opening-page"><section className="panel"><div className="eyebrow">FORM BUKA GERAI</div><h1>Siapkan Gerai</h1><p className="muted">Isi kondisi kas dan stok fisik awal. Nilai akan divalidasi dan disimpan oleh server.</p><form onSubmit={submit}><div className="field-grid"><label>Kas awal<input type="number" min="0" step="100" value={cash} onChange={e=>setCash(e.target.value)} /><small>{rupiah(cash)}</small></label></div><div className="section-head"><h2>Stok awal</h2><span>{number(totalItems)} unit</span></div><div className="inventory-list">{items.map(x=><label className="inventory-row" key={x.inventory_item_id}><span><b>{x.name}</b><small>{x.unit} · minimum {number(x.minimum_quantity)}</small></span><input type="number" min="0" step="0.01" value={qty[x.inventory_item_id] ?? ''} onChange={e=>setQty(q=>({...q,[x.inventory_item_id]:e.target.value}))}/></label>)}</div><button className="primary big" disabled={busy}>{busy?'Membuka Gerai…':'Buka Gerai'}</button></form></section></main>
}
