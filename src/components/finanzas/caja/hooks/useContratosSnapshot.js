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
// Instead this just reads — first from localStorage (instant, what the
// user just saw), then upgrades from cloud in the background. Both
// fall through gracefully if there's nothing.
export function useContratosSnapshot() {
  const [contracts, setContracts] = useState(() => {
    // Synchronous warm read from localStorage so reconciliation is
    // visible immediately on first paint, without waiting for the cloud.
    const local = getJSON(STORAGE_KEYS.CONTRATOS)
    return Array.isArray(local) ? local : []
  })

  useEffect(() => {
    let cancelled = false
    loadContratos()
      .then(cloud => {
        if (cancelled) return
        if (Array.isArray(cloud)) setContracts(cloud)
      })
      .catch(e => logError("caja.contratosSnapshot", e))
    return () => { cancelled = true }
  }, [])

  return contracts
}
