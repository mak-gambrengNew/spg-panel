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

export default function App(){
  const g=useGerai(), [refreshTick,setRefreshTick]=useState(0), realtimeRef=useRef(null), [slug,setSlug]=useState(getGeraiSlug())
  const refresh=useCallback(async()=>{if(!slug)return; try{const data=await api.context(slug);geraiStore.set({context:data.context,phase:data.context.session?'open':'opening',error:null})}catch(e){geraiStore.set({error:e,phase:e.message?.includes('Unauthorized')?'access':'error'})}},[slug])
  useEffect(()=>{if(!slug){const saved=localStorage.getItem('gerai:last-slug');if(saved)setSlug(saved)}},[slug])
  useEffect(()=>{if(slug)localStorage.setItem('gerai:last-slug',slug)},[slug])
  useEffect(()=>{registerPwa();geraiStore.set({slug,phase:'booting',online:navigator.onLine}); if(!slug){geraiStore.set({phase:'error',error:new Error('Link Gerai tidak memiliki slug.')});return} let alive=true; (async()=>{try{const {data:{session}}=await supabase.auth.getSession(); if(!alive)return; if(!session){geraiStore.set({phase:'closed'}); return} await refresh()}catch(e){if(alive)geraiStore.set({phase:'closed',error:e})}})(); return()=>{alive=false}},[slug,refresh,refreshTick])
  useEffect(()=>{const online=()=>{geraiStore.set({online:true});setRefreshTick(x=>x+1)};const offline=()=>geraiStore.set({online:false});window.addEventListener('online',online);window.addEventListener('offline',offline);return()=>{window.removeEventListener('online',online);window.removeEventListener('offline',offline)}},[])
  useEffect(()=>{if(!g.context?.store?.id||!g.context?.business?.id)return; realtimeRef.current?.unsubscribe?.(); const channel=supabase.channel(`gerai-${g.context.store.id}`).on('postgres_changes',{event:'*',schema:'public',table:'menus',filter:`business_id=eq.${g.context.business.id}`},()=>setRefreshTick(x=>x+1)).on('postgres_changes',{event:'*',schema:'public',table:'inventory_items',filter:`business_id=eq.${g.context.business.id}`},()=>setRefreshTick(x=>x+1)).on('postgres_changes',{event:'*',schema:'public',table:'stores',filter:`id=eq.${g.context.store.id}`},()=>setRefreshTick(x=>x+1)).on('postgres_changes',{event:'*',schema:'public',table:'store_inventory_items',filter:`store_id=eq.${g.context.store.id}`},()=>setRefreshTick(x=>x+1)).on('postgres_changes',{event:'*',schema:'public',table:'store_operation_sessions',filter:`store_id=eq.${g.context.store.id}`},()=>setRefreshTick(x=>x+1)).on('postgres_changes',{event:'*',schema:'public',table:'monitoring_sales_events',filter:`store_id=eq.${g.context.store.id}`},()=>setRefreshTick(x=>x+1)).subscribe();realtimeRef.current=channel;return()=>{channel.unsubscribe()}},[g.context?.store?.id,g.context?.business?.id])
  useEffect(()=>{let stopped=false;async function sync(){if(stopped||!navigator.onLine)return;const items=await queue.all();geraiStore.set({pending:items.length});for(const item of items){try{await api.sale('POST',item);await queue.remove(item.transaction_id);geraiStore.set({pending:Math.max(0,(geraiStore.get().pending||1)-1)});toast('Transaksi offline berhasil disinkronkan.','success')}catch(e){if(e.status===409||e.status===401){toast(e.message,'error');break} break}}} sync(); const handler=()=>sync();window.addEventListener('online',handler);const timer=setInterval(sync,15000);return()=>{stopped=true;window.removeEventListener('online',handler);clearInterval(timer)}},[g.online])
  async function afterLogin(){await refresh()}
  async function logout(){await supabase.auth.signOut();geraiStore.set({context:null,phase:'closed',pending:0});toast('Sesi SPG ditutup.','info')}
  if(g.phase==='booting')return <><Splash/><ToastHost/></>
  if(g.phase==='error')return <><main className="error-page"><section className="gate-card"><div className="status-pill closed">● LINK TIDAK SIAP</div><h1>Gerai tidak dapat dibuka</h1><p className="muted">{g.error?.message||'Terjadi kesalahan.'}</p><button className="primary" onClick={()=>setRefreshTick(x=>x+1)}>Coba lagi</button></section></main><ToastHost/></>
  if(!g.context)return <><ClosedGate store={null} onOpen={()=>geraiStore.set({phase:'access'})}/><ToastHost/></>
  if(g.phase==='closed')return <><ClosedGate store={g.context.store} onOpen={()=>geraiStore.set({phase:'access'})}/><ToastHost/></>
  if(g.phase==='access')return <><Access slug={slug} store={g.context.store} onSuccess={afterLogin} onBack={()=>geraiStore.set({phase:'closed'})}/><ToastHost/></>
  if(g.phase==='open')return <><Dashboard context={g.context} online={g.online} pending={g.pending} onRefresh={refresh} onLogout={logout}/><ToastHost/></>
  return <><OpeningForm context={g.context} onOpened={refresh}/><ToastHost/></>
}
