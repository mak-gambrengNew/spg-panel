import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { MenuGrid } from './MenuGrid'
import { StatusBar } from './StatusBar'
import { rupiah, number, dateTime } from '../lib/format'
import { api } from '../lib/api'
import { queue } from '../lib/idb'
import { toast } from './Toast'
import { PushNotificationControl } from './PushNotificationControl'

const Icon=({children,viewBox='0 0 24 24'})=><svg viewBox={viewBox} aria-hidden="true">{children}</svg>
const I={
  sale:<Icon><path d="M4 6h16v14H4z"/><path d="M8 6V4h8v2M8 10h8M8 14h5"/></Icon>,
  stock:<Icon><path d="M4 7h16v13H4z"/><path d="m4 7 8-4 8 4M8 11h8"/></Icon>,
  history:<Icon><path d="M4 12a8 8 0 1 0 2.3-5.7"/><path d="M4 4v5h5M12 7v5l3 2"/></Icon>,
  action:<Icon><path d="M12 3v18M3 12h18M6 6l12 12M18 6 6 18"/></Icon>,
  chat:<Icon><path d="M4 5h16v12H8l-4 4z"/><path d="M8 10h8M8 13h5"/></Icon>,
  plus:<Icon><path d="M12 5v14M5 12h14"/></Icon>,
  close:<Icon><path d="m6 6 12 12M18 6 6 18"/></Icon>,
}

