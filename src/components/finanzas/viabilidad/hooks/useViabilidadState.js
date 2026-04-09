import { useState, useEffect, useRef } from "react"
import { getJSON, setJSON } from "../../../../lib/storage"
import { STORAGE_KEYS } from "../../../../lib/finanzas/constants"

// Default seed data — only used the first time, before anything is in localStorage.
const INIT_WORKERS = [
  { name: "Juan", pagoSemanal: 360, diasTrabSem: 6, diaDescanso: "Martes", extrasNoTrabajo: 0, extrasTrabajoExtra: 0, extrasTrabajoTienda: 0, diasMarcados: {}, negocioDepende: false },
  { name: "Lolimar", pagoSemanal: 400, diasTrabSem: 6, diaDescanso: "Domingo", extrasNoTrabajo: 0, extrasTrabajoExtra: 0, extrasTrabajoTienda: 0, diasMarcados: {}, negocioDepende: true },
  { name: "jose", pagoSemanal: 185, diasTrabSem: 6, diaDescanso: "Domingo", extrasNoTrabajo: 0, extrasTrabajoExtra: 0, extrasTrabajoTienda: 0, diasMarcados: {}, negocioDepende: false },
]
const INIT_SERVICES = [
  { nombre: "internet", pagoMensual: 200, diaPago: "", divisor: 25, nota: "" },
  { nombre: "agua", pagoMensual: 300, diaPago: 21, divisor: 25, nota: "" },
  { nombre: "luz", pagoMensual: 500, diaPago: 17, divisor: 25, nota: "" },
  { nombre: "pollo", pagoMensual: 1700, diaPago: 30, divisor: 25, nota: "" },
]
const INIT_APOYOS = [
  { concepto: "alquiler", montoMensual: 1000, divisor: 30, nota: "" },
]

// One hook owns the entire persisted state of the Viabilidad module.
// Loads on mount, debounces saves to avoid spamming localStorage on every key.
export function useViabilidadState() {
  const [year, setYear] = useState(2026)
  const [month, setMonth] = useState(4)
  const [workers, setWorkers] = useState(INIT_WORKERS)
  const [services, setServices] = useState(INIT_SERVICES)
  const [apoyos, setApoyos] = useState(INIT_APOYOS)
  const [trackerData, setTrackerData] = useState({})
  const [diaAnalisis, setDiaAnalisis] = useState(5)
  const [cajaSemanaSol, setCajaSemanaSol] = useState(1010)
  const [cajaAcumMes, setCajaAcumMes] = useState(0)
  const [contarApoyo, setContarApoyo] = useState("SI")
  const [diasOpSemana, setDiasOpSemana] = useState(6)
  const [cobExtraAll, setCobExtraAll] = useState({})
  const [loaded, setLoaded] = useState(false)

  // Hydrate once on mount.
  useEffect(() => {
    const saved = getJSON(STORAGE_KEYS.VIABILIDAD)
    if (saved && typeof saved === "object") {
      if (typeof saved.year === "number") setYear(saved.year)
      if (typeof saved.month === "number") setMonth(saved.month)
      if (Array.isArray(saved.workers)) setWorkers(saved.workers)
      if (Array.isArray(saved.services)) setServices(saved.services)
      if (Array.isArray(saved.apoyos)) setApoyos(saved.apoyos)
      if (saved.trackerData && typeof saved.trackerData === "object") setTrackerData(saved.trackerData)
      if (typeof saved.diaAnalisis === "number") setDiaAnalisis(saved.diaAnalisis)
      if (typeof saved.cajaSemanaSol === "number") setCajaSemanaSol(saved.cajaSemanaSol)
      if (typeof saved.cajaAcumMes === "number") setCajaAcumMes(saved.cajaAcumMes)
      if (saved.contarApoyo === "SI" || saved.contarApoyo === "NO") setContarApoyo(saved.contarApoyo)
      if (typeof saved.diasOpSemana === "number") setDiasOpSemana(saved.diasOpSemana)
      if (saved.cobExtraAll && typeof saved.cobExtraAll === "object") setCobExtraAll(saved.cobExtraAll)
    }
    setLoaded(true)
  }, [])

  // Debounced save. The saveTimer ref keeps the latest scheduled save so a
  // burst of edits collapses into one localStorage write ~400ms later.
  const saveTimer = useRef(null)
  useEffect(() => {
    if (!loaded) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      setJSON(STORAGE_KEYS.VIABILIDAD, {
        year, month, workers, services, apoyos, trackerData,
        diaAnalisis, cajaSemanaSol, cajaAcumMes, contarApoyo, diasOpSemana, cobExtraAll,
      })
    }, 400)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [loaded, year, month, workers, services, apoyos, trackerData, diaAnalisis, cajaSemanaSol, cajaAcumMes, contarApoyo, diasOpSemana, cobExtraAll])

  return {
    loaded,
    year, setYear, month, setMonth,
    workers, setWorkers,
    services, setServices,
    apoyos, setApoyos,
    trackerData, setTrackerData,
    diaAnalisis, setDiaAnalisis,
    cajaSemanaSol, setCajaSemanaSol,
    cajaAcumMes, setCajaAcumMes,
    contarApoyo, setContarApoyo,
    diasOpSemana, setDiasOpSemana,
    cobExtraAll, setCobExtraAll,
  }
}
