import { useState, useMemo, useCallback } from "react"
import { STORAGE_KEYS } from "../../../../lib/finanzas/constants"
import { peruToday } from "../../../../lib/finanzas/helpers"
import { useSupabaseSync } from "../../hooks/useSupabaseSync"
import { loadCaja, saveCaja, deleteCaja } from "../../../../services/finanzas"
import { remove as removeLocal } from "../../../../lib/storage"
import { logError } from "../../../../lib/logger"

// Seed data — the real movements the user tracked in the original
// Coketín spreadsheet. Only used the very first time (no cloud row,
// no local cache). Ids are fake fixed timestamps so they're stable
// across reloads and don't collide with Date.now() used for new entries.
const INITIAL_ENTRIES = [
  { id: 1700000001, num: 1,  fecha: "2026-03-31", tipo: "ingreso", monto: 100,  concepto: "Sin concepto",                    quien: "", modalidad: "Yape",     delNegocio: true,  deContrato: true,  categoria: "" },
  { id: 1700000002, num: 2,  fecha: "2026-04-01", tipo: "ingreso", monto: 150,  concepto: "Sin concepto",                    quien: "", modalidad: "Yape",     delNegocio: true,  deContrato: true,  categoria: "" },
  { id: 1700000003, num: 3,  fecha: "2026-04-01", tipo: "ingreso", monto: 55,   concepto: "Sin concepto",                    quien: "", modalidad: "Yape",     delNegocio: true,  deContrato: true,  categoria: "" },
  { id: 1700000004, num: 4,  fecha: "2026-04-01", tipo: "ingreso", monto: 150,  concepto: "Sin concepto",                    quien: "", modalidad: "Yape",     delNegocio: true,  deContrato: true,  categoria: "" },
  { id: 1700000005, num: 5,  fecha: "2026-04-01", tipo: "ingreso", monto: 1170, concepto: "Sin concepto",                    quien: "", modalidad: "Yape",     delNegocio: true,  deContrato: true,  categoria: "" },
  { id: 1700000006, num: 6,  fecha: "2026-04-01", tipo: "egreso",  monto: 620,  concepto: "Nilton + Agustin",                quien: "", modalidad: "Yape",     delNegocio: true,  deContrato: true,  categoria: "" },
  { id: 1700000007, num: 7,  fecha: "2026-04-04", tipo: "ingreso", monto: 941,  concepto: "Sin concepto",                    quien: "", modalidad: "Efectivo", delNegocio: true,  deContrato: true,  categoria: "" },
  { id: 1700000008, num: 8,  fecha: "2026-04-04", tipo: "ingreso", monto: 100,  concepto: "Sin concepto",                    quien: "", modalidad: "Yape",     delNegocio: true,  deContrato: true,  categoria: "", eliminado: true },
  { id: 1700000009, num: 9,  fecha: "2026-03-04", tipo: "ingreso", monto: 1700, concepto: "De 1707 soles el jose entrego",   quien: "", modalidad: "Efectivo", delNegocio: false, deContrato: false, categoria: "" },
  { id: 1700000010, num: 10, fecha: "2026-03-04", tipo: "ingreso", monto: 50,   concepto: "Darle A vanesa",                  quien: "", modalidad: "Efectivo", delNegocio: false, deContrato: false, categoria: "" },
  { id: 1700000011, num: 11, fecha: "2026-04-05", tipo: "egreso",  monto: 350,  concepto: "Loli",                            quien: "", modalidad: "Yape",     delNegocio: true,  deContrato: false, categoria: "sueldo" },
  { id: 1700000012, num: 12, fecha: "2026-04-05", tipo: "egreso",  monto: 360,  concepto: "Juan",                            quien: "", modalidad: "Yape",     delNegocio: true,  deContrato: false, categoria: "sueldo" },
  { id: 1700000013, num: 13, fecha: "2026-04-05", tipo: "ingreso", monto: 1000, concepto: "Ahorro de Jenny",                 quien: "", modalidad: "Yape",     delNegocio: false, deContrato: false, categoria: "" },
  { id: 1700000014, num: 14, fecha: "2026-04-05", tipo: "ingreso", monto: 370,  concepto: "Sin concepto",                    quien: "", modalidad: "Efectivo", delNegocio: true,  deContrato: true,  categoria: "" },
]

// Owns the cash-entries list, persistence, and CRUD handlers.
// Auto-numbers any entry that doesn't yet have a `num` field on first
// load (so old data still gets stable display numbers).
export function useCajaEntries() {
  const [entries, setEntries] = useState([])
  const [loaded, setLoaded] = useState(false)

  // Apply a saved blob (cloud or local). Auto-numbers entries that don't
  // have `num` so legacy data still gets stable display numbers.
  // If nothing was ever saved (null OR empty array), seed with the
  // real movements the user tracked in the original spreadsheet.
  const applyLoaded = useCallback((saved) => {
    if (Array.isArray(saved) && saved.length > 0) {
      const withNum = saved.filter(e => e.num)
      const maxNum = withNum.length > 0 ? Math.max(...withNum.map(e => e.num)) : 0
      let next = maxNum
      const sorted = [...saved].sort((a, b) => (a.id || 0) - (b.id || 0))
      const numMap = {}
      sorted.forEach(e => { if (!e.num) { next++; numMap[e.id] = next } })
      const list = saved.map(e => numMap[e.id] ? { ...e, num: numMap[e.id] } : e)
      setEntries(list)
    } else {
      setEntries(INITIAL_ENTRIES)
    }
    setLoaded(true)
  }, [])

  useSupabaseSync({
    localKey: STORAGE_KEYS.CAJA,
    loader: loadCaja,
    saver: saveCaja,
    applyLoaded,
    data: entries,
    loaded,
  })

  const addEntry = useCallback((form, editId) => {
    if (!form.monto || form.monto <= 0) return
    setEntries(prev => {
      if (editId) {
        return prev.map(e => e.id === editId ? { ...form, id: editId, num: e.num, fecha: form.fecha || peruToday(), concepto: form.concepto || "Sin concepto" } : e)
      }
      const nextNum = prev.length > 0 ? Math.max(...prev.map(e => e.num || 0)) + 1 : 1
      const entry = { ...form, id: Date.now(), num: nextNum, fecha: form.fecha || peruToday(), concepto: form.concepto || "Sin concepto" }
      return [entry, ...prev]
    })
  }, [])

  const removeEntry = useCallback((id) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, eliminado: true } : e))
  }, [])

  const restoreEntry = useCallback((id) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, eliminado: false } : e))
  }, [])

  const permanentDelete = useCallback((id) => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [])

  // "Resetear datos originales" — wipes cloud + local and reseeds with
  // INITIAL_ENTRIES. The debounced save uploads the new seed, so the
  // next refresh also sees the seed instead of the cleared row.
  const handleReset = useCallback(async () => {
    try { await deleteCaja() }
    catch (e) { logError("caja.reset", e) }
    removeLocal(STORAGE_KEYS.CAJA)
    setEntries(INITIAL_ENTRIES)
  }, [])

  const activeEntries = useMemo(() => entries.filter(e => !e.eliminado), [entries])
  const deletedEntries = useMemo(() => entries.filter(e => e.eliminado), [entries])

  return {
    loaded, entries, activeEntries, deletedEntries,
    addEntry, removeEntry, restoreEntry, permanentDelete, handleReset,
  }
}
