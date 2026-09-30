import { rupiah } from '../lib/format'
export function MenuGrid({ menus, cart, onAdd }) { return <div className="menu-grid">{menus.map(m=><button className="menu-card" key={m.id} onClick={()=>onAdd(m)}><span className="menu-category">{m.category || 'Menu'}</span><strong>{m.name}</strong><span>{rupiah(m.price)}</span>{cart[m.id]?<b className="cart-badge">{cart[m.id]}</b>:null}</button>)}</div> }
