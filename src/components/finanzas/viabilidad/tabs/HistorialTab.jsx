import { useState } from "react"
import Card from "../../ui/Card"
import { MESES_CORTO } from "../../../../lib/finanzas/constants"
import { fmtS } from "../../../../lib/finanzas/helpers"

export default function HistorialTab({ cierres, currentWeek, currentMonth, currentYear, calc }) {
  const [filterTipo, setFilterTipo] = useState("semana")
  const [viewYear, setViewYear] = useState(currentYear)

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
                  <span style={{ fontSize: 10, color: "#52525b" }}>{c.anio}</span>
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
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