function Sheet({title,subtitle,onClose,children}){return <div className="sheet-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="sheet"><div className="sheet-grab"/><header className="sheet-head"><div><span className="eyebrow">OPERASIONAL</span><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button className="icon-btn" onClick={onClose}>{I.close}</button></header>{children}</section></div>}

export function Dashboard({ context, online, pending, onRefresh, onLogout }) {
  const menus=context.menus||[], inv=context.inventory||[]
  const [tab,setTab]=useState('jual'), [cart,setCart]=useState({}), [payment,setPayment]=useState('Tunai'), [busy,setBusy]=useState(false)
  const [history,setHistory]=useState(null), [historyTab,setHistoryTab]=useState('sales'), [restock,setRestock]=useState([])
  const [sheet,setSheet]=useState(null), [chatChoice,setChatChoice]=useState(false), [chat,setChat]=useState(null)
  const [contacts,setContacts]=useState([]), [conversation,setConversation]=useState(null), [messages,setMessages]=useState([]), [chatText,setChatText]=useState(''), [chatBusy,setChatBusy]=useState(false)
  const total=useMemo(()=>menus.reduce((a,m)=>a+Number(m.price)*Number(cart[m.id]||0),0),[menus,cart])
  const count=useMemo(()=>Object.values(cart).reduce((a,v)=>a+Number(v||0),0),[cart])
  const low=inv.filter(x=>Number(x.quantity)<Number(x.minimum_quantity))
  const menuCats=['Semua',...new Set(menus.map(m=>m.category||'Menu'))]
  const [cat,setCat]=useState('Semua')
  const visibleMenus=menus.filter(m=>cat==='Semua'||(m.category||'Menu')===cat)

  function add(m){setCart(c=>({...c,[m.id]:Number(c[m.id]||0)+1}))}
  function qty(m,d){setCart(c=>{const n=Math.max(0,Number(c[m.id]||0)+d),x={...c};if(n)x[m.id]=n;else delete x[m.id];return x})}
  async function checkout(){
    if(!count)return
    setBusy(true)
    const transaction_id=crypto.randomUUID()
    const rows=menus.map(m=>({m,q:Number(cart[m.id]||0)})).filter(x=>x.q>0)
    const payload={transaction_id,store_id:context.store.id,payment_method:payment,total_amount:total,items:rows.map(x=>({menu_id:x.m.id,qty:x.q})),occurred_at:new Date().toISOString()}
    try{if(!online){await queue.put({...payload,created_at:Date.now()});toast('Transaksi disimpan dan menunggu koneksi.','info');setCart({});return}await api.sale('POST',payload);toast('Penjualan tersimpan ke monitoring.','success');setCart({});await onRefresh()}catch(e){if(e.status===401||e.status===409){toast(e.message,'error');return}await queue.put({...payload,created_at:Date.now()});toast('Server sementara tidak menerima. Transaksi masuk antrean sinkronisasi.','info');setCart({})}finally{setBusy(false)}
  }
  async function loadHistory(){try{setHistory(await api.history(context.store.id))}catch(e){toast(e.message,'error')}}
  function openTab(t){setTab(t);if(t==='riwayat')loadHistory()}
  async function restockRequest(){if(!restock.length)return;try{await api.operation('restock_request',{store_id:context.store.id,note:'Permintaan restok dari PWA Gerai',items:restock.map(x=>({inventory_item_id:x.id,quantity:x.qty}))});toast('Permintaan restok terkirim.','success');setRestock([]);await onRefresh()}catch(e){toast(e.message,'error')}}
  async function iceOrder(){const q=Number(sheet?.quantity||0);if(!q||q<=0)return toast('Isi jumlah es kristal.','error');try{await api.operation('ice_order',{store_id:context.store.id,quantity:q,unit:sheet.unit||'kg',note:sheet.note||null});toast('Permintaan es kristal terkirim.','success');setSheet(null);await loadHistory()}catch(e){toast(e.message,'error')}}
  async function emergency(){if(!sheet?.note?.trim())return toast('Isi keterangan darurat.','error');try{await api.operation('emergency',{store_id:context.store.id,note:sheet.note.trim(),priority:'urgent'});toast('Pesan darurat terkirim.','success');setSheet(null)}catch(e){toast(e.message,'error')}}

  async function startChat(target){
    try{setChatBusy(true);const cs=contacts.length?contacts:((await api.contacts()).contacts||[]);setContacts(cs);const c=cs.find(x=>x.role===target);if(!c)throw new Error('Kontak '+target+' tidak tersedia.');const r=await api.openChat(c.id);setConversation(r.conversation);setChat(c);setMessages((await api.messages(r.conversation.id)).messages||[]);setChatChoice(false)}catch(e){toast(e.message,'error')}finally{setChatBusy(false)}
  }
  async function sendChat(){const body=chatText.trim();if(!body||!conversation)return;const clientId=crypto.randomUUID();setChatText('');try{const r=await api.sendMessage(conversation.id,body,clientId);if(r.message)setMessages(m=>[...m,r.message])}catch(e){setChatText(body);toast(e.message,'error')}}
  useEffect(()=>{if(!conversation?.id)return;const ch=supabase.channel('spg-chat-'+conversation.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages',filter:`conversation_id=eq.${conversation.id}`},payload=>{setMessages(m=>m.some(x=>x.id===payload.new.id)?m:[...m,payload.new])}).subscribe();return()=>{ch.unsubscribe()}},[conversation?.id])

  return <div className="app-shell">
    <StatusBar context={context} online={online} pending={pending}/>
    <header className="topbar"><div className="brandrow"><img src="/assets/brand-logo-transparent.png" className="logo-s"/><div className="who"><b>{context.business?.name||"Teh Solo Ma'Gambreng"}</b><strong>{context.store.name}</strong><small>{context.user.full_name} · SPG</small></div></div><div className="today"><small>Hari ini</small><b>{new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short'}).format(new Date())}</b><span>{online?'● Online':'● Offline'}</span></div></header>
    {!online&&<div className="strip yellow"><i/>Mode offline aktif — transaksi baru akan disinkronkan saat koneksi kembali.</div>}
    {pending>0&&<div className="strip edit"><i/>{pending} transaksi menunggu sinkronisasi server.</div>}

    <main className="panels">
      {tab==='jual'&&<section className="panel on sale-panel"><div className="toolrow"><div className="chips">{menuCats.map(c=><button key={c} className="chip" aria-pressed={cat===c} onClick={()=>setCat(c)}>{c}</button>)}</div><select className="pay-select" value={payment} onChange={e=>setPayment(e.target.value)}><option>Tunai</option><option>QRIS</option></select></div><div className="menu-wrap"><MenuGrid menus={visibleMenus} cart={cart} onAdd={add}/></div>{count>0&&<section className="order-bar"><div><b>{count} item dipesan</b><small>{rupiah(total)}</small></div><button className="primary" disabled={busy} onClick={checkout}>{busy?'Menyimpan…':'Bayar & Simpan'}</button></section>}</section>}
      {tab==='stok'&&<section className="panel on content-panel"><div className="page-head"><div><span className="eyebrow">INVENTORY</span><h2>Stok Gerai</h2><p>Data stok aktual dari server.</p></div><span className={`count-pill ${low.length?'warn':''}`}>{low.length?`${low.length} perlu perhatian`:'Stok aman'}</span></div><div className="stock-list">{inv.map(x=><article className={`stock-card ${Number(x.quantity)<Number(x.minimum_quantity)?'low':''}`} key={x.inventory_item_id}><div className="stock-icon">▣</div><div className="stock-copy"><b>{x.name}</b><small>{x.logistics_type||'Logistik'} · minimum {number(x.minimum_quantity)} {x.unit}</small></div><strong>{number(x.quantity)}<small>{x.unit}</small></strong></article>)}</div>{low.length>0&&<div className="action-card"><div><b>Stok di bawah minimum</b><p>Siapkan permintaan restok untuk {low.length} item.</p></div><button className="secondary" onClick={()=>setRestock(low.map(x=>({id:x.inventory_item_id,qty:Math.max(1,Number(x.minimum_quantity)-Number(x.quantity))})))}>Siapkan</button></div>}{restock.length>0&&<div className="restock-box"><b>{restock.length} item akan diminta</b>{restock.map(x=><div key={x.id}>{inv.find(i=>i.inventory_item_id===x.id)?.name||x.id}<strong>{x.qty}</strong></div>)}<button className="primary big" onClick={restockRequest}>Kirim permintaan restok</button></div>}</section>}
      {tab==='riwayat'&&<section className="panel on content-panel"><div className="page-head"><div><span className="eyebrow">AKTIVITAS</span><h2>Riwayat Gerai</h2><p>Catatan operasional yang berasal dari backend.</p></div><button className="icon-btn" onClick={loadHistory}>↻</button></div><div className="history-tabs">{[['sales','Penjualan'],['ice','Es Kristal'],['restok','Logistik'],['checker','Checker']].map(([k,v])=><button key={k} className={historyTab===k?'active':''} onClick={()=>setHistoryTab(k)}>{v}</button>)}</div>{!history?<div className="empty-state"><b>Memuat riwayat…</b></div>:<HistoryList type={historyTab} history={history}/>}</section>}
      {tab==='aksi'&&<section className="panel on content-panel"><div className="page-head"><div><span className="eyebrow">QUICK ACTION</span><h2>Kebutuhan Operasional</h2><p>Aksi dikirim langsung ke backend.</p></div></div><div className="quick-actions"><button className="quick-action ice" onClick={()=>setSheet({type:'ice',title:'Pesan Es Kristal',quantity:'',unit:'kg',note:''})}><span>❄</span><b>Pesan Es Kristal</b><small>Buat permintaan es</small></button><button className="quick-action logistic" onClick={()=>openTab('stok')}><span>▣</span><b>Minta Restok</b><small>Logistik gerai</small></button><button className="quick-action emergency" onClick={()=>setSheet({type:'emergency',title:'Pesan Darurat',note:''})}><span>!</span><b>Pesan Darurat</b><small>Butuh bantuan segera</small></button></div><div className="info-card"><b>Penutupan Gerai</b><p>SPG tidak menutup sesi. Penutupan dilakukan melalui alur Checker sesuai kontrak backend.</p></div></section>}
    </main>

    <nav className="tabbar"><button className="tab" aria-selected={tab==='jual'} onClick={()=>openTab('jual')}><span className="tp">{I.sale}</span><b>Jual</b></button><button className="tab" aria-selected={tab==='stok'} onClick={()=>openTab('stok')}><span className="tp">{I.stock}</span><b>Stok</b></button><button className="fab" onClick={()=>setChatChoice(true)} aria-label="Pesan">{I.chat}<span>Pesan</span></button><button className="tab" aria-selected={tab==='riwayat'} onClick={()=>openTab('riwayat')}><span className="tp">{I.history}</span><b>Riwayat</b></button><button className="tab" aria-selected={tab==='aksi'} onClick={()=>openTab('aksi')}><span className="tp">{I.action}</span><b>Aksi</b></button></nav>
    {chatChoice&&<Sheet title="Kirim pesan ke" subtitle="Pilih kontak untuk membuka chat personal." onClose={()=>setChatChoice(false)}><div className="contact-list"><button onClick={()=>startChat('owner')} disabled={chatBusy}><span className="contact-avatar owner">O</span><span><b>Owner</b><small>Pemilik usaha</small></span><em>›</em></button><button onClick={()=>startChat('checker')} disabled={chatBusy}><span className="contact-avatar checker">C</span><span><b>Checker</b><small>Checker / pengecek</small></span><em>›</em></button></div></Sheet>}
    {chat&&<div className="chat-screen"><header className="chat-head"><button className="icon-btn" onClick={()=>{setChat(null);setConversation(null)}}>←</button><span className="contact-avatar">{chat.role==='owner'?'O':'C'}</span><div><b>{chat.full_name|| (chat.role==='owner'?'Owner':'Checker')}</b><small>Pesan personal · realtime</small></div></header><div className="chat-messages">{messages.length?messages.map(m=><div key={m.id} className={`bubble ${m.sender_id===context.user.id?'mine':'theirs'}`}><p>{m.body}</p><small>{dateTime(m.created_at)}</small></div>):<div className="chat-empty"><b>Belum ada percakapan</b><span>Mulai kirim pesan.</span></div>}</div><div className="chat-compose"><textarea value={chatText} onChange={e=>setChatText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat()}}} placeholder={`Tulis pesan ke ${chat.full_name||chat.role}…`}/><button className="send-btn" onClick={sendChat}>➤</button></div></div>}
    {sheet?.type==='ice'&&<Sheet title={sheet.title} subtitle="Permintaan dicatat ke sistem operasional." onClose={()=>setSheet(null)}><label className="form-field">Jumlah<input inputMode="decimal" type="number" min="0.1" step="0.1" value={sheet.quantity} onChange={e=>setSheet(s=>({...s,quantity:e.target.value}))}/></label><label className="form-field">Satuan<select value={sheet.unit} onChange={e=>setSheet(s=>({...s,unit:e.target.value}))}><option>kg</option><option>balok</option><option>pcs</option></select></label><label className="form-field">Catatan<textarea value={sheet.note} onChange={e=>setSheet(s=>({...s,note:e.target.value}))} placeholder="Opsional"/></label><button className="primary big" onClick={iceOrder}>Kirim permintaan</button></Sheet>}
    {sheet?.type==='emergency'&&<Sheet title={sheet.title} subtitle="Pesan ini akan diberitahukan kepada Owner/Checker." onClose={()=>setSheet(null)}><label className="form-field">Keterangan<textarea autoFocus value={sheet.note} onChange={e=>setSheet(s=>({...s,note:e.target.value}))} placeholder="Jelaskan kondisi yang perlu ditangani…"/></label><button className="danger big" onClick={emergency}>Kirim pesan darurat</button></Sheet>}
    <div className="header-floating"><PushNotificationControl/><button className="ghost" onClick={onLogout}>Keluar</button></div>
  </div>
}

function HistoryList({type,history}){
  const empty={sales:'Belum ada penjualan.',ice:'Belum ada permintaan es kristal.',restok:'Belum ada permintaan restok.',checker:'Belum ada pengecekkan.'}[type]
  const rows=history[type==='restok'?'restock':type]||[]
  if(!rows.length)return <div className="empty-state"><span>{type==='ice'?'❄':type==='checker'?'✓':'○'}</span><b>{empty}</b><small>Aktivitas akan tampil setelah ada data server.</small></div>
  return <div className="history-list">{rows.map(x=><article className="history-card" key={x.id}><div><b>{type==='sales'?rupiah(x.total_amount):type==='ice'?`${number(x.quantity)} ${x.unit}`:type==='checker'?(x.overall_result||x.status):x.status}</b><small>{dateTime(x.occurred_at||x.requested_at||x.inspected_at)}</small>{type==='sales'&&<small>{x.items?.length||0} menu · {x.payment_method||'-'}</small>}{x.note&&<p>{x.note}</p>}</div><span>{type==='sales'?'Penjualan':type==='ice'?'Es':type==='checker'?'Checker':'Restok'}</span></article>)}</div>
}
