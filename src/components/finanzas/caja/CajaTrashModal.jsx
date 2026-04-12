import { useEffect } from "react"
import { cDark } from "../ui/darkStyles"
import DarkBadge from "../ui/DarkBadge"
import { formatMoney, fmtFecha } from "../../../lib/finanzas/helpers"

export default function CajaTrashModal({ eliminados, onRestore, onPermanentDelete, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#18181b", borderRadius: 16, width: "100%", maxWidth: 900,
          maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column",
          border: "1px solid #3f3f46", boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #3f3f46", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#f87171", display: "flex", alignItems: "center", gap: 8 }}>
              🗑️ Papelera de movimientos
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "#71717a" }}>
              {eliminados.length} movimiento{eliminados.length !== 1 ? "s" : ""} eliminado{eliminados.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#71717a", fontSize: 22, cursor: "pointer", padding: "4px 8px" }} aria-label="Cerrar">✕</button>
        </div>

        <div style={{ overflow: "auto", flex: 1 }}>
          {eliminados.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#52525b" }}>La papelera está vacía</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
              <thead>
                <tr>
                  <th style={cDark.th}>#</th>
                  <th style={cDark.th}>Fecha</th>
                  <th style={cDark.th}>Tipo</th>
                  <th style={{ ...cDark.th, textAlign: "right" }}>Monto</th>
                  <th style={cDark.th}>Modalidad</th>
                  <th style={cDark.th}>Origen</th>
                  <th style={cDark.th}>Concepto</th>
                  <th style={cDark.th}></th>
                </tr>
              </thead>
              <tbody>
                {eliminados.map((e) => (
                  <tr key={e.id} style={{ borderBottom: "1px solid rgba(63,63,70,0.3)" }}>
                    <td style={{ ...cDark.td, fontFamily: "monospace", fontSize: 11, color: "#52525b" }}>{e.num || "—"}</td>
                    <td style={{ ...cDark.td, fontFamily: "monospace", fontSize: 12 }}>{fmtFecha(e.fecha)}</td>
                    <td style={cDark.td}>
                      <DarkBadge color={e.tipo === "ingreso" ? "green" : e.tipo === "egreso" ? "red" : "yellow"}>
                        {e.tipo === "ingreso" ? "📥 Ingreso" : e.tipo === "egreso" ? "📤 Egreso" : "🔄 Traspaso"}
                      </DarkBadge>
                    </td>
                    <td style={{ ...cDark.td, textAlign: "right", fontWeight: 700, fontFamily: "monospace", color: e.tipo === "ingreso" ? "#34d399" : e.tipo === "egreso" ? "#f87171" : "#fbbf24" }}>
                      {e.tipo === "egreso" ? "-" : ""}{formatMoney(e.monto)}
                    </td>
                    <td style={cDark.td}>
                      <DarkBadge color={e.modalidad === "Yape" ? "purple" : "neutral"}>
                        {e.modalidad === "Yape" ? "📱 Yape" : "💵 Efectivo"}
                      </DarkBadge>
                    </td>
                    <td style={cDark.td}>
                      <DarkBadge color={e.delNegocio ? "blue" : "yellow"}>
                        {e.delNegocio ? "🏪 Negocio" : "👤 Externo"}
                      </DarkBadge>
                    </td>
                    <td style={{ ...cDark.td, fontSize: 11, color: "#a1a1aa", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.concepto || "—"}
                    </td>
                    <td style={{ ...cDark.td, whiteSpace: "nowrap", textAlign: "right" }}>
                      <button
                        onClick={() => onRestore(e.id)}
                        style={{
                          padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(56,189,248,0.4)",
                          background: "rgba(56,189,248,0.1)", color: "#38bdf8",
                          fontSize: 11, fontWeight: 700, cursor: "pointer", marginRight: 6,
                        }}
                      >
                        ↩ Restaurar
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Borrar movimiento #${e.num || "?"} definitivamente?\n\nNo se puede deshacer.`)) {
                            onPermanentDelete(e.id)
                          }
                        }}
                        style={{
                          padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.4)",
                          background: "rgba(239,68,68,0.1)", color: "#f87171",
                          fontSize: 11, fontWeight: 700, cursor: "pointer",
                        }}
                      >
                        🗑 Borrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid #3f3f46", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#71717a" }}>
            Los movimientos restaurados vuelven a la lista. Los borrados son permanentes.
          </span>
          <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #3f3f46", background: "#27272a", color: "#a1a1aa", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
