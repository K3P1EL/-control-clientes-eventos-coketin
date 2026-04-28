import { useEffect, useRef } from "react"
import { setJSON } from "./storage"

// Persists `data` to localStorage under `key` with a debounce. Critically:
//   1) Cancels any pending save when `data` changes (the debounce itself).
//   2) On unmount → flushes immediately so we don't lose the last edits.
//   3) On page hide / before unload → flushes immediately for the same reason.
//
// `loaded` gates the first run so we don't overwrite real data with the
// initial useState defaults during the very first render.
//
// Lives in lib/ (not in a component folder) because it's reusable by ANY
// part of the app, not just the Finanzas module.
export function useDebouncedPersist(key, data, loaded, delay = 400) {
  const timer = useRef(null)
  const latest = useRef(data)
  // eslint-disable-next-line react-hooks/refs
  latest.current = data

  // Schedule a debounced save on every data change.
  useEffect(() => {
    if (!loaded) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setJSON(key, latest.current)
      timer.current = null
    }, delay)
    return () => {
      if (timer.current) {
        clearTimeout(timer.current)
        timer.current = null
      }
    }
  }, [key, data, loaded, delay])

  // Flush on tab hide / before unload — covers refresh, tab close,
  // navigating to another site, app switch on mobile, etc.
  useEffect(() => {
    if (!loaded) return
    const flush = () => { setJSON(key, latest.current) }
    const onVisibility = () => { if (document.visibilityState === "hidden") flush() }
    window.addEventListener("beforeunload", flush)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("beforeunload", flush)
      document.removeEventListener("visibilitychange", onVisibility)
      // Flush one last time when this hook unmounts (e.g. user navigates
      // away from Finanzas to another tab in the app).
      flush()
    }
  }, [key, loaded])
}
