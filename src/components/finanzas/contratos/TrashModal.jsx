import { useEffect } from "react"
import { cDark } from "../ui/darkStyles"
import DarkBadge from "../ui/DarkBadge"
import { formatMoney, calcContract } from "../../../lib/finanzas/helpers"

// Modal that lists all soft-deleted contracts with two actions per row:
// Restaurar (puts the row back) or Borrar (hard delete from cloud + local).
//
// Lives in its own modal so the main toolbar stays clean even when the
// papelera has many entries — the previous inline chips overflowed and
// looked cluttered.
export default function TrashModal({ eliminados, onRestore, onPermanentDelete, onClose }) {
  // Close on ESC.
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
          background: "#18181b", borderRadius: 16, width: "100%", maxWidth: 1100,
          maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column",
          border: "1px solid #3f3f46", boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #3f3f46", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#f87171", display: "flex", alignItems: "center", gap: 8 }}>
              🗑️ Papelera de contratos
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "#71717a" }}>
              {eliminados.length} contrato{eliminados.length !== 1 ? "s" : ""} eliminado{eliminados.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#71717a", fontSize: 22, cursor: "pointer", padding: "4px 8px" }}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ overflow: "auto", flex: 1 }}>
          {eliminados.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#52525b" }}>
              La papelera está vacía
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={cDark.th}>Código</th>
                  <th style={cDark.th}>Cliente</th>
                  <th style={{ ...cDark.th, textAlign: "right" }}>Total</th>
                  <th style={cDark.th}>Adelanto</th>
                  <th style={cDark.th}>Cobro</th>
                  <th style={{ ...cDark.th, textAlign: "right" }}>Desc.</th>
                  <th style={{ ...cDark.th, textAlign: "right" }}>Ganancia</th>
                  <th style={cDark.th}>Notas</th>
                  <th style={cDark.th}></th>
                </tr>
              </thead>
              <tbody>
                {eliminados.map((c) => {
                  const calc = calcContract(c)
                  return (
                    <tr key={c.id} style={{ borderBottom: "1px solid rgba(63,63,70,0.3)" }}>
                      <td style={cDark.td}>
                        <span style={{ fontWeight: 700, color: "#38bdf8", fontFamily: "monospace", fontSize: 12 }}>{c.id}</span>
                      </td>
                      <td style={cDark.td}>{c.cliente || <span style={{ color: "#52525b" }}>—</span>}</td>
                      <td style={{ ...cDark.td, textAlign: "right", fontWeight: 700 }}>{formatMoney(c.total)}</td>
                      <td style={cDark.td}>
                        {c.noTrackAdel ? (
                          <DarkBadge color="neutral">No track.</DarkBadge>
                        ) : c.adelanto > 0 ? (
                          <>
                            <div>{formatMoney(c.adelanto)}</div>
                            <div style={{ fontSize: 10, color: "#a1a1aa" }}>{c.modalAdel || "—"} · {c.recibioAdel || "—"}</div>
                          </>
                        ) : (
                          <span style={{ color: "#52525b" }}>—</span>
                        )}
                      </td>
                      <td style={cDark.td}>
                        {c.noTrackCobro ? (
                          <DarkBadge color="neutral">No track.</DarkBadge>
                        ) : c.cobro > 0 ? (
                          <>
                            <div>{formatMoney(c.cobro)}</div>
                            <div style={{ fontSize: 10, color: "#a1a1aa" }}>{c.modalCobro || "—"} · {c.recibioCobro || "—"}</div>
                          </>
                        ) : (
                          <span style={{ color: "#52525b" }}>—</span>
                        )}
                      </td>
                      <td style={{ ...cDark.td, textAlign: "right" }}>
                        {c.descuento > 0 ? <span style={{ color: "#f87171" }}>-{formatMoney(c.descuento)}</span> : <span style={{ color: "#52525b" }}>—</span>}
                      </td>
                      <td style={{ ...cDark.td, textAlign: "right", color: "#34d399", fontWeight: 700 }}>{formatMoney(calc.ganancia)}</td>
                      <td style={{ ...cDark.td, fontSize: 11, color: "#a1a1aa", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.notas || <span style={{ color: "#52525b" }}>—</span>}
                      </td>
                      <td style={{ ...cDark.td, whiteSpace: "nowrap", textAlign: "right" }}>
                        <button
                          onClick={() => onRestore(c.id)}
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
                            if (window.confirm(`¿Borrar ${c.id} definitivamente?\n\nNo se puede deshacer. Se eliminará también de la nube.`)) {
                              onPermanentDelete(c.id)
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
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid #3f3f46", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#71717a" }}>
            Los contratos restaurados vuelven a la lista. Los borrados son permanentes.
          </span>
          <button
            onClick={onClose}
            style={{
              padding: "8px 18px", borderRadius: 8, border: "1px solid #3f3f46",
              background: "#27272a", color: "#a1a1aa",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
