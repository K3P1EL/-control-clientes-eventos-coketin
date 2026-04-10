import { useEffect, useRef } from "react"
import { getJSON, setJSON } from "../../../lib/storage"
import { logError } from "../../../lib/logger"

// In-memory cache shared across mounts of the SAME hook in the same SPA
// session. Lets a user bounce between Finanzas and another tab without
// re-fetching from Supabase every time. Cleared on full page reload.
//
// Layout: { [localKey]: { data: <blob>, fetchedAt: <ms> } }
const memoryCache = new Map()

// How long an in-memory cache entry counts as "fresh enough" to skip
// the network round-trip when remounting the hook within the same SPA
// session. We still WRITE through to Supabase on every change, so this
// just controls reads.
const MEMORY_TTL_MS = 60_000

// Two-tier persistence for the Finanzas modules:
//
//   1. SYNCHRONOUS hydration: on mount, we IMMEDIATELY apply whatever's
//      in memory cache (best) or localStorage (fallback) BEFORE the
//      network round-trip starts. The user sees real data instantly
//      instead of "Cargando..."
//   2. ASYNC reconciliation: in parallel, we hit Supabase. If the cloud
//      version differs from what we already painted, we re-apply.
//   3. WRITES go to localStorage instantly (offline cache) AND to
//      Supabase debounced (600ms).
//   4. On unmount / page hide / before unload, flush both immediately.
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

  // ── Initial hydration + cloud reconciliation (runs once) ─────────
  // Critical: applyLoaded MUST be called exactly once on every code
  // path so the parent's `loaded` flag flips and we leave "Cargando".
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // STEP 1 — synchronous instant render.
    // Best source: in-memory cache from a recent mount in this session.
    // Fallback: localStorage. Worst case: null (parent uses defaults).
    let painted = null
    const cached = memoryCache.get(localKey)
    if (cached && Date.now() - cached.fetchedAt < MEMORY_TTL_MS) {
      painted = cached.data
    } else {
      painted = getJSON(localKey)
    }
    applyLoaded(painted)

    // STEP 2 — async reconciliation with cloud, in parallel.
    // If the cloud version differs from what we just painted, re-apply
    // and update both caches. If it matches, no work.
    let cancelled = false
    ;(async () => {
      let cloud = null
      let cloudFailed = false
      try {
        cloud = await loader()
      } catch (e) {
        logError(`finanzas.${localKey}.load`, e)
        cloudFailed = true
      }

      if (cancelled) return

      if (cloud) {
        // Update memory cache regardless.
        memoryCache.set(localKey, { data: cloud, fetchedAt: Date.now() })
        // Only re-apply if it's actually different from what we painted,
        // to avoid stomping on edits the user made in the few hundred
        // milliseconds the request took.
        if (JSON.stringify(cloud) !== JSON.stringify(painted)) {
          applyLoaded(cloud)
          setJSON(localKey, cloud)
        }
        return
      }

      // Cloud is empty (first time on this account) or call failed.
      // If we have local data and the cloud is reachable, push UP so it
      // lives on every device.
      if (!cloudFailed && painted) {
        try {
          await saver(painted)
          memoryCache.set(localKey, { data: painted, fetchedAt: Date.now() })
        }
        catch (e) { logError(`finanzas.${localKey}.migrate`, e) }
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
    // Keep the in-memory cache fresh too so a tab switch doesn't show
    // stale data even momentarily.
    memoryCache.set(localKey, { data, fetchedAt: Date.now() })

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
