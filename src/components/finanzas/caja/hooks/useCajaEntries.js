import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { getJSON, setJSON } from "../../../../lib/storage"
import { STORAGE_KEYS } from "../../../../lib/finanzas/constants"
import { peruToday, getWeekNumberISO } from "../../../../lib/finanzas/helpers"

// Owns the cash-entries list, persistence, and CRUD handlers.
// Auto-numbers any entry that doesn't yet have a `num` field on first
// load (so old data still gets stable display numbers).
export function useCajaEntries() {
  const [entries, setEntries] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const saved = getJSON(STORAGE_KEYS.CAJA)
    if (Array.isArray(saved)) {
      const withNum = saved.filter(e => e.num)
      const maxNum = withNum.length > 0 ? Math.max(...withNum.map(e => e.num)) : 0
      let next = maxNum
      const sorted = [...saved].sort((a, b) => (a.id || 0) - (b.id || 0))
      const numMap = {}
      sorted.forEach(e => { if (!e.num) { next++; numMap[e.id] = next } })
      const list = saved.map(e => numMap[e.id] ? { ...e, num: numMap[e.id] } : e)
      setEntries(list)
    }
    setLoaded(true)
  }, [])

  // Debounced save.
  const saveTimer = useRef(null)
  useEffect(() => {
    if (!loaded) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setJSON(STORAGE_KEYS.CAJA, entries), 400)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [entries, loaded])

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

  const activeEntries = useMemo(() => entries.filter(e => !e.eliminado), [entries])
  const deletedEntries = useMemo(() => entries.filter(e => e.eliminado), [entries])

  const mesesDisponibles = useMemo(() => {
    const set = new Set(activeEntries.map(e => e.fecha ? e.fecha.slice(0, 7) : null).filter(Boolean))
    return [...set].sort().reverse()
  }, [activeEntries])

  const semanasDisponibles = useMemo(() => {
    const set = new Set(activeEntries.map(e => { if (!e.fecha) return null; return getWeekNumberISO(new Date(e.fecha + "T12:00:00")) }).filter(Boolean))
    return [...set].sort((a, b) => a - b)
  }, [activeEntries])

  return {
    loaded, entries, activeEntries, deletedEntries,
    addEntry, removeEntry, restoreEntry, permanentDelete,
    mesesDisponibles, semanasDisponibles,
  }
}
