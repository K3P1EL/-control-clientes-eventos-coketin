import { useMemo } from "react"
import { cDark } from "../../ui/darkStyles"
import DarkBadge from "../../ui/DarkBadge"
import { formatMoney, calcContract, parseLocalDate, peruNow } from "../../../../lib/finanzas/helpers"

// Vista "Pendientes": lista todos los contratos activos que aún tienen
// saldo por cobrar (estado = "Pendiente"). Los ordena del más antiguo
// al más reciente por "home date" (fecha del primer pago, o fecha del
// evento del contrato) para que saltan a la vista los que más tardan.
export default function PendientesView({ activeContracts, onEdit }) {
  const pendientes = useMemo(() => {
    return activeContracts
      .map(c => {
        const calc = calcContract(c)
        if (calc.estado !== "Pendiente") return null
        const firstAdel = (c.adelantos || []).find(a => a.fecha)
        const firstCobro = (c.cobros || []).find(a => a.fecha)
        const homeFecha = firstAdel?.fecha || firstCobro?.fecha || null
        return { contract: c, calc, homeFecha }
      })
      .filter(Boolean)
      .sort((a, b) => (a.homeFecha || "").localeCompare(b.homeFecha || ""))
  }, [activeContracts])

  const totalPendiente = pendientes.reduce((s, p) => s + p.calc.pendiente, 0)
  const totalGanancia = pendientes.reduce((s, p) => s + p.calc.ganancia, 0)
  const now = peruNow()

  const fmtFecha = (f) => {
    if (!f) return null
    const p = f.split("-")
    if (p.length !== 3) return f
    const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
    return `${p[2]}-${meses[+p[1] - 1] || p[1]}`
  }

  const diasAtras = (f) => {
    if (!f) return null
    const d = parseLocalDate(f)
    if (!d) return null
    const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: totalPendiente > 0 ? "linear-gradient(135deg, #78350f 0%, #451a03 100%)" : "linear-gradient(135deg, #065f46 0%, #064e3b 100%)", borderRadius: 16, padding: "24px 28px", color: "#fff" }}>
        <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.8, marginBottom: 4 }}>
          {totalPendiente > 0 ? "TOTAL PENDIENTE DE COBRAR" : "TODO COBRADO ✅"}
        </div>
        <div style={{ fontSize: 36, fontWeight: 900 }}>{formatMoney(Math.round(totalPendiente))}</div>
        {pendientes.length > 0 && (
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
            {pendientes.length} contrato{pendientes.length !== 1 ? "s" : ""} pendiente{pendientes.length !== 1 ? "s" : ""}
            <span style={{ opacity: 0.6 }}> · Ganancia total: {formatMoney(Math.round(totalGanancia))}</span>
          </div>
        )}
      </div>

      {pendientes.length === 0 ? (
        <div style={{ ...cDark.card, padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#34d399" }}>Ningún contrato pendiente</div>
          <div style={{ fontSize: 12, color: "#71717a", marginTop: 4 }}>Todo lo activo ya está pagado completo</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {pendientes.map(({ contract: c, calc, homeFecha }) => {
            const dias = diasAtras(homeFecha)
            const alerta = dias !== null && dias > 14
            const fechaLabel = fmtFecha(homeFecha)
            return (
              <div key={c.id}
                onClick={() => onEdit && onEdit(c)}
                style={{
                  ...cDark.card,
                  cursor: onEdit ? "pointer" : "default",
                  border: alerta ? "1px solid rgba(239,68,68,0.35)" : cDark.card.border,
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { if (onEdit) e.currentTarget.style.background = "rgba(63,63,70,0.25)" }}
                onMouseLeave={e => { e.currentTarget.style.background = cDark.card.background }}
                title={onEdit ? "Clic para editar el contrato" : ""}
              >
                <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(63,63,70,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#38bdf8" }}>{c.id}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#e4e4e7" }}>{c.cliente || "(sin cliente)"}</span>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 900, color: "#fbbf24" }}>{formatMoney(Math.round(calc.pendiente))}</span>
                </div>
                <div style={{ padding: "10px 16px", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", fontSize: 11, color: "#a1a1aa" }}>
                  {fechaLabel && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, color: alerta ? "#f87171" : "#a1a1aa", fontFamily: "monospace", fontWeight: 600, background: alerta ? "rgba(239,68,68,0.1)" : "transparent", padding: alerta ? "2px 8px" : 0, borderRadius: 6 }}>
                      📅 {fechaLabel}
                      {dias !== null && dias > 0 && <span style={{ opacity: 0.7 }}>({dias}d)</span>}
                    </span>
                  )}
                  <DarkBadge color="yellow">Pendiente</DarkBadge>
                  <span style={{ color: "#71717a" }}>
                    Total: <span style={{ color: "#e4e4e7", fontWeight: 600 }}>{formatMoney(Math.round(calc.precioFinal))}</span>
                  </span>
                  <span style={{ color: "#71717a" }}>
                    Ya cobrado: <span style={{ color: "#34d399", fontWeight: 600 }}>{formatMoney(Math.round(calc.precioFinal - calc.pendiente))}</span>
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
