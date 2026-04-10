import { useState, useCallback } from "react"
import { MESES } from "../../../lib/finanzas/constants"
import { fmtS } from "../../../lib/finanzas/helpers"
import KPICard from "../ui/KPICard"
import { useViabilidadState } from "./hooks/useViabilidadState"
import { useViabilidadCalc } from "./hooks/useViabilidadCalc"
import ConfigTab from "./tabs/ConfigTab"
import PersonalTab from "./tabs/PersonalTab"
import ServiciosTab from "./tabs/ServiciosTab"
import ApoyosTab from "./tabs/ApoyosTab"
import TrackerTab from "./tabs/TrackerTab"
import AnalisisTab from "./tabs/AnalisisTab"
import CajaTab from "./tabs/CajaTab"

const TABS = [
  { id: "config", label: "Configuración", icon: "⚙️" },
  { id: "personal", label: "Personal", icon: "👷" },
  { id: "servicios", label: "Servicios", icon: "🏢" },
  { id: "apoyos", label: "Apoyos", icon: "🤝" },
  { id: "tracker", label: "Tracker", icon: "📅" },
  { id: "analisis", label: "Análisis", icon: "📊" },
  { id: "caja", label: "Caja", icon: "💰" },
]

// Top-level orchestrator: owns the persistent state via useViabilidadState,
// derives all numbers via useViabilidadCalc, and renders the active tab.
// Tabs themselves are pure presentational — they receive everything via props.
export default function ViabilidadModule() {
  const state = useViabilidadState()
  const [activeTab, setActiveTab] = useState("config")

  const mesKey = `${state.year}-${state.month}`
  const tracker = state.trackerData[mesKey] || {}
  const cobExtra = state.cobExtraAll[mesKey] || { dias: 0, pagadoAparte: false, monto: 0, nombre: [], nota: "" }

  // Pull only the setter we need into a stable ref so the callback's deps
  // are just `mesKey` + `setCobExtraAll` (a useState setter, always stable).
  // Otherwise depending on `state` invalidates this on every render.
  const { setCobExtraAll } = state
  const setCobExtra = useCallback((field, val) => {
    setCobExtraAll(prev => {
      const cur = prev[mesKey] || { dias: 0, pagadoAparte: false, monto: 0, nombre: [], nota: "" }
      return { ...prev, [mesKey]: { ...cur, [field]: val } }
    })
  }, [mesKey, setCobExtraAll])

  const calc = useViabilidadCalc({
    year: state.year, month: state.month,
    workers: state.workers, services: state.services, apoyos: state.apoyos,
    tracker, cobExtra,
    diaAnalisis: state.diaAnalisis, cajaSemanaSol: state.cajaSemanaSol, cajaAcumMes: state.cajaAcumMes,
    contarApoyo: state.contarApoyo, diasOpSemana: state.diasOpSemana,
  })

  if (!state.loaded) {
    return <div className="flex items-center justify-center py-16 text-zinc-500 text-sm">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-zinc-500">{MESES[state.month]} {state.year}</p>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-700">{calc.diasCalendario} días</span>
          <span className="bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-700">{calc.diasOpBase} operativos</span>
          <span className={`px-3 py-1.5 rounded-lg border ${calc.diasOperados > 0 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-zinc-800 border-zinc-700"}`}>{calc.diasOperados} operados</span>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto py-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${activeTab === t.id ? "bg-sky-500/25 text-sky-300 border border-sky-400/60 shadow-md shadow-sky-500/20" : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800"}`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard label="Costo diario personal" value={fmtS(calc.costoDiarioPersonal)} />
        <KPICard label="Costo diario servicios" value={fmtS(calc.costoDiarioServicios)} />
        <KPICard label="Costo diario bruto" value={fmtS(calc.costoDiarioBruto)} type="negative" />
        <KPICard label="Apoyo diario externo" value={fmtS(calc.apoyoDiarioExt)} type="positive" />
        <KPICard label="Meta mínima diaria" value={fmtS(calc.metaMinimaBase)} />
        <KPICard label="Neto mensual a cubrir" value={fmtS(calc.netoMensual)} type="negative" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard label="Costo mes real" value={fmtS(calc.costoMesReal)} sub={`Proyectado: ${fmtS(calc.costoMesProyectado)}`} />
        <KPICard label="Apoyos mensuales" value={fmtS(calc.apoyosMensuales)} type="positive" />
        <KPICard label="Gasto semanal neto" value={fmtS(calc.gastoNetoSemanal)} sub="Personal + servicios - apoyo" />
        <KPICard label="Días descanso/cerrados" value={calc.diasDescansosCerrados} sub={`se proyecta a ${calc.descansosProyectados.total}`} />
      </div>

      {activeTab === "config" && (
        <ConfigTab
          year={state.year} setYear={state.setYear}
          month={state.month} setMonth={state.setMonth}
          diasCalendario={calc.diasCalendario} diasOpBase={calc.diasOpBase}
          workers={state.workers} cobExtra={cobExtra} setCobExtra={setCobExtra}
        />
      )}

      {activeTab === "personal" && (
        <PersonalTab
          workers={state.workers} setWorkers={state.setWorkers}
          workersCalc={calc.workersCalc} totalPersonal={calc.totalPersonal}
          calendarDays={calc.calendarDays} effectiveTracker={calc.effectiveTracker}
          year={state.year} month={state.month}
          resumenDescansos={calc.resumenDescansos}
        />
      )}

      {activeTab === "servicios" && (
        <ServiciosTab
          services={state.services} setServices={state.setServices}
          servicesCalc={calc.servicesCalc} totalServicios={calc.totalServicios}
          diasOpBase={calc.diasOpBase}
        />
      )}

      {activeTab === "apoyos" && (
        <ApoyosTab
          apoyos={state.apoyos} setApoyos={state.setApoyos}
          apoyosCalc={calc.apoyosCalc} totalApoyos={calc.totalApoyos}
          diasCalendario={calc.diasCalendario}
        />
      )}

      {activeTab === "tracker" && (
        <TrackerTab
          year={state.year} setYear={state.setYear}
          month={state.month} setMonth={state.setMonth}
          diasCalendario={calc.diasCalendario} diasOpBase={calc.diasOpBase}
          calendarDays={calc.calendarDays}
          tracker={tracker} effectiveTracker={calc.effectiveTracker}
          trackerData={state.trackerData} setTrackerData={state.setTrackerData}
        />
      )}

      {activeTab === "analisis" && (
        <AnalisisTab
          diaAnalisis={state.diaAnalisis} setDiaAnalisis={state.setDiaAnalisis}
          diasCalendario={calc.diasCalendario} diasOperados={calc.diasOperados}
          proximosVencimientos={calc.proximosVencimientos}
          vista3A={calc.vista3A} totalDevengado3A={calc.totalDevengado3A} totalFalta3A={calc.totalFalta3A}
          vista3B={calc.vista3B} totalDevengado3B={calc.totalDevengado3B} totalFalta3B={calc.totalFalta3B}
        />
      )}

      {activeTab === "caja" && (
        <CajaTab
          cajaSemanaSol={state.cajaSemanaSol} setCajaSemanaSol={state.setCajaSemanaSol}
          cajaAcumMes={state.cajaAcumMes} setCajaAcumMes={state.setCajaAcumMes}
          contarApoyo={state.contarApoyo} setContarApoyo={state.setContarApoyo}
          diasOpSemana={state.diasOpSemana} setDiasOpSemana={state.setDiasOpSemana}
          trabajadoresSemana={calc.trabajadoresSemana}
          proporcionServSemana={calc.proporcionServSemana}
          apoyoSemanal={calc.apoyoSemanal}
          gastoNetoSemanal={calc.gastoNetoSemanal}
          cajaLibreSemana={calc.cajaLibreSemana}
          trabRealMes={calc.trabRealMes} serviciosMes={calc.serviciosMes} apoyoMes={calc.apoyoMes} gastoRealMes={calc.gastoRealMes}
          totalDevengado3A={calc.totalDevengado3A} totalDevengado3B={calc.totalDevengado3B}
          cajaVsGasto3A={calc.cajaVsGasto3A} cajaVsDevengado3A={calc.cajaVsDevengado3A}
          cajaVsGasto3B={calc.cajaVsGasto3B} cajaVsDevengado3B={calc.cajaVsDevengado3B}
          metaDiariaNecesaria={calc.metaDiariaNecesaria}
          ritmoActual={calc.ritmoActual} diffRitmo={calc.diffRitmo}
        />
      )}
    </div>
  )
}
