import { useEffect, useRef } from "react"
import { getJSON, setJSON } from "../../../lib/storage"
import { logError } from "../../../lib/logger"

// Two-tier persistence for the Finanzas modules:
//
//   1. On mount, try Supabase via `loader()`. If that returns null
//      (first time after migration) and there's existing data in
//      localStorage under `localKey`, push that data UP to Supabase
//      automatically — the user never loses their pre-cloud work.
//   2. After every change, save to BOTH localStorage (instant, offline
//      fallback) AND Supabase (debounced 600ms, ground truth).
//   3. On unmount / page hide / before unload, flush both immediately.
//
// `applyLoaded(blob)` is how the parent hook applies whatever we managed
// to load. The parent owns the actual useState calls.
//
// `data` is the current state to persist. `loaded` gates persistence so
// we don't overwrite real cloud data with the parent's initial defaults
// during the very first render.
export function useSupabaseSync({
  localKey,
  loader,
  saver,
  applyLoaded,
  data,
  loaded,
  delay = 600,
}) {
  const initialized = useRef(false)
  const timer = useRef(null)
  const latest = useRef(data)
  latest.current = data

  // ── Initial load (runs once) ────────────────────────────────────
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    let cancelled = false
    ;(async () => {
      let cloud = null
      try {
        cloud = await loader()
      } catch (e) {
        logError(`finanzas.${localKey}.load`, e)
        // Network/auth error — fall back to localStorage entirely.
        const local = getJSON(localKey)
        if (local && !cancelled) applyLoaded(local)
        return
      }

      if (cancelled) return

      if (cloud) {
        // Cloud has data → that's the source of truth.
        applyLoaded(cloud)
        // Mirror into localStorage so we have an offline cache.
        setJSON(localKey, cloud)
      } else {
        // Cloud is empty. Migrate from localStorage if there's anything.
        const local = getJSON(localKey)
        if (local) {
          applyLoaded(local)
          // Push local data UP to cloud so it lives on every device.
          try { await saver(local) }
          catch (e) { logError(`finanzas.${localKey}.migrate`, e) }
        }
      }
    })()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Debounced save on every change ──────────────────────────────
  useEffect(() => {
    if (!loaded) return
    // Always mirror to localStorage immediately — that way a hard crash
    // never loses the latest typed value.
    setJSON(localKey, data)

    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      saver(latest.current).catch(e => logError(`finanzas.${localKey}.save`, e))
      timer.current = null
    }, delay)

    return () => {
      if (timer.current) {
        clearTimeout(timer.current)
        timer.current = null
      }
    }
  }, [localKey, data, loaded, delay, saver])

  // ── Flush on tab hide / unload ──────────────────────────────────
  useEffect(() => {
    if (!loaded) return
    const flush = () => {
      setJSON(localKey, latest.current)
      saver(latest.current).catch(e => logError(`finanzas.${localKey}.flush`, e))
    }
    const onVisibility = () => { if (document.visibilityState === "hidden") flush() }
    window.addEventListener("beforeunload", flush)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("beforeunload", flush)
      document.removeEventListener("visibilitychange", onVisibility)
      flush()
    }
  }, [localKey, loaded, saver])
}
