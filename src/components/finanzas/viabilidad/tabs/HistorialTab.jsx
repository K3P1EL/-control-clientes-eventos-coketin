import { useState } from "react"
import Card from "../../ui/Card"
import { MESES_CORTO } from "../../../../lib/finanzas/constants"
import { fmtS } from "../../../../lib/finanzas/helpers"

export default function HistorialTab({ cierres, currentWeek, currentMonth, currentYear, calc }) {
  const [filterTipo, setFilterTipo] = useState("semana")

  const filtered = cierres
    .filter(c => c.tipo === filterTipo && c.anio === currentYear)
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
      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilterTipo("semana")} style={pillStyle(filterTipo === "semana")}>📅 Semanal</button>
        <button onClick={() => setFilterTipo("mes")} style={pillStyle(filterTipo === "mes")}>🗓️ Mensual</button>
        <span className="text-xs text-zinc-500 self-center ml-2">{currentYear}</span>
      </div>

      {/* Current period — en proceso */}
      <div className="mb-4">
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
      </div>

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

                {/* Main numbers */}
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, marginBottom: 8 }}>
                  <div>
                    <div style={{ color: "#71717a", fontSize: 10, textTransform: "uppercase" }}>Ganancia</div>
                    <div style={{ fontWeight: 700, color: "#34d399", fontFamily: "monospace" }}>{fmtS(d.ganancia || 0)}</div>
                  </div>
                  <div>
                    <div style={{ color: "#71717a", fontSize: 10, textTransform: "uppercase" }}>En caja real</div>
                    <div style={{ fontWeight: 700, color: "#38bdf8", fontFamily: "monospace" }}>{fmtS(d.enCaja || 0)}</div>
                  </div>
                  <div>
                    <div style={{ color: "#71717a", fontSize: 10, textTransform: "uppercase" }}>Gastos {c.tipo === "semana" ? "semana" : "mes"}</div>
                    <div style={{ fontWeight: 700, color: "#f87171", fontFamily: "monospace" }}>{fmtS(d.gastoSemanal || 0)}</div>
                  </div>
                  <div style={{ borderLeft: "1px solid rgba(63,63,70,0.4)", paddingLeft: 16 }}>
                    <div style={{ color: "#71717a", fontSize: 10, textTransform: "uppercase" }}>Viabilidad</div>
                    <div style={{ fontWeight: 800, fontFamily: "monospace", fontSize: 14, color: (d.libre || 0) >= 0 ? "#34d399" : "#f87171" }}>
                      {(d.libre || 0) >= 0 ? `+${fmtS(d.libre)}` : fmtS(d.libre || 0)}
                    </div>
                    <div style={{ fontSize: 9, color: "#52525b" }}>en caja - gastos</div>
                  </div>
                </div>

                {/* Caja real breakdown if available */}
                {(d.cajaIngresos != null || d.cajaEgresos != null) && (
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 11, color: "#a1a1aa", borderTop: "1px solid rgba(63,63,70,0.3)", paddingTop: 8 }}>
                    <span>Caja ingresos: <strong style={{ color: "#34d399" }}>{fmtS(d.cajaIngresos || 0)}</strong></span>
                    <span>Caja egresos: <strong style={{ color: "#f87171" }}>{fmtS(d.cajaEgresos || 0)}</strong></span>
                    <span>Balance caja: <strong style={{ color: (d.cajaBalance || 0) >= 0 ? "#34d399" : "#f87171" }}>{fmtS(d.cajaBalance || 0)}</strong></span>
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
