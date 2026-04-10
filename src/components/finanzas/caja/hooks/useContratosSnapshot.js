import { useState, useEffect } from "react"
import { loadContratos } from "../../../../services/finanzas"
import { getJSON } from "../../../../lib/storage"
import { STORAGE_KEYS } from "../../../../lib/finanzas/constants"
import { logError } from "../../../../lib/logger"

// Lightweight read-only snapshot of the contracts list, used by Caja to
// reconcile its "del contrato" balance against what Contratos thinks is
// "en caja". We don't go through useContratos because:
//   1. We don't need its CRUD handlers, modals, or persistence logic.
//   2. Mounting useContratos here would create a SECOND useSupabaseSync
//      for the same key, racing the real one over in ContratosModule.
//
// Reads localStorage instantly on mount and refreshes from Supabase
// in the background. Also re-reads localStorage whenever the tab
// regains focus — that way edits made in the Contratos tab become
// visible here without a full page reload.
export function useContratosSnapshot() {
  const [contracts, setContracts] = useState(() => {
    const local = getJSON(STORAGE_KEYS.CONTRATOS)
    return Array.isArray(local) ? local : []
  })

  useEffect(() => {
    let cancelled = false
    // Initial cloud fetch.
    loadContratos()
      .then(cloud => { if (!cancelled && Array.isArray(cloud)) setContracts(cloud) })
      .catch(e => logError("caja.contratosSnapshot", e))

    // Re-read from localStorage whenever the user switches back to this
    // tab. ContratosModule writes to localStorage on every change, so
    // this picks up any edits made while the user was in the other tab.
    const onFocus = () => {
      const fresh = getJSON(STORAGE_KEYS.CONTRATOS)
      if (Array.isArray(fresh)) setContracts(fresh)
    }
    window.addEventListener("focus", onFocus)

    return () => { cancelled = true; window.removeEventListener("focus", onFocus) }
  }, [])

  return contracts
}
