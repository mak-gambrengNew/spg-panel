import { useSyncExternalStore } from 'react'

let state = { phase: 'booting', slug: '', context: null, error: null, online: navigator.onLine, syncing: false, pending: 0 }
const listeners = new Set()
const emit = () => listeners.forEach(fn => fn())
export const geraiStore = {
  get: () => state,
  set: patch => { state = { ...state, ...patch }; emit() },
  subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn) },
}
export const useGerai = () => useSyncExternalStore(geraiStore.subscribe, geraiStore.get, geraiStore.get)
