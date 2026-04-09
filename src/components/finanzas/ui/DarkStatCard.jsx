import { cDark } from "./darkStyles"

// Bigger stat card with an accent strip on top. Inline-styled because
// Contratos/Caja are still inline-style modules.
export default function DarkStatCard({ label, value, icon, accent = "#38bdf8", sub }) {
  return (
    <div style={cDark.statCard(accent)}>
      <div style={cDark.statAccent(accent)} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 11, color: "#71717a", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#e4e4e7" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#52525b", marginTop: 2 }}>{sub}</div>}
    </div>
  )
}
