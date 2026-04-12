import { cDark } from "../ui/darkStyles"
import DarkBadge from "../ui/DarkBadge"
import { formatMoney, fmtFecha } from "../../../lib/finanzas/helpers"

const thS = { padding: "10px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#a1a1aa", textAlign: "left", whiteSpace: "nowrap", background: "rgba(39,39,42,0.9)", borderBottom: "2px solid rgba(63,63,70,0.8)" }

// Sortable, hover-highlightable list of cash entries with row actions.
// Two delete buttons per row mirroring the Contratos/Registro pattern:
//   🗑️  → soft delete (papelera, can be restored)
//   🗑️× → hard delete (skips papelera, gone immediately, with confirm)
export default function EntriesTable({
  filtered, sortBy, sortDir, toggleSort, editId,
  totalIngresos, totalEgresos, balance, traspasoTotal,
  onEdit, onRemove, onPermanentDelete,
}) {
  return (
    <div style={cDark.card}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...thS, width: 40, cursor: "pointer", color: sortBy === "num" ? "#38bdf8" : "#a1a1aa" }} onClick={() => toggleSort("num")}># {sortBy === "num" ? (sortDir === "asc" ? "▲" : "▼") : ""}</th>
              <th style={{ ...thS, cursor: "pointer", color: sortBy === "fecha" ? "#38bdf8" : "#a1a1aa" }} onClick={() => toggleSort("fecha")}>Fecha {sortBy === "fecha" ? (sortDir === "asc" ? "▲" : "▼") : ""}</th>
              {["Tipo", "Monto", "Modalidad", "Origen", "Fuente", "Cat.", "Concepto", "Quién entregó", ""].map(h => <th key={h} style={thS}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={12} style={{ padding: 40, textAlign: "center", color: "#52525b" }}>No hay movimientos</td></tr>
            ) : filtered.map(e => {
              const isEditing = editId === e.id
              return (
                <tr key={e.id} style={{ borderBottom: "1px solid rgba(63,63,70,0.3)", background: isEditing ? "rgba(14,165,233,0.08)" : "transparent" }}
                  onMouseEnter={ev => { if (!isEditing) ev.currentTarget.style.background = "rgba(39,39,42,0.4)" }}
                  onMouseLeave={ev => { if (!isEditing) ev.currentTarget.style.background = "transparent" }}>
                  <td style={{ padding: "10px 14px", color: "#52525b", fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>{e.num || "—"}</td>
                  <td style={{ padding: "10px 14px", color: "#d4d4d8", fontFamily: "monospace", fontSize: 12 }}>{fmtFecha(e.fecha)}</td>
                  <td style={{ padding: "10px 14px" }}><DarkBadge color={e.tipo === "ingreso" ? "green" : e.tipo === "egreso" ? "red" : "yellow"}>{e.tipo === "ingreso" ? "📥 Ingreso" : e.tipo === "egreso" ? "📤 Egreso" : "🔄 Traspaso"}</DarkBadge></td>
                  <td style={{ padding: "10px 14px", fontWeight: 700, fontFamily: "monospace", color: e.tipo === "ingreso" ? "#34d399" : e.tipo === "egreso" ? "#f87171" : "#fbbf24" }}>{e.tipo === "egreso" ? "-" : ""}{formatMoney(e.monto)}</td>
                  <td style={{ padding: "10px 14px" }}>{e.tipo === "traspaso" ? <DarkBadge color="yellow">{e.modalidad === "Yape>Efectivo" ? "📱→💵" : "💵→📱"}</DarkBadge> : <DarkBadge color={e.modalidad === "Yape" ? "purple" : "neutral"}>{e.modalidad === "Yape" ? "📱 Yape" : "💵 Efectivo"}</DarkBadge>}</td>
                  <td style={{ padding: "10px 14px" }}><DarkBadge color={e.delNegocio ? "blue" : "yellow"}>{e.delNegocio ? "🏪 Negocio" : "👤 Externo"}</DarkBadge></td>
                  <td style={{ padding: "10px 14px" }}>{e.gastoAjeno ? <DarkBadge color="yellow">💰 Personal</DarkBadge> : e.delNegocio !== false ? (e.deContrato ? <DarkBadge color="purple">📋 Contrato</DarkBadge> : <DarkBadge color="neutral">Fuera</DarkBadge>) : null}</td>
                  <td style={{ padding: "10px 14px" }}>{e.categoria === "sueldo" ? <DarkBadge color="yellow">💰 Sueldo</DarkBadge> : e.categoria === "servicio" ? <DarkBadge color="blue">🏢 Servicio</DarkBadge> : null}</td>
                  <td style={{ padding: "10px 14px", color: "#d4d4d8" }}>{e.concepto}</td>
                  <td style={{ padding: "10px 14px", color: "#a1a1aa" }}>{e.quien || "—"}</td>
                  <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                    {isEditing && <span style={{ fontSize: 9, color: "#38bdf8", fontWeight: 700, marginRight: 4 }}>editando</span>}
                    <button onClick={() => onEdit(e)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: isEditing ? "#38bdf8" : "#52525b" }} title="Editar">✏️</button>
                    <button onClick={() => onRemove(e.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#52525b" }} title="Mover a papelera">🗑️</button>
                    <button
                      onClick={() => {
                        if (window.confirm(`¿Borrar movimiento #${e.num || "?"} definitivamente?\n\nNo pasa por la papelera. No se puede deshacer.`)) {
                          onPermanentDelete(e.id)
                        }
                      }}
                      title="Borrar permanente (sin pasar por papelera)"
                      style={{
                        background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.45)",
                        borderRadius: 4, cursor: "pointer", padding: "2px 5px",
                        color: "#f87171", fontSize: 11, fontWeight: 700, marginLeft: 2,
                        display: "inline-flex", alignItems: "center", gap: 2,
                      }}
                    >
                      🗑️<span style={{ fontSize: 9 }}>×</span>
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div style={{ padding: "12px 16px", borderTop: "2px solid rgba(63,63,70,0.5)", display: "flex", gap: 20, fontSize: 12, fontWeight: 700, flexWrap: "wrap" }}>
            <span style={{ color: "#34d399" }}>Ingresos: {formatMoney(totalIngresos)}</span>
            <span style={{ color: "#f87171" }}>Egresos: {formatMoney(totalEgresos)}</span>
            {traspasoTotal > 0 && <span style={{ color: "#fbbf24" }}>Traspasos: {formatMoney(traspasoTotal)}</span>}
            <span style={{ color: balance >= 0 ? "#34d399" : "#f87171" }}>Balance: {formatMoney(balance)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
