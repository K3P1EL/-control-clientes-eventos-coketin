import { useState, useCallback } from "react"
import { STORAGE_KEYS } from "../../../../lib/finanzas/constants"
import { peruNow } from "../../../../lib/finanzas/helpers"
import { useSupabaseSync } from "../../hooks/useSupabaseSync"
import { loadViabilidad, saveViabilidad } from "../../../../services/finanzas"

// Viabilidad is the OWNER's analysis tool. It pulls data from Contratos
// and Caja via "Jalar" buttons (JalarContratos, JalarCaja) — intentionally
// NOT auto-synced, because the owner decides when to snapshot the numbers.
//
// Default seed data — only used the first time, before anything is in storage.
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

// Owns the entire persisted state of the Viabilidad module. Persistence
// is two-tier (Supabase + localStorage fallback) handled by useSupabaseSync.
export function useViabilidadState() {
  const [year, setYear] = useState(() => peruNow().getFullYear())
  const [month, setMonth] = useState(() => peruNow().getMonth() + 1)
  const [workers, setWorkers] = useState(INIT_WORKERS)
  const [services, setServices] = useState(INIT_SERVICES)
  const [apoyos, setApoyos] = useState(INIT_APOYOS)
  const [trackerData, setTrackerData] = useState({})
  const [diaAnalisis, setDiaAnalisis] = useState(() => peruNow().getDate())
  const [cajaSemanaSol, setCajaSemanaSol] = useState(1010)
  const [cajaAcumMes, setCajaAcumMes] = useState(0)
  const [contarApoyo, setContarApoyo] = useState("SI")
  const [diasOpSemana, setDiasOpSemana] = useState(6)
  const [cobExtraAll, setCobExtraAll] = useState({})
  const [loaded, setLoaded] = useState(false)

  // Apply a saved blob (from cloud OR localStorage migration). Validates
  // every field so a corrupted/legacy blob can't crash the module.
  const applyLoaded = useCallback((saved) => {
    if (saved && typeof saved === "object") {
      if (typeof saved.year === "number") setYear(saved.year)
      if (typeof saved.month === "number") setMonth(saved.month)
      if (Array.isArray(saved.workers)) setWorkers(saved.workers.filter(w => w && typeof w === "object"))
      if (Array.isArray(saved.services)) setServices(saved.services.filter(s => s && typeof s === "object"))
      if (Array.isArray(saved.apoyos)) setApoyos(saved.apoyos.filter(a => a && typeof a === "object"))
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

  useSupabaseSync({
    localKey: STORAGE_KEYS.VIABILIDAD,
    loader: loadViabilidad,
    saver: saveViabilidad,
    applyLoaded,
    data: {
      year, month, workers, services, apoyos, trackerData,
      diaAnalisis, cajaSemanaSol, cajaAcumMes, contarApoyo, diasOpSemana, cobExtraAll,
    },
    loaded,
  })

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
