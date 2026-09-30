const DB = 'pwa-gerai'
const VERSION = 1
const STORE = 'pending-sales'

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'transaction_id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore(mode, fn) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const store = tx.objectStore(STORE)
    const result = fn(store)
    tx.oncomplete = () => resolve(result)
    tx.onerror = () => reject(tx.error)
  })
}

export const queue = {
  async put(item) { return withStore('readwrite', s => s.put(item)) },
  async remove(id) { return withStore('readwrite', s => s.delete(id)) },
  async all() { return withStore('readonly', s => new Promise((resolve, reject) => { const r=s.getAll(); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error) })) },
}
