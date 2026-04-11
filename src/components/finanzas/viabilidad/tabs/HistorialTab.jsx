import { useState } from "react"
import Card from "../../ui/Card"
import { MESES_CORTO } from "../../../../lib/finanzas/constants"
import { fmtS } from "../../../../lib/finanzas/helpers"

// Historial de cierres semanales/mensuales. Cada cierre muestra si la
// semana/mes fue viable o no, con los números clave del periodo.
// La semana/mes actual aparece como "en proceso".
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

  return (
    <Card title="Historial de cierres" icon="📚" accent="violet">
      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilterTipo("semana")} style={pillStyle(filterTipo === "semana")}>📅 Semanal</button>
        <button onClick={() => setFilterTipo("mes")} style={pillStyle(filterTipo === "mes")}>🗓️ Mensual</button>
        <span className="text-xs text-zinc-500 self-center ml-2">{currentYear}</span>
      </div>

      {/* Current period — always shown first as "en proceso" */}
      <div className="mb-4">
        <div style={{
          background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.3)",
          borderRadius: 12, padding: "16px 20px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#38bdf8" }}>{currentLabel}</span>
              <span style={{
                padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                background: "rgba(14,165,233,0.2)", color: "#38bdf8", border: "1px solid rgba(14,165,233,0.3)",
              }}>⏳ En proceso</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 12 }}>
            <div>
              <div style={{ color: "#71717a", fontSize: 10, textTransform: "uppercase" }}>Meta diaria</div>
              <div style={{ fontWeight: 700, color: "#e4e4e7", fontFamily: "monospace" }}>{fmtS(calc?.metaMinimaBase || 0)}</div>
            </div>
            <div>
              <div style={{ color: "#71717a", fontSize: 10, textTransform: "uppercase" }}>Costo bruto diario</div>
              <div style={{ fontWeight: 700, color: "#f87171", fontFamily: "monospace" }}>{fmtS(calc?.costoDiarioBruto || 0)}</div>
            </div>
            <div>
              <div style={{ color: "#71717a", fontSize: 10, textTransform: "uppercase" }}>Días operados</div>
              <div style={{ fontWeight: 700, color: "#e4e4e7", fontFamily: "monospace" }}>{calc?.diasOperados || 0}</div>
            </div>
            <div>
              <div style={{ color: "#71717a", fontSize: 10, textTransform: "uppercase" }}>Gasto neto semanal</div>
              <div style={{ fontWeight: 700, color: "#fbbf24", fontFamily: "monospace" }}>{fmtS(calc?.gastoNetoSemanal || 0)}</div>
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
            return (
              <div key={`${c.tipo}-${c.periodo}-${c.anio}`} style={{
                background: isViable ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
                border: `1px solid ${isViable ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                borderRadius: 12, padding: "14px 20px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
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
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 12 }}>
                  {c.data?.metaDiaria != null && (
                    <div>
                      <div style={{ color: "#71717a", fontSize: 10, textTransform: "uppercase" }}>Meta diaria</div>
                      <div style={{ fontWeight: 700, color: "#e4e4e7", fontFamily: "monospace" }}>{fmtS(c.data.metaDiaria)}</div>
                    </div>
                  )}
                  {c.data?.costoDiarioBruto != null && (
                    <div>
                      <div style={{ color: "#71717a", fontSize: 10, textTransform: "uppercase" }}>Costo bruto diario</div>
                      <div style={{ fontWeight: 700, color: "#f87171", fontFamily: "monospace" }}>{fmtS(c.data.costoDiarioBruto)}</div>
                    </div>
                  )}
                  {c.data?.diasOperados != null && (
                    <div>
                      <div style={{ color: "#71717a", fontSize: 10, textTransform: "uppercase" }}>Días operados</div>
                      <div style={{ fontWeight: 700, color: "#e4e4e7", fontFamily: "monospace" }}>{c.data.diasOperados}</div>
                    </div>
                  )}
                  {c.data?.gastoNeto != null && (
                    <div>
                      <div style={{ color: "#71717a", fontSize: 10, textTransform: "uppercase" }}>Gasto neto</div>
                      <div style={{ fontWeight: 700, color: "#fbbf24", fontFamily: "monospace" }}>{fmtS(c.data.gastoNeto)}</div>
                    </div>
                  )}
                  {c.data?.costoPersonal != null && (
                    <div>
                      <div style={{ color: "#71717a", fontSize: 10, textTransform: "uppercase" }}>Personal/día</div>
                      <div style={{ fontWeight: 700, color: "#a78bfa", fontFamily: "monospace" }}>{fmtS(c.data.costoPersonal)}</div>
                    </div>
                  )}
                  {c.data?.costoServicios != null && (
                    <div>
                      <div style={{ color: "#71717a", fontSize: 10, textTransform: "uppercase" }}>Servicios/día</div>
                      <div style={{ fontWeight: 700, color: "#a78bfa", fontFamily: "monospace" }}>{fmtS(c.data.costoServicios)}</div>
                    </div>
                  )}
                </div>
                {c.nota && <div style={{ marginTop: 8, fontSize: 11, color: "#a1a1aa", fontStyle: "italic" }}>📝 {c.nota}</div>}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
