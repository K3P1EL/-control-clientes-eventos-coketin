import { useState } from "react"
import Card from "../../ui/Card"
import { MESES_CORTO, DIAS_SEMANA } from "../../../../lib/finanzas/constants"
import { fmtS, isActiveOnDate, getDiaMarca, getDaysInMonth, parseLocalDate, getWeekNumberISO, getISOYear, isDayOperativoReal, countDiasOperativosMesReal } from "../../../../lib/finanzas/helpers"
import { useCajaSnapshot } from "../hooks/useCajaSnapshot"

// Calcula los 7 días reales de una semana ISO (cualquier año), iguales que
// el resto del sistema. Si es mes, devuelve los días del mes.
function getDaysOfPeriod(tipo, periodo, anio) {
  if (tipo === "mes") {
    const dias = getDaysInMonth(anio, periodo)
    return Array.from({ length: dias }, (_, i) => new Date(anio, periodo - 1, i + 1))
  }
  const jan4 = new Date(anio, 0, 4)
  const jan4Dow = (jan4.getDay() + 6) % 7
  const week1Mon = new Date(jan4)
  week1Mon.setDate(jan4.getDate() - jan4Dow)
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(week1Mon)
    d.setDate(week1Mon.getDate() + (periodo - 1) * 7 + i)
    days.push(d)
  }
  return days
}

// Breakdown detallado del gasto para un período (semana o mes). Lo calcula
// AL VUELO con la config actual — puede no coincidir con el `gastoSemanal`
// congelado si cambió algo desde que se cerró. En ese caso usar 🔄 Recalcular.
function breakdownGasto({ workers, services, apoyos, contarApoyo, cajaEntries, tipo, periodo, anio, diasDescansoTienda = [], trackerData = {} }) {
  const days = getDaysOfPeriod(tipo, periodo, anio)
  const getMonthTracker = (y, m) => trackerData[`${y}-${m}`] || {}
  const personal = []
  workers.forEach(w => {
    if (!w.name) return
    const costoDiario = (w.pagoSemanal && w.diasTrabSem > 0) ? w.pagoSemanal / w.diasTrabSem : 0
    let dias = 0
    days.forEach(date => {
      if (!isActiveOnDate(w, date)) return
      const dyName = DIAS_SEMANA[date.getDay()]
      const isRest = w.diaDescanso && dyName === w.diaDescanso
      const marca = getDiaMarca(w, date.getFullYear(), date.getMonth() + 1, date.getDate())
      if (marca === "noVino") return
      if (isRest && !marca) return
      dias++
    })
    if (dias > 0) personal.push({ name: w.name, dias, costoDiario, total: dias * costoDiario })
  })

  const serviciosCalc = []
  services.forEach(s => {
    if (!s.nombre) return
    const modo = s.modo || "operativo"
    let total = 0, dias = 0
    days.forEach(date => {
      if (!isActiveOnDate(s, date)) return
      const dyear = date.getFullYear(), dmonth = date.getMonth() + 1
      const monthTracker = getMonthTracker(dyear, dmonth)
      if (modo === "operativo") {
        if (!isDayOperativoReal(date, diasDescansoTienda, monthTracker)) return
        const div = s.divisor || countDiasOperativosMesReal(dyear, dmonth, diasDescansoTienda, monthTracker) || 1
        total += (s.pagoMensual || 0) / div
      } else {
        const dim = getDaysInMonth(dyear, dmonth)
        total += (s.pagoMensual || 0) / dim
      }
      dias++
    })
    if (dias > 0) serviciosCalc.push({ nombre: s.nombre, dias, pagoMensual: s.pagoMensual || 0, total, modo })
  })

  const apoyosCalc = []
  if (contarApoyo === "SI") {
    apoyos.forEach(a => {
      if (!a.concepto) return
      let total = 0, dias = 0
      days.forEach(date => {
        if (!isActiveOnDate(a, date)) return
        const dim = getDaysInMonth(date.getFullYear(), date.getMonth() + 1)
        total += (a.montoMensual || 0) / dim
        dias++
      })
      if (dias > 0) apoyosCalc.push({ concepto: a.concepto, dias, montoMensual: a.montoMensual || 0, total })
    })
  }

  const hormigaItems = []
  cajaEntries.forEach(e => {
    if (e.eliminado) return
    if (e.delNegocio === false) return
    if (e.gastoAjeno) return
    if (!e.gastoHormiga) return
    if (e.tipo !== "egreso") return
    const d = parseLocalDate(e.fecha)
    if (!d) return
    const inPeriod = tipo === "semana"
      ? (getWeekNumberISO(d) === periodo && getISOYear(d) === anio)
      : (d.getFullYear() === anio && (d.getMonth() + 1) === periodo)
    if (inPeriod) hormigaItems.push({ fecha: e.fecha, concepto: e.concepto || "Sin concepto", monto: e.monto || 0 })
  })

  const personalTotal = personal.reduce((s, x) => s + x.total, 0)
  const serviciosTotal = serviciosCalc.reduce((s, x) => s + x.total, 0)
  const apoyosTotal = apoyosCalc.reduce((s, x) => s + x.total, 0)
  const hormigaTotal = hormigaItems.reduce((s, x) => s + x.monto, 0)
  return {
    personal, servicios: serviciosCalc, apoyos: apoyosCalc, hormiga: hormigaItems,
    personalTotal, serviciosTotal, apoyosTotal, hormigaTotal,
    gastoCalculado: personalTotal + serviciosTotal - apoyosTotal,
    gastoNeto: personalTotal + serviciosTotal - apoyosTotal + hormigaTotal,
  }
}

