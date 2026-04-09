import { useState, useMemo } from "react"
import { cDark } from "../../ui/darkStyles"
import ComparisonTable from "../components/ComparisonTable"
import SummaryPanel from "../components/SummaryPanel"
import QuienTienePlata from "../components/QuienTienePlata"
import { MESES_CORTO } from "../../../../lib/finanzas/constants"

const QUARTERS = { Q1: [1, 2, 3], Q2: [4, 5, 6], Q3: [7, 8, 9], Q4: [10, 11, 12] }

// Multi-month comparison view. Months can be selected individually,
// by quarter, or full year. Picker grid greys out months without data.
export default function MonthlyView({ activeContracts, anios, currentMonthNum, currentYear, calcSummary }) {
  const [selYear, setSelYear] = useState(currentYear)
  const [selected, setSelected] = useState([currentMonthNum])

  const yearMonths = useMemo(
    () => [...new Set(activeContracts.filter(c => (c.anio || 2026) === selYear).map(c => c.mes).filter(Boolean))].sort((a, b) => a - b),
    [activeContracts, selYear]
  )

  const toggle = (m) => setSelected(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort((a, b) => a - b))
  const selectQuarter = (q) => setSelected(QUARTERS[q])

  const summaries = selected.map(m => ({
    id: MESES_CORTO[m],
    summary: calcSummary(activeContracts.filter(c => (c.anio || 2026) === selYear && c.mes === m), { type: "mes", value: m, year: selYear }),
  }))

  const monthGridStyle = (m) => {
    const hasData = yearMonths.includes(m)
    const isSelected = selected.includes(m)
    return {
      padding: "10px 6px", borderRadius: 10, cursor: "pointer", textAlign: "center",
      border: isSelected ? "2px solid #38bdf8" : "1px solid #3f3f46",
      background: isSelected ? "rgba(14,165,233,0.15)" : hasData ? "rgba(39,39,42,0.6)" : "rgba(24,24,27,0.5)",
      color: isSelected ? "#38bdf8" : hasData ? "#d4d4d8" : "#3f3f46",
      fontWeight: isSelected ? 800 : hasData ? 600 : 400, fontSize: 12, transition: "all 0.15s",
    }
  }

  const pbtn = (active) => ({
    padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer",
    border: active ? "1px solid rgba(14,165,233,0.4)" : "1px solid #3f3f46",
    background: active ? "rgba(14,165,233,0.15)" : "#27272a",
    color: active ? "#38bdf8" : "#71717a",
  })

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...cDark.card, padding: 16 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {anios.map(a => (
            <button key={a} onClick={() => setSelYear(a)}
              style={{ padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer", border: "none", background: selYear === a ? "#0c4a6e" : "#27272a", color: selYear === a ? "#fff" : "#71717a" }}>
              {a}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#52525b", alignSelf: "center", marginRight: 4 }}>Trimestre:</span>
          {Object.keys(QUARTERS).map(q => (
            <button key={q} onClick={() => selectQuarter(q)} style={pbtn(JSON.stringify(selected) === JSON.stringify(QUARTERS[q]))}>{q}</button>
          ))}
          <button onClick={() => setSelected([...Array(12)].map((_, i) => i + 1))} style={pbtn(selected.length === 12)}>Año</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
            <button key={m} onClick={() => toggle(m)} style={monthGridStyle(m)}>{MESES_CORTO[m]}</button>
          ))}
        </div>
        {selected.length > 0 && <div style={{ marginTop: 8, fontSize: 11, color: "#52525b" }}>{selected.length === 1 ? "Toca otro mes para comparar" : `${selected.length} meses seleccionados`}</div>}
      </div>
      <ComparisonTable summaries={summaries} nameOf={id => id} />
      {summaries.map(({ id, summary }) => (
        <SummaryPanel key={id} title={id} summary={summary} extra={<QuienTienePlata porPersona={summary.porPersona} />} />
      ))}
      {summaries.length === 0 && <div style={{ ...cDark.card, padding: 40, textAlign: "center", color: "#52525b" }}>Selecciona al menos un mes</div>}
    </div>
  )
}
