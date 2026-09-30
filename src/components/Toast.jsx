import { useEffect, useState } from 'react'

let push = null
export function toast(message, type='info') { push?.({ message, type, id: crypto.randomUUID() }) }
export function ToastHost() {
  const [items, setItems] = useState([])
  useEffect(() => { push = item => { setItems(x => [...x, item]); setTimeout(() => setItems(x => x.filter(y => y.id !== item.id)), 3200) }; return () => { push=null } }, [])
  return <div className="toast-stack" aria-live="polite">{items.map(x => <div className={`toast ${x.type}`} key={x.id}>{x.message}</div>)}</div>
}
