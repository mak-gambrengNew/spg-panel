export function ClosedGate({store,onOpen}){
  return <main className="gate-page">
    <section className="gate-card">
      <img className="login-logo" src="/assets/brand-logo-transparent.png"/>
      <div className="status-pill closed">● TUTUP</div>
      <h1>{store?.name||'Gerai'}</h1>
      <p>
        Gerai belum memiliki sesi operasional aktif.
        SPG dapat membuka sesi baru dengan mengisi kas dan stok awal.
      </p>
      <button className="primary big" onClick={onOpen}>
        Siapkan Buka Gerai
      </button>
    </section>
  </main>
}