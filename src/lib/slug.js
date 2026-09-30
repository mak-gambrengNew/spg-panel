export function getGeraiSlug() {
  const parts = window.location.pathname.split('/').filter(Boolean)
  return parts[0] || new URLSearchParams(window.location.search).get('slug') || ''
}
