export function ClosedGate({ store, onOpen }) {
  return <main className="gate-page"><section className="gate-card"><div className="eyebrow">STATUS GERAI</div><div className="status-pill closed">● TUTUP</div><h1>{store?.name || 'Gerai'}</h1><p className="muted">Gerai sedang tutup. Buka Gerai hanya dapat dilakukan oleh SPG yang aktif.</p><button className="primary big" onClick={onOpen}>Buka Sekarang</button></section></main>
}
