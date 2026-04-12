import { useState, useEffect } from "react"
import { loadCaja } from "../../../../services/finanzas"
import { getJSON } from "../../../../lib/storage"
import { STORAGE_KEYS } from "../../../../lib/finanzas/constants"
import { logError } from "../../../../lib/logger"

// Lightweight read-only snapshot of Caja entries. Shared between
// JalarCaja and useCierres to avoid duplicate Supabase fetches.
// Reads localStorage instantly on mount, refreshes from Supabase
// in the background.
export function useCajaSnapshot() {
  const [entries, setEntries] = useState(() => {
    const local = getJSON(STORAGE_KEYS.CAJA)
    return Array.isArray(local) ? local : []
  })

  useEffect(() => {
    let cancelled = false
    loadCaja()
      .then(cloud => { if (!cancelled && Array.isArray(cloud)) setEntries(cloud) })
      .catch(e => logError("cajaSnapshot", e))
    return () => { cancelled = true }
  }, [])

  return entries
}