export default function HistorialTab({ cierres, currentWeek, currentMonth, currentYear, calc, recalcularCierre, viabState }) {
  const [filterTipo, setFilterTipo] = useState("semana")
  const [viewYear, setViewYear] = useState(currentYear)
  const [explicaOpen, setExplicaOpen] = useState(null) // id del cierre expandido
  const cajaEntries = useCajaSnapshot()

  // Available years from cierres data
  const availableYears = [...new Set(cierres.map(c => c.anio))].sort((a, b) => b - a)
  if (!availableYears.includes(currentYear)) availableYears.unshift(currentYear)

  const filtered = cierres
    .filter(c => {
      if (c.tipo !== filterTipo || c.anio !== viewYear) return false
      const d = c.data || {}
      if (!d.ganancia && !d.enCaja && !d.cajaIngresos && !d.cajaEgresos) return false
      return true
    })
    .sort((a, b) => b.periodo - a.periodo)

  const pillStyle = (active) => ({
    padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
    border: active ? "1px solid rgba(14,165,233,0.4)" : "1px solid #3f3f46",
    background: active ? "rgba(14,165,233,0.15)" : "rgba(39,39,42,0.5)",
    color: active ? "#38bdf8" : "#71717a",
  })

  const currentPeriodo = filterTipo === "semana" ? currentWeek : currentMonth
  const currentLabel = filterTipo === "semana" ? `Semana ${currentWeek}` : MESES_CORTO[currentMonth]

  // Live numbers for current period from calc
  const liveGastoSemanal = calc?.gastoNetoSemanal || 0
  const liveGastoMes = calc?.gastoRealMes || 0

  return (
    <Card title="Historial de cierres" icon="📚" accent="violet">
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <button onClick={() => setFilterTipo("semana")} style={pillStyle(filterTipo === "semana")}>📅 Semanal</button>
        <button onClick={() => setFilterTipo("mes")} style={pillStyle(filterTipo === "mes")}>🗓️ Mensual</button>
        <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
          {availableYears.map(y => (
            <button key={y} onClick={() => setViewYear(y)} style={{
              padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
              border: viewYear === y ? "1px solid rgba(139,92,246,0.4)" : "1px solid #3f3f46",
              background: viewYear === y ? "rgba(139,92,246,0.15)" : "transparent",
              color: viewYear === y ? "#a78bfa" : "#52525b",
            }}>{y}</button>
          ))}
        </div>
      </div>

      {/* Current period — en proceso (only for current year) */}
      {viewYear === currentYear && <div className="mb-4">
        <div style={{
          background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.3)",
          borderRadius: 12, padding: "16px 20px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#38bdf8" }}>{currentLabel}</span>
              <span style={{
                padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                background: "rgba(14,165,233,0.2)", color: "#38bdf8", border: "1px solid rgba(14,165,233,0.3)",
              }}>⏳ En proceso</span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#71717a", marginBottom: 8 }}>
            Datos en vivo — se actualizan cuando cambiás algo en los otros tabs
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12 }}>
            <div>
              <div style={{ color: "#71717a", fontSize: 10, textTransform: "uppercase" }}>Gastos {filterTipo === "semana" ? "semana" : "mes"}</div>
              <div style={{ fontWeight: 700, color: "#f87171", fontFamily: "monospace" }}>{fmtS(filterTipo === "semana" ? liveGastoSemanal : liveGastoMes)}</div>
            </div>
            <div>
              <div style={{ color: "#71717a", fontSize: 10, textTransform: "uppercase" }}>Meta diaria</div>
              <div style={{ fontWeight: 700, color: "#e4e4e7", fontFamily: "monospace" }}>{fmtS(calc?.metaMinimaBase || 0)}</div>
            </div>
            <div>
              <div style={{ color: "#71717a", fontSize: 10, textTransform: "uppercase" }}>Días operados</div>
              <div style={{ fontWeight: 700, color: "#e4e4e7", fontFamily: "monospace" }}>{calc?.diasOperados || 0}</div>
            </div>
          </div>
        </div>
      </div>}

      {/* Past closed periods */}
      {filtered.length === 0 ? (
        <div style={{ padding: 30, textAlign: "center", color: "#52525b", fontSize: 13 }}>
          No hay cierres de {filterTipo === "semana" ? "semanas" : "meses"} anteriores todavía.
          <div style={{ fontSize: 11, marginTop: 4 }}>Se generan automáticamente cuando pasa la semana.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(c => {
            const label = c.tipo === "semana" ? `Semana ${c.periodo}` : MESES_CORTO[c.periodo]
            const isViable = c.viable
            const d = c.data || {}

            return (
              <div key={`${c.tipo}-${c.periodo}-${c.anio}`} style={{
                background: isViable ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
                border: `1px solid ${isViable ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                borderRadius: 12, padding: "14px 20px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#e4e4e7" }}>{label}</span>
                    <span style={{
                      padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                      background: isViable ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                      color: isViable ? "#34d399" : "#f87171",
                      border: `1px solid ${isViable ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}`,
                    }}>
                      {isViable ? "✅ Viable" : "❌ No viable"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => setExplicaOpen(explicaOpen === c.id ? null : c.id)}
                      style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(56,189,248,0.4)", background: explicaOpen === c.id ? "rgba(56,189,248,0.2)" : "rgba(56,189,248,0.1)", color: "#38bdf8", cursor: "pointer", fontSize: 10, fontWeight: 700 }}
                      title="Ver el desglose matemático del cierre">
                      🔍 Cómo se calculó
                    </button>
                    {recalcularCierre && c.id && (
                      <button onClick={() => { if (confirm("Recalcular este cierre con la configuración actual? Los datos congelados se actualizarán.")) recalcularCierre(c.id) }}
                        style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(139,92,246,0.4)", background: "rgba(139,92,246,0.1)", color: "#a78bfa", cursor: "pointer", fontSize: 10, fontWeight: 700 }}
                        title="Borra el cierre y lo regenera con la config actual">
                        🔄 Recalcular
                      </button>
                    )}
                    <span style={{ fontSize: 10, color: "#52525b" }}>{c.anio}</span>
                  </div>
                </div>

                {/* 3 perspectivas: cobrado de nuevos / de anteriores / total */}
                {(() => {
                  const gastosCalc = d.gastoSemanal || d.gastoMes || 0
                  const hormiga = (c.tipo === "semana" ? d.hormigaSemana : d.hormigaMes) || 0
                  const gastos = gastosCalc + hormiga
                  const cobradoNuevos = d.enCaja || 0 // enCaja de contratos de esta semana
                  const deAnteriores = d.deAnteriores || 0
                  const totalCobrado = cobradoNuevos + deAnteriores
                  const libreNuevos = cobradoNuevos - gastos
                  const libreTotal = totalCobrado - gastos
                  const box = (label, value, hint, accent, isLibre, dimmed) => (
                    <div style={{ flex: 1, minWidth: 130, opacity: dimmed ? 0.5 : 1, background: isLibre ? (value >= 0 ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)") : `${accent}0d`, borderRadius: 8, padding: "10px 12px", border: `1px solid ${isLibre ? (value >= 0 ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)") : `${accent}40`}` }}>
                      <div style={{ color: accent, fontSize: 9, textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
                      <div style={{ fontWeight: 800, fontFamily: "monospace", fontSize: 14, color: isLibre ? (value >= 0 ? "#34d399" : "#f87171") : accent, marginTop: 2 }}>
                        {isLibre ? (value >= 0 ? `+${fmtS(value)}` : fmtS(value)) : fmtS(value)}
                      </div>
                      {hint && <div style={{ fontSize: 8, color: "#52525b", marginTop: 2 }}>{hint}</div>}
                    </div>
                  )

                  return (
                    <>
                      {/* Montos cobrados — siempre 3 perspectivas + gastos */}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                        {box("Cobrado de nuevos", cobradoNuevos, "contratos de esta semana", "#34d399", false, false)}
                        {box("De anteriores", deAnteriores, "cobros de semanas pasadas", "#a78bfa", false, deAnteriores === 0)}
                        {box("Total cobrado", totalCobrado, "nuevos + anteriores", "#38bdf8", false, false)}
                        {box("Gastos", gastos, hormiga > 0 ? `calc + 🐜 ${fmtS(hormiga)}` : "lo que costó operar", "#f87171", false, false)}
                      </div>
                      {/* Libres — ¿alcanza? */}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                        {box("Libre solo nuevos", libreNuevos, "cobrado nuevos - gastos", "#34d399", true, false)}
                        {box("Libre total", libreTotal, "total cobrado - gastos", "#38bdf8", true, deAnteriores === 0)}
                      </div>
                    </>
                  )
                })()}

                {/* Apoyo line — shows subsidy impact */}
                {(d.apoyo || 0) > 0 && (() => {
                  const hormigaP = (c.tipo === "semana" ? d.hormigaSemana : d.hormigaMes) || 0
                  const gastoSinApoyo = (d.gastoSemanal || d.gastoMes || 0) + d.apoyo + hormigaP
                  const libreSinApoyo = (d.enCaja || 0) - gastoSinApoyo
                  return (
                    <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 6 }}>
                      Apoyo incluido: <strong style={{ color: "#34d399" }}>{fmtS(d.apoyo)}</strong>
                      <span style={{ color: "#52525b" }}> · </span>
                      Sin apoyo: <strong style={{ color: libreSinApoyo >= 0 ? "#fbbf24" : "#f87171" }}>{libreSinApoyo >= 0 ? "+" : ""}{fmtS(libreSinApoyo)}</strong>
                    </div>
                  )
                })()}

                {/* Caja real breakdown if available */}
                {(d.cajaIngresos != null || d.cajaEgresos != null) && (
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 11, color: "#a1a1aa", borderTop: "1px solid rgba(63,63,70,0.3)", paddingTop: 8 }}>
                    <span>Caja ingresos: <strong style={{ color: "#34d399" }}>{fmtS(d.cajaIngresos || 0)}</strong></span>
                    <span>Caja egresos: <strong style={{ color: "#f87171" }}>{fmtS(d.cajaEgresos || 0)}</strong></span>
                    <span>Balance caja: <strong style={{ color: (d.cajaBalance || 0) >= 0 ? "#34d399" : "#f87171" }}>{fmtS(d.cajaBalance || 0)}</strong></span>
                    {((c.tipo === "semana" ? d.hormigaSemana : d.hormigaMes) > 0) && (
                      <span>🐜 Hormiga: <strong style={{ color: "#f472b6" }}>{fmtS(c.tipo === "semana" ? d.hormigaSemana : d.hormigaMes)}</strong></span>
                    )}
                  </div>
                )}

                {c.nota && <div style={{ marginTop: 8, fontSize: 11, color: "#a1a1aa", fontStyle: "italic" }}>📝 {c.nota}</div>}

                {/* Panel "Cómo se calculó" — desglose matemático */}
                {explicaOpen === c.id && (() => {
                  const gastosCalcCongelado = d.gastoSemanal || d.gastoMes || 0
                  const hormigaGuardada = (c.tipo === "semana" ? d.hormigaSemana : d.hormigaMes) || 0
                  const gastos = gastosCalcCongelado + hormigaGuardada
                  const cobradoNuevos = d.enCaja || 0
                  const deAnteriores = d.deAnteriores || 0
                  const totalCobrado = cobradoNuevos + deAnteriores
                  const apoyo = d.apoyo || 0
                  const periodoLabel = c.tipo === "semana" ? `Semana ${c.periodo}` : MESES_CORTO[c.periodo]
                  // Breakdown detallado al vuelo (puede no coincidir con el congelado si cambió la config)
                  const bd = viabState ? breakdownGasto({
                    workers: viabState.workers, services: viabState.services, apoyos: viabState.apoyos,
                    contarApoyo: viabState.contarApoyo, cajaEntries: cajaEntries || [],
                    tipo: c.tipo, periodo: c.periodo, anio: c.anio,
                    diasDescansoTienda: viabState.tiendaConfig?.diasDescansoSemanal || [],
                    trackerData: viabState.trackerData || {},
                  }) : null
                  const desfase = bd ? Math.abs(bd.gastoCalculado - gastosCalcCongelado) > 0.5 : false
                  return (
                    <div style={{ marginTop: 12, padding: 14, background: "rgba(15,23,42,0.5)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: 10, fontSize: 12, lineHeight: 1.65, color: "#cbd5e1" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#38bdf8", marginBottom: 8 }}>🔍 Desglose del cálculo — {periodoLabel}</div>

                      <div style={{ marginBottom: 10 }}>
                        <div style={{ color: "#34d399", fontWeight: 700 }}>📥 Cobrado de nuevos: {fmtS(cobradoNuevos)}</div>
                        <div style={{ paddingLeft: 14, color: "#94a3b8", fontSize: 11 }}>
                          Suma del campo "enCaja" de cada contrato firmado en {periodoLabel.toLowerCase()}.<br/>
                          enCaja = (adelantos + cobros marcados ☑ "En caja") − gastos del contrato
                        </div>
                      </div>

                      <div style={{ marginBottom: 10 }}>
                        <div style={{ color: "#a78bfa", fontWeight: 700 }}>📥 De anteriores: {fmtS(deAnteriores)}</div>
                        <div style={{ paddingLeft: 14, color: "#94a3b8", fontSize: 11 }}>
                          Cobros marcados ☑ "En caja" cuya fecha cae en {periodoLabel.toLowerCase()} pero el contrato es de otro período.
                        </div>
                      </div>

                      <div style={{ marginBottom: 10, paddingTop: 8, borderTop: "1px dashed rgba(63,63,70,0.4)" }}>
                        <div style={{ color: "#38bdf8", fontWeight: 700 }}>💰 Total cobrado: {fmtS(totalCobrado)}</div>
                        <div style={{ paddingLeft: 14, color: "#94a3b8", fontSize: 11 }}>
                          {fmtS(cobradoNuevos)} (nuevos) + {fmtS(deAnteriores)} (anteriores) = <strong style={{ color: "#38bdf8" }}>{fmtS(totalCobrado)}</strong>
                        </div>
                      </div>

                      <div style={{ marginBottom: 10 }}>
                        <div style={{ color: "#f87171", fontWeight: 700 }}>📤 Gastos: {fmtS(gastos)}</div>
                        <div style={{ paddingLeft: 14, color: "#94a3b8", fontSize: 11 }}>
                          Gasto calculado (congelado al cierre): <strong style={{ color: "#fbbf24" }}>{fmtS(gastosCalcCongelado)}</strong><br/>
                          {hormigaGuardada > 0 ? <>🐜 Hormiga registrada: {fmtS(hormigaGuardada)}<br/></> : null}
                          <strong style={{ color: "#f87171" }}>Total: {fmtS(gastosCalcCongelado)}{hormigaGuardada > 0 ? ` + ${fmtS(hormigaGuardada)} = ${fmtS(gastos)}` : ""}</strong>
                        </div>

                        {bd && (
                          <div style={{ marginTop: 10, padding: 10, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8 }}>
                            <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: 11, marginBottom: 6 }}>
                              🔬 Detalle del cálculo (con la config actual):
                              {desfase && <span style={{ color: "#f472b6", fontSize: 10, marginLeft: 8 }}>⚠️ no coincide con el congelado — usá 🔄 Recalcular para sincronizar</span>}
                            </div>

                            <div style={{ marginBottom: 8 }}>
                              <div style={{ color: "#cbd5e1", fontWeight: 600, fontSize: 11 }}>👷 Personal: {fmtS(bd.personalTotal)}</div>
                              {bd.personal.length === 0 ? <div style={{ paddingLeft: 14, fontSize: 10, color: "#52525b", fontStyle: "italic" }}>Sin trabajadores activos en este período</div> : (
                                bd.personal.map(p => (
                                  <div key={p.name} style={{ paddingLeft: 14, fontSize: 10, color: "#94a3b8" }}>
                                    · {p.name}: {p.dias}d × {fmtS(p.costoDiario)} = <strong style={{ color: "#cbd5e1" }}>{fmtS(p.total)}</strong>
                                  </div>
                                ))
                              )}
                            </div>

                            <div style={{ marginBottom: 8 }}>
                              <div style={{ color: "#cbd5e1", fontWeight: 600, fontSize: 11 }}>🏢 Servicios: {fmtS(bd.serviciosTotal)}</div>
                              {bd.servicios.length === 0 ? <div style={{ paddingLeft: 14, fontSize: 10, color: "#52525b", fontStyle: "italic" }}>Sin servicios activos</div> : (
                                bd.servicios.map(s => (
                                  <div key={s.nombre} style={{ paddingLeft: 14, fontSize: 10, color: "#94a3b8" }}>
                                    · {s.nombre} ({fmtS(s.pagoMensual)}/mes, {s.modo === "calendario" ? "🗓️" : "🏪"}): {s.dias}d {s.modo === "calendario" ? "" : "op "}= <strong style={{ color: "#cbd5e1" }}>{fmtS(s.total)}</strong>
                                  </div>
                                ))
                              )}
                            </div>

                            {bd.apoyos.length > 0 && (
                              <div style={{ marginBottom: 8 }}>
                                <div style={{ color: "#34d399", fontWeight: 600, fontSize: 11 }}>🤝 Apoyos: −{fmtS(bd.apoyosTotal)}</div>
                                {bd.apoyos.map(a => (
                                  <div key={a.concepto} style={{ paddingLeft: 14, fontSize: 10, color: "#94a3b8" }}>
                                    · {a.concepto} ({fmtS(a.montoMensual)}/mes): {a.dias}d activos = <strong style={{ color: "#34d399" }}>{fmtS(a.total)}</strong>
                                  </div>
                                ))}
                              </div>
                            )}

                            {bd.hormiga.length > 0 && (
                              <div style={{ marginBottom: 8 }}>
                                <div style={{ color: "#f472b6", fontWeight: 600, fontSize: 11 }}>🐜 Hormiga: {fmtS(bd.hormigaTotal)}</div>
                                {bd.hormiga.map((h, i) => (
                                  <div key={i} style={{ paddingLeft: 14, fontSize: 10, color: "#94a3b8" }}>
                                    · {h.fecha} — {h.concepto}: <strong style={{ color: "#f472b6" }}>{fmtS(h.monto)}</strong>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div style={{ paddingTop: 6, borderTop: "1px dashed rgba(63,63,70,0.4)", fontSize: 11 }}>
                              <span style={{ color: "#94a3b8" }}>Total calculado: </span>
                              <strong style={{ color: "#fbbf24" }}>
                                {fmtS(bd.personalTotal)} + {fmtS(bd.serviciosTotal)} − {fmtS(bd.apoyosTotal)}{bd.hormigaTotal > 0 ? ` + ${fmtS(bd.hormigaTotal)}` : ""} = {fmtS(bd.gastoNeto)}
                              </strong>
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ marginBottom: 6, paddingTop: 8, borderTop: "1px dashed rgba(63,63,70,0.4)" }}>
                        <div style={{ color: "#34d399", fontWeight: 700 }}>✅ Libre solo nuevos: {(cobradoNuevos - gastos) >= 0 ? "+" : ""}{fmtS(cobradoNuevos - gastos)}</div>
                        <div style={{ paddingLeft: 14, color: "#94a3b8", fontSize: 11 }}>
                          {fmtS(cobradoNuevos)} − {fmtS(gastos)} = <strong style={{ color: (cobradoNuevos - gastos) >= 0 ? "#34d399" : "#f87171" }}>{(cobradoNuevos - gastos) >= 0 ? "+" : ""}{fmtS(cobradoNuevos - gastos)}</strong>
                        </div>
                      </div>

                      <div style={{ marginBottom: 6 }}>
                        <div style={{ color: "#38bdf8", fontWeight: 700 }}>✅ Libre total: {(totalCobrado - gastos) >= 0 ? "+" : ""}{fmtS(totalCobrado - gastos)}</div>
                        <div style={{ paddingLeft: 14, color: "#94a3b8", fontSize: 11 }}>
                          {fmtS(totalCobrado)} − {fmtS(gastos)} = <strong style={{ color: (totalCobrado - gastos) >= 0 ? "#34d399" : "#f87171" }}>{(totalCobrado - gastos) >= 0 ? "+" : ""}{fmtS(totalCobrado - gastos)}</strong>
                        </div>
                      </div>

                      {apoyo > 0 && (
                        <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px dashed rgba(63,63,70,0.4)" }}>
                          <div style={{ color: "#fbbf24", fontWeight: 700 }}>🤝 Apoyo en este período: {fmtS(apoyo)}</div>
                          <div style={{ paddingLeft: 14, color: "#94a3b8", fontSize: 11 }}>
                            Sin el apoyo, el libre sería: {fmtS(cobradoNuevos)} − ({fmtS(gastosCalcCongelado)} + {fmtS(apoyo)}{hormigaGuardada > 0 ? ` + ${fmtS(hormigaGuardada)}` : ""}) = <strong style={{ color: (cobradoNuevos - gastosCalcCongelado - apoyo - hormigaGuardada) >= 0 ? "#fbbf24" : "#f87171" }}>{(cobradoNuevos - gastosCalcCongelado - apoyo - hormigaGuardada) >= 0 ? "+" : ""}{fmtS(cobradoNuevos - gastosCalcCongelado - apoyo - hormigaGuardada)}</strong>
                          </div>
                        </div>
                      )}

                      {(d.cajaIngresos != null || d.cajaEgresos != null) && (
                        <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px dashed rgba(63,63,70,0.4)" }}>
                          <div style={{ color: "#cbd5e1", fontWeight: 700 }}>💼 Caja real (lo que efectivamente entró/salió):</div>
                          <div style={{ paddingLeft: 14, color: "#94a3b8", fontSize: 11 }}>
                            Ingresos del negocio: {fmtS(d.cajaIngresos || 0)}<br/>
                            Egresos del negocio: {fmtS(d.cajaEgresos || 0)}<br/>
                            Balance real: <strong style={{ color: (d.cajaBalance || 0) >= 0 ? "#34d399" : "#f87171" }}>{fmtS(d.cajaBalance || 0)}</strong>
                            <br/><span style={{ color: "#52525b", fontSize: 10 }}>Excluye gastoAjeno y movimientos fuera del negocio.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
