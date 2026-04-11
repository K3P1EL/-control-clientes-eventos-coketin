import { useState, useMemo } from "react"
import { cDark } from "../../ui/darkStyles"
import DarkBadge from "../../ui/DarkBadge"
import DarkStatCard from "../../ui/DarkStatCard"
import { formatMoney, calcContract, parseLocalDate } from "../../../../lib/finanzas/helpers"

const MESES_CORTOS = ["", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

// "2026-04-02" → "02-abr-26". Returns null if not parseable so callers
// can distinguish "missing" from a valid date string.
function fmtDateShort(raw) {
  const d = parseLocalDate(raw)
  if (!d) return null
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = MESES_CORTOS[d.getMonth() + 1]
  const yy = String(d.getFullYear()).slice(-2)
  return `${dd}-${mm}-${yy}`
}

// Tabular view of contracts with stat cards, search, status filter,
// and per-row edit/delete buttons.
//
// Two delete buttons per row, mirroring the Registro pattern:
//   🗑️  → soft delete (sends to Papelera, can be restored)
//   🗑️× → hard delete (skips Papelera, gone immediately, with confirm)
export default function TablaView({
  filtered, filteredSummary, filterSem, filterMes, currentWeekNum, quickLabel,
  filterEstado, setFilterEstado, search, setSearch, setQuickAll,
  onEdit, onDelete, onPermanentDelete,
}) {
  const stats = useMemo(() => {
    let total = 0, ganancia = 0, enCaja = 0, pendiente = 0
    filtered.forEach(c => {
      const calc = calcContract(c)
      total += c.total || 0
      ganancia += calc.ganancia
      enCaja += calc.enCaja
      pendiente += calc.pendiente
    })
    const porRecibir = Math.max(0, ganancia - pendiente - enCaja)
    return { total, ganancia, enCaja, pendiente, porRecibir }
  }, [filtered])

  return (
    <>
      {quickLabel !== "Todo" && (
        <div style={{ fontSize: 12, color: "#52525b" }}>
          <span style={{ color: "#38bdf8", fontWeight: 700 }}>{quickLabel}</span> · {filtered.length} contrato{filtered.length !== 1 ? "s" : ""}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <DarkStatCard label="Contratos" value={filtered.length} icon="📋" accent="#818cf8" />
        <DarkStatCard label={filteredSummary.pendiente > 0 ? "Ganancia ideal" : "Ganancia"} value={formatMoney(filteredSummary.ganancia)} icon="💰" accent="#34d399" />
        <DarkStatCard label={filteredSummary.pendiente > 0 ? "En Caja" : "En Caja ✓"} value={formatMoney(filteredSummary.enCaja)} icon="🏦" accent={filteredSummary.pendiente > 0 ? "#38bdf8" : "#34d399"} />
        <DarkStatCard label="Pendiente" value={formatMoney(filteredSummary.pendiente)} icon="⏳" accent={filteredSummary.pendiente > 0 ? "#f87171" : "#34d399"} />
        <DarkStatCard label="Yape" value={formatMoney(filteredSummary.ingresoYape)} icon="📱" accent="#a78bfa" />
        <DarkStatCard label="Efectivo" value={formatMoney(filteredSummary.ingresoEfectivo)} icon="💵" accent="#4ade80" />
      </div>
      <div style={cDark.card}>
        <div style={{ padding: "10px 16px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", borderBottom: "1px solid rgba(63,63,70,0.4)" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." style={{ ...cDark.select, width: 160 }} />
          <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} style={cDark.select}>
            <option value="">Todos estados</option>
            <option value="Pagado">Pagado</option>
            <option value="Pendiente">Pendiente</option>
          </select>
          {(filterSem || filterMes || filterEstado || search) && (
            <button onClick={setQuickAll} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✕ Limpiar</button>
          )}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Código", "Cliente", "Fecha", "Total", "Adelanto", "Cobro", "Desc.", "Ganancia", "En Caja", "Estado", "Dep.", "Notas", ""].map(h =>
                  <th key={h} style={cDark.th}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={13} style={{ padding: 40, textAlign: "center", color: "#52525b" }}>No hay contratos con estos filtros<br/><span style={{ fontSize: 11 }}>Probá limpiar los filtros con el botón ✕</span></td></tr>
              ) : filtered.map(c => {
                const calc = calcContract(c)
                return (
                  <tr key={c.id} style={{ borderBottom: "1px solid rgba(63,63,70,0.3)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(39,39,42,0.4)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={cDark.td}><span style={{ fontWeight: 700, color: "#38bdf8", fontFamily: "monospace", fontSize: 12 }}>{c.id}</span></td>
                    <td style={cDark.td}>{c.cliente || "—"}</td>
                    <td style={{ ...cDark.td, fontFamily: "monospace", fontSize: 11, whiteSpace: "nowrap", lineHeight: 1.4 }}>
                      {(() => {
                        const adel = !c.noTrackAdel ? fmtDateShort(c.fechaAdel) : null
                        const cobro = !c.noTrackCobro ? fmtDateShort(c.fechaCobro) : null
                        if (!adel && !cobro) return <span style={{ color: "#52525b" }}>—</span>
                        return (
                          <>
                            <div>
                              <span style={{ color: "#52525b", fontSize: 9, marginRight: 4 }}>adel</span>
                              <span style={{ color: adel ? "#34d399" : "#52525b" }}>{adel || "—"}</span>
                            </div>
                            <div>
                              <span style={{ color: "#52525b", fontSize: 9, marginRight: 4 }}>cobro</span>
                              <span style={{ color: cobro ? "#38bdf8" : "#52525b" }}>{cobro || "—"}</span>
                            </div>
                          </>
                        )
                      })()}
                    </td>
                    <td style={{ ...cDark.td, fontWeight: 700, color: "#e4e4e7" }}>{formatMoney(c.total)}</td>
                    <td style={cDark.td}>{c.noTrackAdel ? <DarkBadge color="neutral">No track.</DarkBadge> : <><div>{formatMoney(c.adelanto)}</div><div style={{ fontSize: 10, color: "#52525b" }}>{c.modalAdel} · {c.recibioAdel}</div></>}</td>
                    <td style={cDark.td}>{c.noTrackCobro ? <DarkBadge color="neutral">No track.</DarkBadge> : <><div>{formatMoney(c.cobro)}</div><div style={{ fontSize: 10, color: "#52525b" }}>{c.modalCobro} · {c.recibioCobro}</div></>}</td>
                    <td style={cDark.td}>{c.descuento > 0 ? <span style={{ color: "#f87171" }}>-{formatMoney(c.descuento)}</span> : "—"}</td>
                    <td style={{ ...cDark.td, fontWeight: 700, color: "#34d399" }}>{formatMoney(calc.ganancia)}</td>
                    <td style={cDark.td}>{formatMoney(calc.enCaja)}</td>
                    <td style={cDark.td}>{calc.pendiente > 0 ? <DarkBadge color="red">{formatMoney(calc.pendiente)}</DarkBadge> : <DarkBadge color="green">Pagado</DarkBadge>}</td>
                    <td style={cDark.td}>{c.depend ? <DarkBadge color="yellow">SÍ</DarkBadge> : <span style={{ color: "#3f3f46" }}>No</span>}</td>
                    <td style={{ ...cDark.td, fontSize: 11, color: "#71717a", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.notas}</td>
                    <td style={{ ...cDark.td, whiteSpace: "nowrap" }}>
                      <button onClick={() => onEdit(c)} style={cDark.iconBtn} title="Editar">✏️</button>
                      <button onClick={() => onDelete(c.id)} style={cDark.iconBtn} title="Mover a papelera">🗑️</button>
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Borrar ${c.id} definitivamente?\n\nNo pasa por la papelera. No se puede deshacer.`)) {
                            onPermanentDelete(c.id)
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
            <div style={{ padding: "12px 16px", borderTop: "2px solid rgba(63,63,70,0.5)", display: "flex", gap: 20, fontSize: 12, fontWeight: 700, color: "#a1a1aa", flexWrap: "wrap" }}>
              <span>Total: {formatMoney(stats.total)}</span>
              <span>Ganancia: {formatMoney(stats.ganancia)}</span>
              <span>En Caja: {formatMoney(stats.enCaja)}</span>
              {stats.porRecibir > 0 && <span style={{ color: "#fbbf24" }}>Por recibir: {formatMoney(stats.porRecibir)}</span>}
              <span>Pendiente: {formatMoney(stats.pendiente)}</span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
