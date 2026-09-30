export function Splash({ label='Menyiapkan Gerai…' }) {
  return (
    <main className="splash">
      <div className="splash-logo-wrap">
        <img className="splash-logo" src="/assets/brand-logo-transparent.png" alt="Teh Solo Ma'Gambreng" />
      </div>
      <h1>Teh Solo Ma'Gambreng</h1>
      <p>{label}</p>
      <div className="spinner" />
    </main>
  )
}
