import { useMemo } from "react"
import { cDark } from "../../ui/darkStyles"
import DarkBadge from "../../ui/DarkBadge"
import { formatMoney, calcContract, parseLocalDate, peruNow } from "../../../../lib/finanzas/helpers"

// Vista "Pendientes": lista todos los contratos activos que aún tienen
// saldo por cobrar (estado = "Pendiente"). Los ordena del más antiguo
// al más reciente por "home date" (fecha del primer pago, o fecha del
// evento del contrato) para que saltan a la vista los que más tardan.
export default function PendientesView({ activeContracts, onEdit }) {
  const hoy = useMemo(() => {
    const n = peruNow()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`
  }, [])

  const pendientes = useMemo(() => {
    return activeContracts
      .map(c => {
        if (c.cancelado) return null
        const calc = calcContract(c)
        const pagoPendiente = calc.estado === "Pendiente"
        const eventoFuturo = c.fechaEvento && c.fechaEvento >= hoy
        if (!pagoPendiente && !eventoFuturo) return null
        const firstAdel = (c.adelantos || []).find(a => a.fecha)
        const firstCobro = (c.cobros || []).find(a => a.fecha)
        const homeFecha = c.fechaEvento || firstAdel?.fecha || firstCobro?.fecha || null
        const motivo = pagoPendiente && eventoFuturo ? "ambos"
          : pagoPendiente ? "pago"
          : "trabajo"
        return { contract: c, calc, homeFecha, motivo }
      })
      .filter(Boolean)
      .sort((a, b) => (a.homeFecha || "").localeCompare(b.homeFecha || ""))
  }, [activeContracts, hoy])

  const totalPendiente = pendientes.reduce((s, p) => s + p.calc.pendiente, 0)
  const totalGanancia = pendientes.reduce((s, p) => s + p.calc.ganancia, 0)
  const totalTrabajoPendiente = pendientes.filter(p => p.motivo === "trabajo" || p.motivo === "ambos").length
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
            {pendientes.length} contrato{pendientes.length !== 1 ? "s" : ""}
            {totalTrabajoPendiente > 0 && <span> · {totalTrabajoPendiente} con trabajo pendiente</span>}
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
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "grid", gridTemplateColumns: "56px 1fr 110px 100px 90px 80px 100px", gap: 8, padding: "6px 14px", fontSize: 10, color: "#52525b", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
            <span>Código</span><span>Evento</span><span>Fecha</span><span>Estado</span><span style={{ textAlign: "right" }}>Total</span><span style={{ textAlign: "right" }}>Cobrado</span><span style={{ textAlign: "right" }}>Pendiente</span>
          </div>
          {pendientes.map(({ contract: c, calc, homeFecha, motivo }) => {
            const dias = diasAtras(homeFecha)
            const alerta = motivo === "pago" && dias !== null && dias > 14
            const fechaLabel = fmtFecha(homeFecha)
            const cobrado = calc.precioFinal - calc.pendiente
            const badgeColor = motivo === "trabajo" ? "blue" : "yellow"
            const badgeText = motivo === "trabajo" ? "Trabajo pend." : motivo === "ambos" ? "Pendiente" : "Pago pend."
            const servicios = (c.productos || []).slice(0, 3).join(" + ") + ((c.productos || []).length > 3 ? ` +${c.productos.length - 3}` : "")
            return (
              <div key={c.id}
                onClick={() => onEdit && onEdit(c)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "56px 1fr 110px 100px 90px 80px 100px",
                  gap: 8,
                  alignItems: "center",
                  background: "rgba(24,24,27,0.8)",
                  borderRadius: 10,
                  border: `1px solid ${alerta ? "rgba(239,68,68,0.35)" : motivo === "trabajo" ? "rgba(56,189,248,0.25)" : "rgba(63,63,70,0.5)"}`,
                  padding: "10px 14px",
                  cursor: onEdit ? "pointer" : "default",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { if (onEdit) e.currentTarget.style.background = "rgba(63,63,70,0.35)" }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(24,24,27,0.8)" }}
                title={onEdit ? "Clic para editar el contrato" : ""}
              >
                <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#38bdf8" }}>{c.id}</span>
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#e4e4e7", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.cliente || "(sin cliente)"}</div>
                  {servicios && <div style={{ fontSize: 10, color: "#34d399", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{servicios}</div>}
                </div>
                <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 600, color: alerta ? "#f87171" : "#a1a1aa", background: alerta ? "rgba(239,68,68,0.1)" : "transparent", padding: alerta ? "2px 6px" : 0, borderRadius: 6 }}>
                  {fechaLabel ? `📅 ${fechaLabel}` : "—"}
                  {dias !== null && dias > 0 ? ` (${dias}d)` : ""}
                </span>
                <DarkBadge color={badgeColor}>{badgeText}</DarkBadge>
                <span style={{ textAlign: "right", fontSize: 11, color: "#a1a1aa", fontFamily: "monospace", fontWeight: 600 }}>{formatMoney(Math.round(calc.precioFinal))}</span>
                <span style={{ textAlign: "right", fontSize: 11, color: "#34d399", fontFamily: "monospace", fontWeight: 600 }}>{formatMoney(Math.round(cobrado))}</span>
                <span style={{ textAlign: "right", fontSize: 14, fontWeight: 900, color: motivo === "trabajo" ? "#34d399" : "#fbbf24", fontFamily: "monospace" }}>{calc.pendiente > 0 ? formatMoney(Math.round(calc.pendiente)) : "✅ Pagado"}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
