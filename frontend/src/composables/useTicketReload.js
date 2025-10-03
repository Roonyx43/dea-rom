// src/composables/useTicketsReload.js
export function triggerTicketsReload(target = 'all') {
  // target: 'aprovados' | 'pcp' | 'recusados' | 'all'
  window.dispatchEvent(new CustomEvent('tickets:reload', { detail: { target } }))
}

export function listenTicketsReload(targets, handler) {
  // targets pode ser string ou array de strings
  const wanted = Array.isArray(targets) ? targets : [targets]
  const onEvt = (e) => {
    const t = e.detail?.target || 'all'
    if (t === 'all' || wanted.includes(t)) handler(t)
  }
  window.addEventListener('tickets:reload', onEvt)
  return () => window.removeEventListener('tickets:reload', onEvt)
}
