import { useState, useMemo, useCallback } from "react"
import { STORAGE_KEYS } from "../../../../lib/finanzas/constants"
import { calcContract, normalizeContract, getContractHomeDate, parseLocalDate, getWeekNumberISO } from "../../../../lib/finanzas/helpers"
import { useSupabaseSync } from "../../hooks/useSupabaseSync"
import { loadContratos, saveContratos, deleteContratos } from "../../../../services/finanzas"
import { remove as removeLocal } from "../../../../lib/storage"
import { logError } from "../../../../lib/logger"

// Seed used the very first time, before anything is in localStorage or
// Supabase. Mirrors the original Coketín demo data 1:1 — including the
// soft-deleted N 0055 and the "Nilton y Agustin" extra row — so a fresh
// account opens to a realistic-looking module instead of 4 stub rows.
const INITIAL_CONTRACTS = [
  { id: "N 0051", cliente: "", total: 225, adelanto: 50, modalAdel: "Efectivo", recibioAdel: "Loli", fechaAdel: "", enCajaAdel: true, cobro: 175, modalCobro: "Efectivo", recibioCobro: "Loli", fechaCobro: "2026-03-31", enCajaCobro: true, descuento: 4, notas: "Movilidad 4 soles", depend: false, semana: 14, mes: 3, anio: 2026, eliminado: false },
  { id: "N 0052", cliente: "", total: 820, adelanto: 400, modalAdel: "Efectivo", recibioAdel: "Loli", fechaAdel: "", enCajaAdel: true, cobro: 420, modalCobro: "Efectivo", recibioCobro: "Loli", fechaCobro: "2026-04-02", enCajaCobro: true, descuento: 200, notas: "Realizado", depend: true, semana: 14, mes: 4, anio: 2026, eliminado: false },
  { id: "N 0053", cliente: "", total: 250, adelanto: 100, modalAdel: "Yape", recibioAdel: "Yo", fechaAdel: "2026-03-31", enCajaAdel: true, cobro: 150, modalCobro: "Yape", recibioCobro: "Yo", fechaCobro: "2026-04-01", enCajaCobro: true, descuento: 0, notas: "Realizado", depend: false, semana: 14, mes: 3, anio: 2026, eliminado: false },
  { id: "N 0054", cliente: "", total: 205, adelanto: 55, modalAdel: "Yape", recibioAdel: "Yo", fechaAdel: "2026-04-02", enCajaAdel: true, cobro: 150, modalCobro: "Yape", recibioCobro: "Mama", fechaCobro: "2026-04-02", enCajaCobro: true, descuento: 0, notas: "Realizado", depend: false, semana: 14, mes: 4, anio: 2026, eliminado: false },
  { id: "N 0055", cliente: "", total: 0, adelanto: 0, modalAdel: "", recibioAdel: "", fechaAdel: "", enCajaAdel: false, cobro: 0, modalCobro: "", recibioCobro: "", fechaCobro: "", enCajaCobro: false, descuento: 0, notas: "ELIMINADO", depend: false, semana: null, mes: null, anio: null, eliminado: true },
  { id: "N 0056", cliente: "", total: 380, adelanto: 100, modalAdel: "Efectivo", recibioAdel: "Loli", fechaAdel: "2026-04-04", enCajaAdel: true, cobro: 280, modalCobro: "Efectivo", recibioCobro: "Loli", fechaCobro: "2026-04-05", enCajaCobro: true, descuento: 10, notas: "Evento 05-abr", depend: false, semana: 14, mes: 4, anio: 2026, eliminado: false },
  { id: "N 0057", cliente: "", total: 200, adelanto: 100, modalAdel: "Yape", recibioAdel: "Yo", fechaAdel: "2026-04-04", enCajaAdel: true, cobro: 100, modalCobro: "Efectivo", recibioCobro: "Loli", fechaCobro: "2026-04-05", enCajaCobro: true, descuento: 0, notas: "Evento 05-abr", depend: false, semana: 14, mes: 4, anio: 2026, eliminado: false },
  { id: "extra-001", cliente: "Nilton y Agustin", total: 1170, adelanto: 0, modalAdel: "", recibioAdel: "", fechaAdel: "", enCajaAdel: false, noTrackAdel: true, cobro: 1170, modalCobro: "Yape", recibioCobro: "Yo", fechaCobro: "2026-04-02", enCajaCobro: true, noTrackCobro: false, descuento: 620, notas: "Nilton y Agustin", depend: true, semana: 14, mes: 4, anio: 2026, eliminado: false },
]

