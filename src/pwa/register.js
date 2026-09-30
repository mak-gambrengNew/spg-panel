let registrationPromise

export function registerPwa() {
  if (!('serviceWorker' in navigator)) return
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })

  const activateUpdate = registration => {
    if (!registration) return
    registration.update().catch(() => {})
    if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing
      if (!worker) return
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
        }
      })
    })
  }

  window.addEventListener('load', () => {
    registrationPromise = navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then(registration => { activateUpdate(registration); return registration })
      .catch(() => null)
  }, { once: true })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') registrationPromise?.then(reg => { activateUpdate(reg) }).catch(() => {})
  })
}
