import { formatMoney } from "../../../../lib/finanzas/helpers"

// Small "who has my money" panel — used as the `extra` slot of SummaryPanel.
export default function QuienTienePlata({ porPersona }) {
  const total = Object.values(porPersona).reduce((a, b) => a + b, 0)
  if (total === 0) return null
  const conPlata = Object.entries(porPersona).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])

  return (
    <div style={{ padding: "0 20px 20px" }}>
      <div style={{ background: "rgba(127,29,29,0.15)", borderRadius: 12, padding: 16, border: "1px solid rgba(239,68,68,0.2)" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#f87171", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>🔍 QUIÉN TIENE MI PLATA</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {conPlata.map(([name, val]) => (
            <div key={name} style={{ background: "rgba(39,39,42,0.8)", borderRadius: 10, padding: "8px 14px", border: "1px solid rgba(239,68,68,0.2)", minWidth: 90 }}>
              <div style={{ fontSize: 11, color: "#71717a", fontWeight: 600 }}>{name}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#f87171" }}>{formatMoney(Math.round(val))}</div>
            </div>
          ))}
          <div style={{ background: "rgba(127,29,29,0.4)", borderRadius: 10, padding: "8px 14px", minWidth: 90 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>Total</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{formatMoney(Math.round(total))}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