// Owns the contracts list, persistence, CRUD handlers, and the
// summary calculator (used by every view).
export function useContratos() {
  const [contracts, setContracts] = useState([])
  const [loaded, setLoaded] = useState(false)

  // Apply a saved blob (from cloud or local migration). Normalizes legacy
  // contracts that may be missing `anio` / `noTrack*` fields.
  const applyLoaded = useCallback((saved) => {
    if (Array.isArray(saved) && saved.length > 0) {
      setContracts(saved.map(c => {
        const norm = normalizeContract(c)
        if (!norm.anio) {
          const homeDate = getContractHomeDate(norm)
          const inferFrom = homeDate ? parseLocalDate(homeDate) : null
          norm.anio = inferFrom ? inferFrom.getFullYear() : new Date().getFullYear()
        }
        return norm
      }))
    } else {
      setContracts(INITIAL_CONTRACTS.map(normalizeContract))
    }
    setLoaded(true)
  }, [])

  useSupabaseSync({
    localKey: STORAGE_KEYS.CONTRATOS,
    loader: loadContratos,
    saver: saveContratos,
    applyLoaded,
    data: contracts,
    loaded,
  })

  const activeContracts = useMemo(() => contracts.filter(c => !c.eliminado), [contracts])

  const nextContractId = useMemo(() => {
    const nums = contracts.map(c => { const m = c.id.match(/N\s*(\d+)/); return m ? +m[1] : 0 })
    return `N ${String(Math.max(0, ...nums) + 1).padStart(4, "0")}`
  }, [contracts])

  const handleSave = useCallback((form) => {
    setContracts(prev => {
      const exists = prev.find(c => c.id === form.id)
      return exists ? prev.map(c => c.id === form.id ? form : c) : [...prev, form]
    })
  }, [])

  const handleDelete = useCallback((id) => {
    setContracts(prev => prev.map(c => c.id === id ? { ...c, eliminado: true, notas: "ELIMINADO" } : c))
  }, [])

  const handleRestore = useCallback((id) => {
    setContracts(prev => prev.map(c => c.id === id ? { ...c, eliminado: false, notas: "" } : c))
  }, [])

  // Hard delete — drops the row from the array entirely. The next
  // debounced save uploads the new array (without it) to Supabase, so
  // the contract is gone everywhere — local, memory, cloud.
  const handlePermanentDelete = useCallback((id) => {
    setContracts(prev => prev.filter(c => c.id !== id))
  }, [])

  // "Resetear datos originales" — wipes the cloud row, the localStorage
  // cache, and re-seeds with INITIAL_CONTRACTS. The debounced save will
  // immediately upload the new seed to Supabase, so the next refresh
  // also sees the seed (not the deleted row).
  const handleReset = useCallback(async () => {
    try { await deleteContratos() }
    catch (e) { logError("contratos.reset", e) }
    removeLocal(STORAGE_KEYS.CONTRATOS)
    setContracts(INITIAL_CONTRACTS.map(normalizeContract))
  }, [])

  // Summary calculator. periodCtx={type:"semana"|"mes", value, year} or null
  // for "all of `list`". When given a periodCtx it splits ganancia into
  // "deNuevos" (contracts whose home date falls in the period) and
  // "deAnteriores" (cobros from previous-period contracts).
  // Classify a payment entry's modalidad as Yape-like or Efectivo
  const addIngreso = (modalidad, monto, acc) => {
    if (!monto) return
    if (modalidad === "Yape" || modalidad === "Transferencia" || modalidad === "Plin") acc.yape += monto
    else if (modalidad === "Efectivo") acc.efectivo += monto
  }

  const calcSummary = useCallback((list, periodCtx) => {
    if (!periodCtx) {
      let ganancia = 0, descuentos = 0, enCaja = 0, pendiente = 0
      const ing = { yape: 0, efectivo: 0 }
      const porPersona = { Yo: 0, Loli: 0, Mama: 0, Jose: 0, Otro: 0 }
      list.forEach(c => {
        const calc = calcContract(c)
        ganancia += calc.ganancia; descuentos += c.descuento || 0; enCaja += calc.enCaja; pendiente += calc.pendiente
        ;(c.adelantos || []).forEach(a => { if (!a.noTrack && a.enCaja) addIngreso(a.modalidad, a.monto, ing) })
        ;(c.cobros || []).forEach(a => { if (!a.noTrack && a.enCaja) addIngreso(a.modalidad, a.monto, ing) })
        if (calc.porRecibir > 0) {
          const personas = [...new Set([...(c.adelantos || []).map(a => a.recibio), ...(c.cobros || []).map(a => a.recibio)].filter(Boolean))]
          const pp = calc.porRecibir / (personas.length || 1)
          personas.forEach(p => { if (p in porPersona) porPersona[p] += pp; else porPersona["Otro"] += pp })
        }
      })
      return { registros: list.length, ganancia, descuentos, enCaja, pendiente, ingresoYape: ing.yape, ingresoEfectivo: ing.efectivo, deNuevos: 0, deAnteriores: 0, porPersona }
    }

    const dateInPeriod = (dateStr) => {
      const d = parseLocalDate(dateStr); if (!d || isNaN(d)) return false
      if (d.getFullYear() !== periodCtx.year) return false
      if (periodCtx.type === "semana") return getWeekNumberISO(d) === periodCtx.value
      if (periodCtx.type === "mes") return d.getMonth() + 1 === periodCtx.value
      return false
    }

    let registros = 0, deNuevos = 0, deAnteriores = 0, enCajaTotal = 0, descuentos = 0, pendiente = 0
    const ing = { yape: 0, efectivo: 0 }
    const porPersona = { Yo: 0, Loli: 0, Mama: 0, Jose: 0, Otro: 0 }
    activeContracts.forEach(c => {
      const homeDate = getContractHomeDate(c)
      const isHome = homeDate ? dateInPeriod(homeDate) : false
      // Check if any cobro falls in this period
      const cobrosInPeriod = (c.cobros || []).filter(a => !a.noTrack && dateInPeriod(a.fecha))

      if (isHome) {
        registros++
        const calc = calcContract(c)
        deNuevos += calc.ganancia; descuentos += c.descuento || 0; pendiente += calc.pendiente
        enCajaTotal += calc.enCaja
        ;(c.adelantos || []).forEach(a => { if (!a.noTrack && a.enCaja) addIngreso(a.modalidad, a.monto, ing) })
        ;(c.cobros || []).forEach(a => { if (!a.noTrack && a.enCaja) addIngreso(a.modalidad, a.monto, ing) })
        if (calc.porRecibir > 0) {
          const personas = [...new Set([...(c.adelantos || []).map(a => a.recibio), ...(c.cobros || []).map(a => a.recibio)].filter(Boolean))]
          const pp = calc.porRecibir / (personas.length || 1)
          personas.forEach(p => { if (p in porPersona) porPersona[p] += pp; else porPersona["Otro"] += pp })
        }
      } else if (cobrosInPeriod.length > 0) {
        cobrosInPeriod.forEach(a => {
          deAnteriores += a.monto || 0
          if (a.enCaja) enCajaTotal += a.monto || 0
          addIngreso(a.modalidad, a.monto, ing)
        })
      }
    })
    return { registros, ganancia: deNuevos + deAnteriores, descuentos, enCaja: enCajaTotal, pendiente, ingresoYape: ing.yape, ingresoEfectivo: ing.efectivo, deNuevos, deAnteriores, porPersona }
  }, [activeContracts])

  return {
    loaded, contracts, activeContracts, nextContractId,
    handleSave, handleDelete, handleRestore, handlePermanentDelete, handleReset,
    calcSummary,
  }
}
