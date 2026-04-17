import { useState, useMemo } from "react"
import { cDark } from "../../ui/darkStyles"
import DarkBadge from "../../ui/DarkBadge"
import DarkStatCard from "../../ui/DarkStatCard"
import { formatMoney, calcContract, parseLocalDate, getContractHomeDate } from "../../../../lib/finanzas/helpers"

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
  sortBy, sortDir, toggleSort,
  onEdit, onDelete, onPermanentDelete,
  readOnly = false,
}) {
  const [showAll, setShowAll] = useState(true)

  const stats = useMemo(() => {
    let total = 0, ganancia = 0, enCaja = 0, pendiente = 0
    filtered.forEach(c => {
      const calc = calcContract(c)
      total += c.total || 0
      ganancia += calc.ganancia
      enCaja += calc.enCaja
      pendiente += calc.pendiente
    })
    // Distinta fórmula a helpers.js: aquí resta pendiente porque solo muestra plata ya cobrada pero no entregada a caja
    const porRecibir = Math.max(0, ganancia - pendiente - enCaja)
    return { total, ganancia, enCaja, pendiente, porRecibir }
  }, [filtered])

  // Últimos 7 por fecha (home date desc). Si showAll está activo, muestra toda la lista.
  // No altera `stats` — los cards siguen reflejando el filtro completo.
  const shown = useMemo(() => {
    if (showAll) return filtered
    return [...filtered]
      .sort((a, b) => (getContractHomeDate(b) || "").localeCompare(getContractHomeDate(a) || ""))
      .slice(0, 7)
  }, [filtered, showAll])

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
          <div style={{ marginLeft: "auto", display: "inline-flex", borderRadius: 8, background: "#09090b", padding: 2, border: "1px solid #3f3f46" }}>
            <button onClick={() => setShowAll(true)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, background: showAll ? "#0ea5e9" : "transparent", color: showAll ? "#fff" : "#71717a", transition: "all .2s" }}>Todo</button>
            <button onClick={() => setShowAll(false)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, background: !showAll ? "#0ea5e9" : "transparent", color: !showAll ? "#fff" : "#71717a", transition: "all .2s" }}>Últimos 7</button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th
                  style={{ ...cDark.th, cursor: "pointer", color: sortBy === "num" ? "#38bdf8" : cDark.th.color, width: 50 }}
                  onClick={() => toggleSort && toggleSort("num")}
                  title="Ordenar por número (reset por año)"
                >
                  # {sortBy === "num" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>
                {["Código", "Cliente", "Fecha", "Total", "Adelanto", "Cobro", "Desc.", "Ganancia", "En Caja", "Estado", "Dep.", "Notas"].map(h =>
                  <th key={h} style={cDark.th}>{h}</th>
                )}
                {!readOnly && <th style={cDark.th}></th>}
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr><td colSpan={readOnly ? 13 : 14} style={{ padding: 40, textAlign: "center", color: "#52525b" }}>No hay contratos con estos filtros<br/><span style={{ fontSize: 11 }}>Probá limpiar los filtros con el botón ✕</span></td></tr>
              ) : shown.map(c => {
                const calc = calcContract(c)
                return (
                  <tr key={c.id} style={{ borderBottom: "1px solid rgba(63,63,70,0.3)", opacity: c.cancelado ? 0.55 : 1 }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(39,39,42,0.4)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ ...cDark.td, color: "#71717a", fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>
                      {typeof c.num === "number" ? c.num : "—"}
                      {c.anio && typeof c.num === "number" && (
                        <div style={{ fontSize: 9, color: "#3f3f46", fontWeight: 500 }}>{c.anio}</div>
                      )}
                    </td>
                    <td style={cDark.td}><span style={{ fontWeight: 700, color: "#38bdf8", fontFamily: "monospace", fontSize: 12 }}>{c.id}</span></td>
                    <td style={cDark.td}>{c.cliente || "—"}</td>
                    <td style={{ ...cDark.td, fontFamily: "monospace", fontSize: 11, whiteSpace: "nowrap", lineHeight: 1.4 }}>
                      {(() => {
                        const adelDates = (c.adelantos || []).filter(a => !a.noTrack && a.fecha).map(a => fmtDateShort(a.fecha)).filter(Boolean)
                        const cobroDates = (c.cobros || []).filter(a => !a.noTrack && a.fecha).map(a => fmtDateShort(a.fecha)).filter(Boolean)
                        if (!adelDates.length && !cobroDates.length) return <span style={{ color: "#52525b" }}>—</span>
                        return (
                          <>
                            {adelDates.length > 0 && <div><span style={{ color: "#52525b", fontSize: 9, marginRight: 4 }}>adel</span><span style={{ color: "#34d399" }}>{adelDates.join(", ")}</span></div>}
                            {cobroDates.length > 0 && <div><span style={{ color: "#52525b", fontSize: 9, marginRight: 4 }}>cobro</span><span style={{ color: "#38bdf8" }}>{cobroDates.join(", ")}</span></div>}
                          </>
                        )
                      })()}
                    </td>
                    <td style={{ ...cDark.td, fontWeight: 700, color: "#e4e4e7", textDecoration: c.cancelado ? "line-through" : "none" }}>{formatMoney(c.total)}</td>
                    <td style={{ ...cDark.td, textDecoration: c.cancelado ? "line-through" : "none" }}>{(c.adelantos || []).every(a => a.noTrack) ? <DarkBadge color="neutral">No track.</DarkBadge> : <>{(c.adelantos || []).filter(a => !a.noTrack).map((a, i) => <div key={i}>{formatMoney(a.monto)}{a.monto > 0 && a.modalidad ? <span style={{ fontSize: 10, color: "#52525b" }}> {a.modalidad} · {a.recibio || "—"}</span> : null}</div>)}</>}</td>
                    <td style={{ ...cDark.td, textDecoration: c.cancelado ? "line-through" : "none" }}>{(c.cobros || []).every(a => a.noTrack) ? <DarkBadge color="neutral">No track.</DarkBadge> : <>{(c.cobros || []).filter(a => !a.noTrack).map((a, i) => <div key={i}>{formatMoney(a.monto)}{a.monto > 0 && a.modalidad ? <span style={{ fontSize: 10, color: "#52525b" }}> {a.modalidad} · {a.recibio || "—"}</span> : null}</div>)}</>}</td>
                    <td style={cDark.td}>{(c.descuento > 0 || c.gastos > 0) ? <>{c.descuento > 0 && <div style={{ color: "#fbbf24" }}>Desc: -{formatMoney(c.descuento)}</div>}{c.gastos > 0 && <div style={{ color: "#f87171" }}>Gastos: -{formatMoney(c.gastos)}</div>}</> : "—"}</td>
                    <td style={{ ...cDark.td, fontWeight: 700, color: "#34d399" }}>{formatMoney(calc.ganancia)}{calc.exceso > 0 && <div style={{ fontSize: 9, color: "#34d399", opacity: 0.7 }}>+{formatMoney(calc.exceso)} extra</div>}</td>
                    <td style={cDark.td}>{formatMoney(calc.enCaja)}</td>
                    <td style={cDark.td}>{c.cancelado ? <DarkBadge color="red">❌ Cancelado</DarkBadge> : calc.pendiente > 0 ? <DarkBadge color="red">{formatMoney(calc.pendiente)}</DarkBadge> : <DarkBadge color="green">Pagado</DarkBadge>}</td>
                    <td style={cDark.td}>{c.depend ? <DarkBadge color="yellow">SÍ</DarkBadge> : <span style={{ color: "#3f3f46" }}>No</span>}</td>
                    <td style={{ ...cDark.td, fontSize: 11, color: "#71717a", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.notas}</td>
                    {!readOnly && (
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
                    )}
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
