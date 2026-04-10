import { formatMoney } from "../../../lib/finanzas/helpers"

// Visual conciliación between Contratos "en caja" and Caja "del contrato".
// Sits at the top of CajaModule so the user sees at a glance whether the
// numbers cuadran without doing the math in their head.
//
// Three states:
//   - matches → green ✓ "Todo cuadra"
//   - diff > 0 (Caja tiene MÁS que Contratos) → yellow ⚠️ "Sobran S/X"
//   - diff < 0 (Caja tiene MENOS que Contratos) → red ⚠️ "Faltan S/X"
//
// `period` is just for the label ("Sem 14" / "Abr" / "Todo").
export default function ReconciliationChip({ reconciliation, period }) {
  const { esperado, real, diff, matches, contratosCount } = reconciliation

  // No contracts in the period → nothing to reconcile, hide the chip.
  if (contratosCount === 0) return null

  let bg, border, color, icon, label
  if (matches) {
    bg = "rgba(16,185,129,0.1)"
    border = "rgba(16,185,129,0.4)"
    color = "#34d399"
    icon = "✓"
    label = "Todo cuadra"
  } else if (diff > 0) {
    bg = "rgba(245,158,11,0.1)"
    border = "rgba(245,158,11,0.4)"
    color = "#fbbf24"
    icon = "⚠"
    label = `Sobran ${formatMoney(diff)} en Caja`
  } else {
    bg = "rgba(239,68,68,0.1)"
    border = "rgba(239,68,68,0.4)"
    color = "#f87171"
    icon = "⚠"
    label = `Faltan ${formatMoney(Math.abs(diff))} en Caja`
  }

  return (
    <div
      style={{
        background: bg, border: `1px solid ${border}`, borderRadius: 12,
        padding: "12px 16px", display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 12, flexWrap: "wrap",
      }}
      title="Compara lo que Contratos dice que está en caja con lo que Caja realmente tiene marcado como del contrato."
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18, color }}>{icon}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color }}>
            {label}
            {period && <span style={{ color: "#71717a", fontWeight: 500, marginLeft: 6 }}>· {period}</span>}
          </div>
          <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 2, fontFamily: "monospace" }}>
            Contratos: {formatMoney(esperado)} &nbsp;·&nbsp; Caja contrato: {formatMoney(real)}
          </div>
        </div>
      </div>
      <span style={{ fontSize: 10, color: "#52525b", maxWidth: 280, textAlign: "right" }}>
        Lo que reportaron tus trabajadores vs lo que vos registraste en caja del contrato.
      </span>
    </div>
  )
}
