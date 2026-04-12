import { useState, useMemo } from "react"
import ViabilidadModule from "./finanzas/viabilidad/ViabilidadModule"
import ContratosModule from "./finanzas/contratos/ContratosModule"
import CajaModule from "./finanzas/caja/CajaModule"
import { peruNow, getWeekNumberISO, calcContract } from "../lib/finanzas/helpers"
import { MESES_CORTO } from "../lib/finanzas/constants"
import { useContratosSnapshot } from "./finanzas/caja/hooks/useContratosSnapshot"
import { useCajaDesglose } from "./finanzas/caja/hooks/useCajaDesglose"
import { exportResumen } from "../lib/finanzas/exportResumen"

// Top-level Finanzas entry. Holds a small tab bar to switch between
// the 3 sub-modules.
//
// The period filter (filterSem / filterMes) is SHARED across modules
// so that switching between Contratos and Caja keeps the same time
// window. This way the user can compare side-by-side without re-selecting
// the week/month every time.
const MODULES = [
  { id: "viabilidad", label: "Viabilidad Operativa", icon: "📈" },
  { id: "contratos", label: "Contratos", icon: "💼" },
  { id: "caja", label: "Caja", icon: "💰" },
]

export default function Finanzas() {
  const [activeModule, setActiveModule] = useState("viabilidad")

  const now = peruNow()
  const currentWeekNum = getWeekNumberISO(now)
  const currentMonthNum = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const [filterSem, setFilterSem] = useState(String(currentWeekNum))
  const [filterMes, setFilterMes] = useState("")

  const setQuickAll = () => { setFilterSem(""); setFilterMes("") }
  const setQuickWeek = (w) => { setFilterMes(""); setFilterSem(String(w)) }
  const setQuickMonth = (m) => { setFilterSem(""); setFilterMes(String(m)) }

  // Snapshots for export (lightweight, no CRUD)
  const contractsSnap = useContratosSnapshot()
  const activeContracts = useMemo(() => (contractsSnap || []).filter(c => !c.eliminado), [contractsSnap])

  const handleExport = (tipo) => {
    const periodValue = tipo === "semana" ? currentWeekNum : currentMonthNum
    const periodoLabel = tipo === "semana" ? `Semana ${currentWeekNum}, ${MESES_CORTO[currentMonthNum]} ${currentYear}` : `${MESES_CORTO[currentMonthNum]} ${currentYear}`

    // Build summary from contracts
    let ganancia = 0, descuentos = 0, enCaja = 0, pendiente = 0, ingresoYape = 0, ingresoEfectivo = 0, registros = 0
    const porPersona = { Yo: 0, Loli: 0, Mama: 0, Jose: 0, Otro: 0 }
    activeContracts.forEach(c => {
      if (tipo === "semana" && c.semana !== periodValue) return
      if (tipo === "mes" && c.mes !== periodValue) return
      if ((c.anio || currentYear) !== currentYear) return
      registros++
      const calc = calcContract(c)
      ganancia += calc.ganancia; descuentos += c.descuento || 0; enCaja += calc.enCaja; pendiente += calc.pendiente
      ;(c.adelantos || []).forEach(a => {
        if (a.noTrack) return
        if (a.modalidad === "Yape" || a.modalidad === "Transferencia" || a.modalidad === "Plin") ingresoYape += a.monto || 0
        else if (a.modalidad === "Efectivo") ingresoEfectivo += a.monto || 0
      })
      ;(c.cobros || []).forEach(a => {
        if (a.noTrack) return
        if (a.modalidad === "Yape" || a.modalidad === "Transferencia" || a.modalidad === "Plin") ingresoYape += a.monto || 0
        else if (a.modalidad === "Efectivo") ingresoEfectivo += a.monto || 0
      })
      if (calc.porRecibir > 0) {
        const personas = [...new Set([...(c.adelantos || []).map(a => a.recibio), ...(c.cobros || []).map(a => a.recibio)].filter(Boolean))]
        const pp = calc.porRecibir / (personas.length || 1)
        personas.forEach(p => { if (p in porPersona) porPersona[p] += pp; else porPersona["Otro"] += pp })
      }
    })

    const summary = { registros, ganancia, descuentos, enCaja, pendiente, ingresoYape, ingresoEfectivo, deNuevos: 0, deAnteriores: 0, porPersona }

    exportResumen({ periodo: periodoLabel, periodoLabel, summary, desglose: null, viabilidad: null, tipo })
  }

  // Background color is set on the parent <main> in App.jsx when tab==="finanzas",
  // so we don't need to wrap ourselves in a colored container — we just inherit
  // the dark zinc-950 from above. That avoids any rim/gap from the parent padding.
  //
  // The inner wrapper caps the layout at max-w-7xl (1280px) centered, matching
  // the original Coketín design — without it, KPI cards and tables stretch to
  // the full monitor width and look empty/awkward on big screens.
  return (
    <div className="finanzas-root text-zinc-100" style={{ fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      <div className="max-w-7xl mx-auto">
        <header className="border-b border-zinc-800/80 pb-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">Finanza Coketín</h1>
              <p className="text-xs text-zinc-500 mt-0.5">Sistema integral de gestión financiera</p>
            </div>
            <div className="flex items-center gap-2">
              <div style={{ display: "inline-flex", borderRadius: 10, overflow: "hidden", border: "1px solid #3f3f46" }}>
                <button onClick={() => handleExport("semana")} style={{ padding: "6px 12px", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: "#27272a", color: "#34d399", display: "flex", alignItems: "center", gap: 4 }}>📊 Sem {currentWeekNum}</button>
                <button onClick={() => handleExport("mes")} style={{ padding: "6px 12px", border: "none", borderLeft: "1px solid #3f3f46", cursor: "pointer", fontSize: 11, fontWeight: 700, background: "#27272a", color: "#38bdf8", display: "flex", alignItems: "center", gap: 4 }}>📊 {MESES_CORTO[currentMonthNum]}</button>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-zinc-900/80 rounded-xl p-1 border border-zinc-800">
              {MODULES.map(m => (
                <button key={m.id} onClick={() => setActiveModule(m.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                    activeModule === m.id
                      ? "bg-sky-500/25 text-sky-300 border border-sky-400/60 shadow-md shadow-sky-500/20"
                      : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 border border-transparent"
                  }`}>
                  <span>{m.icon}</span>{m.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div style={{ display: activeModule === "viabilidad" ? "block" : "none" }}><ViabilidadModule /></div>
        <div style={{ display: activeModule === "contratos" ? "block" : "none" }}>
          <ContratosModule
            filterSem={filterSem} filterMes={filterMes}
            setQuickAll={setQuickAll} setQuickWeek={setQuickWeek} setQuickMonth={setQuickMonth}
          />
        </div>
        <div style={{ display: activeModule === "caja" ? "block" : "none" }}>
          <CajaModule
            filterSem={filterSem} filterMes={filterMes}
            setQuickAll={setQuickAll} setQuickWeek={setQuickWeek} setQuickMonth={setQuickMonth}
          />
        </div>
      </div>
    </div>
  )
}
