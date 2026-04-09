import { useState, useMemo } from "react"
import { cDark } from "../../ui/darkStyles"
import ComparisonTable from "../components/ComparisonTable"
import SummaryPanel from "../components/SummaryPanel"
import QuienTienePlata from "../components/QuienTienePlata"

// Side-by-side weekly comparison view. The user picks a year and a
// week range; we ask the calcSummary helper for one summary per week.
export default function WeeklyView({ activeContracts, anios, currentWeekNum, currentMonthNum, currentYear, calcSummary }) {
  const [selYear, setSelYear] = useState(currentYear)
  const [rangeFrom, setRangeFrom] = useState(Math.max(1, currentWeekNum - 3))
  const [rangeTo, setRangeTo] = useState(currentWeekNum)
  const [preset, setPreset] = useState("4sem")

  const yearWeeks = useMemo(
    () => [...new Set(activeContracts.filter(c => (c.anio || 2026) === selYear).map(c => c.semana).filter(Boolean))].sort((a, b) => a - b),
    [activeContracts, selYear]
  )
  const maxWeek = Math.max(currentWeekNum, ...yearWeeks)

  function applyPreset(p) {
    setPreset(p)
    if (p === "4sem") { setRangeFrom(Math.max(1, currentWeekNum - 3)); setRangeTo(currentWeekNum) }
    else if (p === "8sem") { setRangeFrom(Math.max(1, currentWeekNum - 7)); setRangeTo(currentWeekNum) }
    else if (p === "estemes") {
      const semsDelMes = activeContracts.filter(c => (c.anio || 2026) === selYear && c.mes === currentMonthNum).map(c => c.semana).filter(Boolean)
      if (semsDelMes.length > 0) { setRangeFrom(Math.min(...semsDelMes)); setRangeTo(Math.max(...semsDelMes)) }
    }
  }

  const rangeWeeks = []
  for (let i = rangeFrom; i <= rangeTo; i++) rangeWeeks.push(i)
  const summaries = rangeWeeks.filter(w => yearWeeks.includes(w)).map(w => ({
    id: w,
    summary: calcSummary(activeContracts.filter(c => (c.anio || 2026) === selYear && c.semana === w), { type: "semana", value: w, year: selYear }),
  }))
  const allWeekOptions = []
  for (let i = 1; i <= maxWeek; i++) allWeekOptions.push(i)

  const pbtn = (active) => ({
    padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer",
    border: active ? "1px solid rgba(14,165,233,0.4)" : "1px solid #3f3f46",
    background: active ? "rgba(14,165,233,0.15)" : "#27272a",
    color: active ? "#38bdf8" : "#71717a", whiteSpace: "nowrap",
  })

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...cDark.card, padding: 16 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {anios.map(a => (
            <button key={a} onClick={() => { setSelYear(a); applyPreset(preset) }}
              style={{ padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer", border: "none", background: selYear === a ? "#0c4a6e" : "#27272a", color: selYear === a ? "#fff" : "#71717a" }}>
              {a}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#52525b", alignSelf: "center", marginRight: 4 }}>Rápido:</span>
          <button onClick={() => applyPreset("4sem")} style={pbtn(preset === "4sem")}>Últimas 4 sem</button>
          <button onClick={() => applyPreset("8sem")} style={pbtn(preset === "8sem")}>Últimas 8 sem</button>
          <button onClick={() => applyPreset("estemes")} style={pbtn(preset === "estemes")}>Este mes</button>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#d4d4d8" }}>Rango:</span>
          <select value={rangeFrom} onChange={e => { setRangeFrom(+e.target.value); setPreset("") }} style={cDark.select}>
            {allWeekOptions.map(w => <option key={w} value={w}>Sem {w}</option>)}
          </select>
          <span style={{ fontSize: 11, color: "#52525b" }}>→</span>
          <select value={rangeTo} onChange={e => { setRangeTo(+e.target.value); setPreset("") }} style={cDark.select}>
            {allWeekOptions.filter(w => w >= rangeFrom).map(w => <option key={w} value={w}>Sem {w}</option>)}
          </select>
          <span style={{ fontSize: 11, color: "#52525b" }}>{summaries.length} semana{summaries.length !== 1 ? "s" : ""} con datos</span>
        </div>
      </div>
      <ComparisonTable summaries={summaries} nameOf={id => `Sem ${id}`} />
      {summaries.map(({ id, summary }) => (
        <SummaryPanel key={id} title={`Semana ${id}${id === currentWeekNum ? " (actual)" : ""}`} summary={summary} extra={<QuienTienePlata porPersona={summary.porPersona} />} />
      ))}
      {summaries.length === 0 && <div style={{ ...cDark.card, padding: 40, textAlign: "center", color: "#52525b" }}>No hay contratos en este rango para {selYear}</div>}
    </div>
  )
}
