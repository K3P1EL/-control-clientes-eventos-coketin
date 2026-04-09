import { cDark } from "../../ui/darkStyles"
import DarkStatCard from "../../ui/DarkStatCard"
import { formatMoney } from "../../../../lib/finanzas/helpers"

// Reusable summary panel: stats grid + optional `extra` slot below.
export default function SummaryPanel({ title, summary, extra }) {
  return (
    <div style={cDark.card}>
      <div style={cDark.cardHeader}><h3 style={cDark.cardTitle}>{title}</h3></div>
      <div style={{ padding: 20, display: "flex", flexWrap: "wrap", gap: 12 }}>
        <DarkStatCard label="Registros" value={summary.registros} icon="📋" accent="#818cf8" />
        <DarkStatCard label="Ganancia" value={formatMoney(summary.ganancia)} icon="💰" accent="#34d399" />
        <DarkStatCard label="En Caja" value={formatMoney(summary.enCaja)} icon="🏦" accent="#38bdf8" />
        <DarkStatCard label="Pendiente" value={formatMoney(summary.pendiente)} icon="⏳" accent={summary.pendiente > 0 ? "#f87171" : "#34d399"} />
      </div>
      <div style={{ padding: "0 20px 20px", display: "flex", flexWrap: "wrap", gap: 12 }}>
        <DarkStatCard label="Yape" value={formatMoney(summary.ingresoYape)} icon="📱" accent="#a78bfa" />
        <DarkStatCard label="Efectivo" value={formatMoney(summary.ingresoEfectivo)} icon="💵" accent="#4ade80" />
      </div>
      {(summary.deNuevos > 0 || summary.deAnteriores > 0) && (
        <div style={{ padding: "0 20px 20px", display: "flex", flexWrap: "wrap", gap: 12 }}>
          <DarkStatCard label="De contratos nuevos" value={formatMoney(summary.deNuevos)} icon="🆕" accent="#06b6d4" sub="Registrados este periodo" />
          <DarkStatCard label="De anteriores" value={formatMoney(summary.deAnteriores)} icon="🔄" accent="#ea580c" sub="Pagos de periodos previos" />
        </div>
      )}
      {extra}
    </div>
  )
}
