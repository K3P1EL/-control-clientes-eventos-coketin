import { cDark } from "../../ui/darkStyles"
import { formatMoney } from "../../../../lib/finanzas/helpers"

const METRICS = [
  { key: "registros", label: "Registros", icon: "📋", format: v => v },
  { key: "ganancia", label: "Ganancia", icon: "💰", format: formatMoney },
  { key: "descuentos", label: "Descuentos", icon: "🏷️", format: formatMoney },
  { key: "enCaja", label: "En Caja", icon: "🏦", format: formatMoney },
  { key: "pendiente", label: "Pendiente", icon: "⏳", format: formatMoney },
  { key: "ingresoYape", label: "Yape", icon: "📱", format: formatMoney },
  { key: "ingresoEfectivo", label: "Efectivo", icon: "💵", format: formatMoney },
  { key: "deNuevos", label: "Contratos nuevos", icon: "🆕", format: formatMoney },
  { key: "deAnteriores", label: "De anteriores", icon: "🔄", format: formatMoney },
]

// Side-by-side comparison table for week/month views. Highlights the
// max in green and min in red, plus a delta column at the right.
export default function ComparisonTable({ summaries, nameOf }) {
  if (summaries.length < 2) return null
  return (
    <div style={cDark.card}>
      <div style={{ ...cDark.cardHeader, background: "rgba(14,165,233,0.05)" }}>
        <h3 style={{ ...cDark.cardTitle, color: "#38bdf8" }}>📊 Comparación ({summaries.length})</h3>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...cDark.th, position: "sticky", left: 0, zIndex: 2 }}>Métrica</th>
              {summaries.map(({ id }) => <th key={id} style={{ ...cDark.th, textAlign: "right", color: "#38bdf8" }}>{nameOf(id)}</th>)}
              <th style={{ ...cDark.th, textAlign: "right", background: "rgba(245,158,11,0.05)", color: "#fbbf24" }}>Δ</th>
            </tr>
          </thead>
          <tbody>
            {METRICS.map(({ key, label, icon, format }) => {
              const values = summaries.map(s => s.summary[key])
              const max = Math.max(...values)
              const min = Math.min(...values)
              const diff = values[values.length - 1] - values[0]
              return (
                <tr key={key} style={{ borderBottom: "1px solid rgba(63,63,70,0.3)" }}>
                  <td style={{ ...cDark.td, fontWeight: 600, whiteSpace: "nowrap", position: "sticky", left: 0, background: "#18181b", zIndex: 1 }}>{icon} {label}</td>
                  {values.map((v, i) => (
                    <td key={i} style={{
                      ...cDark.td, textAlign: "right", fontWeight: 700,
                      color: v === max && max !== min ? "#34d399" : v === min && max !== min ? "#f87171" : "#d4d4d8",
                      background: v === max && max !== min ? "rgba(16,185,129,0.05)" : "transparent",
                    }}>
                      {format(v)}
                    </td>
                  ))}
                  <td style={{
                    ...cDark.td, textAlign: "right", fontWeight: 700, background: "rgba(245,158,11,0.03)",
                    color: diff > 0 ? "#34d399" : diff < 0 ? "#f87171" : "#71717a",
                  }}>
                    {diff > 0 ? "▲" : diff < 0 ? "▼" : "="} {key === "registros" ? Math.abs(diff) : formatMoney(Math.abs(diff))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
