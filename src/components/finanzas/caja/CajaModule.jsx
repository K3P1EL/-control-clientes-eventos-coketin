import { useState, useMemo } from "react"
import DarkStatCard from "../ui/DarkStatCard"
import { formatMoney, peruToday, peruNow, getWeekNumberISO } from "../../../lib/finanzas/helpers"
import { MESES, MESES_CORTO } from "../../../lib/finanzas/constants"
import { useCajaEntries } from "./hooks/useCajaEntries"
import { useCajaDesglose } from "./hooks/useCajaDesglose"
import { useContratosSnapshot } from "./hooks/useContratosSnapshot"
import { useReconciliation } from "./hooks/useReconciliation"
import EntryForm from "./EntryForm"
import EntriesTable from "./EntriesTable"
import MetricsView from "./MetricsView"
import ReconciliationChip from "./ReconciliationChip"
import CajaTrashModal from "./CajaTrashModal"

const EMPTY_FORM = { fecha: "", tipo: "ingreso", monto: 0, concepto: "", quien: "", modalidad: "Yape", delNegocio: true, deContrato: true, categoria: "" }

// Period filter (filterSem / filterMes) comes from the parent Finanzas.jsx
// so switching between Contratos ↔ Caja keeps the same time window.
export default function CajaModule({ filterSem, filterMes, setQuickAll, setQuickWeek, setQuickMonth }) {
  const { loaded, entries, activeEntries, deletedEntries, addEntry, removeEntry, restoreEntry, permanentDelete, handleReset } = useCajaEntries()

  const currentWeekNum = getWeekNumberISO(peruNow())
  const currentMonthNum = peruNow().getMonth() + 1

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [trashOpen, setTrashOpen] = useState(false)
  const [sortBy, setSortBy] = useState("num")
  const [sortDir, setSortDir] = useState("desc")
  const [showMetrics, setShowMetrics] = useState(false)
  const [soloNegocio, setSoloNegocio] = useState(false)
  const [soloContrato, setSoloContrato] = useState(false)
  const [soloExterno, setSoloExterno] = useState(false)
  const [showAll, setShowAll] = useState(true)

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortBy(field); setSortDir("desc") }
  }

  // Resolve an entry's ISO week/month for filtering. Cheap to compute
  // on the fly — entries are small.
  const entryWeek = (e) => { if (!e.fecha) return null; const d = new Date(e.fecha + "T12:00:00"); return getWeekNumberISO(d) }
  const entryMonth = (e) => { if (!e.fecha) return null; const parts = e.fecha.split("-"); return parts[1] ? +parts[1] : null }

  const filtered = useMemo(() => {
    let list = [...activeEntries]
    if (filterMes) list = list.filter(e => entryMonth(e) === +filterMes)
    if (filterSem) list = list.filter(e => String(entryWeek(e)) === filterSem)
    if (soloExterno) list = list.filter(e => e.delNegocio === false)
    else if (soloNegocio) list = list.filter(e => e.delNegocio !== false)
    if (soloContrato) list = list.filter(e => e.deContrato && e.delNegocio !== false)
    return list.sort((a, b) => {
      let cmp
      if (sortBy === "num") cmp = (a.num || 0) - (b.num || 0)
      else cmp = (a.fecha || "").localeCompare(b.fecha || "")
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [activeEntries, filterMes, filterSem, soloNegocio, soloContrato, soloExterno, sortBy, sortDir])

  // setQuickAll/setQuickWeek/setQuickMonth come from props (shared with Contratos).

  // Single pass over filtered for both totals — avoids two extra
  // .filter().reduce() chains on every render.
  const { totalIngresos, totalEgresos, balance } = useMemo(() => {
    let ing = 0, egr = 0
    for (const e of filtered) {
      if (e.tipo === "ingreso") ing += e.monto || 0
      else if (e.tipo === "egreso") egr += e.monto || 0
    }
    return { totalIngresos: ing, totalEgresos: egr, balance: ing - egr }
  }, [filtered])

  const desglose = useCajaDesglose(filtered)

  // Cross-module reconciliation: compare what Contratos says is "en caja"
  // against what Caja has actually flagged as deNegocio + deContrato.
  // Same period filter so the chip is consistent with the table.
  const contratosSnapshot = useContratosSnapshot()
  const reconciliationPeriod = useMemo(() => {
    if (filterSem) return { type: "semana", value: +filterSem }
    if (filterMes) return { type: "mes", value: +filterMes }
    return { type: null, value: null }
  }, [filterSem, filterMes])
  const reconciliation = useReconciliation(contratosSnapshot, activeEntries, reconciliationPeriod)
  const reconciliationLabel = filterSem ? `Sem ${filterSem}` : filterMes ? MESES[+filterMes] : "Todo el tiempo"

  const onSubmitForm = () => {
    if (!form.monto || form.monto <= 0) { alert("El monto debe ser mayor a 0"); return }
    addEntry(form, editId)
    setForm(EMPTY_FORM)
    setShowForm(false)
    setEditId(null)
  }

  const onEditEntry = (e) => {
    setForm({
      fecha: e.fecha, tipo: e.tipo, monto: e.monto, concepto: e.concepto,
      quien: e.quien || "", modalidad: e.modalidad || "Yape",
      delNegocio: e.delNegocio !== false, deContrato: e.deContrato || false,
      categoria: e.categoria || "",
    })
    setEditId(e.id)
    setShowForm(true)
  }

  const openNewForm = () => {
    setForm({ ...EMPTY_FORM, fecha: peruToday() })
    setEditId(null)
    setShowForm(!showForm)
  }

  if (!loaded) return <div className="flex items-center justify-center py-16 text-zinc-500 text-sm">Cargando...</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <DarkStatCard label="Ingresos" value={formatMoney(totalIngresos)} icon="📥" accent="#34d399" />
        <DarkStatCard label="Egresos" value={formatMoney(totalEgresos)} icon="📤" accent="#f87171" />
        <DarkStatCard label="Balance" value={formatMoney(balance)} icon={balance >= 0 ? "✅" : "⚠️"} accent={balance >= 0 ? "#34d399" : "#f87171"} />
        <DarkStatCard label="Movimientos" value={filtered.length} icon="📋" accent="#818cf8" />
      </div>

      <ReconciliationChip reconciliation={reconciliation} period={reconciliationLabel} />

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => { setSoloNegocio(!soloNegocio); if (!soloNegocio) { setSoloExterno(false) } }}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10, cursor: "pointer", border: soloNegocio ? "1px solid rgba(14,165,233,0.4)" : "1px solid #3f3f46", background: soloNegocio ? "rgba(14,165,233,0.1)" : "rgba(39,39,42,0.5)", color: soloNegocio ? "#38bdf8" : "#a1a1aa", fontSize: 13, fontWeight: 700 }}>
          <span style={{ width: 18, height: 18, borderRadius: 4, border: soloNegocio ? "2px solid #38bdf8" : "2px solid #52525b", background: soloNegocio ? "rgba(14,165,233,0.2)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#38bdf8" }}>{soloNegocio ? "✓" : ""}</span>
          🏪 Solo negocio
        </button>
        <button onClick={() => setSoloContrato(!soloContrato)}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10, cursor: "pointer", border: soloContrato ? "1px solid rgba(139,92,246,0.4)" : "1px solid #3f3f46", background: soloContrato ? "rgba(139,92,246,0.1)" : "rgba(39,39,42,0.5)", color: soloContrato ? "#a78bfa" : "#a1a1aa", fontSize: 13, fontWeight: 700 }}>
          <span style={{ width: 18, height: 18, borderRadius: 4, border: soloContrato ? "2px solid #a78bfa" : "2px solid #52525b", background: soloContrato ? "rgba(139,92,246,0.2)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#a78bfa" }}>{soloContrato ? "✓" : ""}</span>
          📋 Solo contrato
        </button>
        <button onClick={() => { setSoloExterno(!soloExterno); if (!soloExterno) { setSoloNegocio(false); setSoloContrato(false) } }}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10, cursor: "pointer", border: soloExterno ? "1px solid rgba(251,191,36,0.4)" : "1px solid #3f3f46", background: soloExterno ? "rgba(251,191,36,0.1)" : "rgba(39,39,42,0.5)", color: soloExterno ? "#fbbf24" : "#a1a1aa", fontSize: 13, fontWeight: 700 }}>
          <span style={{ width: 18, height: 18, borderRadius: 4, border: soloExterno ? "2px solid #fbbf24" : "2px solid #52525b", background: soloExterno ? "rgba(251,191,36,0.2)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#fbbf24" }}>{soloExterno ? "✓" : ""}</span>
          🌐 Solo externo
        </button>
        {soloNegocio && <span style={{ fontSize: 11, color: "#52525b" }}>Ocultando dinero externo</span>}
        {soloContrato && <span style={{ fontSize: 11, color: "#52525b" }}>Solo movimientos de contratos</span>}
        {soloExterno && <span style={{ fontSize: 11, color: "#52525b" }}>Solo dinero fuera del negocio</span>}
      </div>

      {/* Period quick filter — above Movimientos/Métricas so it applies to both */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {(() => {
          const btnsP = [
            {
              id: "sem",
              label: filterSem ? `Sem ${filterSem}${+filterSem === currentWeekNum ? " ←" : ""}` : `Sem ${currentWeekNum}`,
              active: !!filterSem,
              action: () => setQuickWeek(filterSem ? +filterSem : currentWeekNum),
            },
            {
              id: "mes",
              label: filterMes ? `${MESES_CORTO[+filterMes]}` : MESES_CORTO[currentMonthNum],
              active: !!filterMes,
              action: () => setQuickMonth(filterMes ? +filterMes : currentMonthNum),
            },
            {
              id: "todo",
              label: "Todo",
              active: !filterSem && !filterMes,
              action: setQuickAll,
            },
          ]
          return btnsP.map(b => (
            <button key={b.id} onClick={b.action}
              style={{
                padding: "8px 14px", borderRadius: 10,
                border: b.active ? "1px solid rgba(14,165,233,0.4)" : "1px solid rgba(63,63,70,0.5)",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: b.active ? "rgba(14,165,233,0.15)" : "rgba(39,39,42,0.5)",
                color: b.active ? "#38bdf8" : "#a1a1aa", transition: "all 0.15s", whiteSpace: "nowrap",
              }}>
              {b.label}
            </button>
          ))
        })()}
        {filterSem && (
          <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: 4 }}>
            <button onClick={() => +filterSem > 1 && setQuickWeek(+filterSem - 1)} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid #3f3f46", background: "#27272a", color: "#a1a1aa", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
            <button onClick={() => +filterSem < 53 && setQuickWeek(+filterSem + 1)} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid #3f3f46", background: "#27272a", color: "#a1a1aa", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
          </div>
        )}
        {filterMes && (
          <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: 4 }}>
            <button onClick={() => +filterMes > 1 && setQuickMonth(+filterMes - 1)} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid #3f3f46", background: "#27272a", color: "#a1a1aa", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
            <button onClick={() => +filterMes < 12 && setQuickMonth(+filterMes + 1)} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid #3f3f46", background: "#27272a", color: "#a1a1aa", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
          </div>
        )}
        {(filterMes || filterSem) && (
          <span style={{ fontSize: 11, color: "#52525b" }}>· {filtered.length} movimiento{filtered.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      <div style={{ display: "flex", gap: 4 }}>
        <button onClick={() => setShowMetrics(false)}
          style={{ padding: "8px 16px", borderRadius: 10, border: !showMetrics ? "1px solid rgba(14,165,233,0.4)" : "1px solid #3f3f46", background: !showMetrics ? "rgba(14,165,233,0.15)" : "rgba(39,39,42,0.5)", color: !showMetrics ? "#38bdf8" : "#a1a1aa", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>📋 Movimientos</button>
        <button onClick={() => setShowMetrics(true)}
          style={{ padding: "8px 16px", borderRadius: 10, border: showMetrics ? "1px solid rgba(139,92,246,0.4)" : "1px solid #3f3f46", background: showMetrics ? "rgba(139,92,246,0.15)" : "rgba(39,39,42,0.5)", color: showMetrics ? "#a78bfa" : "#a1a1aa", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>📊 Métricas</button>
      </div>

      {showMetrics ? (
        <MetricsView desglose={desglose} totalIngresos={totalIngresos} totalEgresos={totalEgresos} balance={balance} />
      ) : (
        <>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={openNewForm} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>+ Nuevo movimiento</button>
            <div style={{ display: "inline-flex", borderRadius: 8, background: "#09090b", padding: 2, border: "1px solid #3f3f46" }}>
              <button onClick={() => setShowAll(true)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, background: showAll ? "#0ea5e9" : "transparent", color: showAll ? "#fff" : "#71717a", transition: "all .2s" }}>Todo</button>
              <button onClick={() => setShowAll(false)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, background: !showAll ? "#0ea5e9" : "transparent", color: !showAll ? "#fff" : "#71717a", transition: "all .2s" }}>Últimos 7</button>
            </div>
          </div>

          {showForm && (
            <EntryForm form={form} setForm={setForm} editId={editId} onSubmit={onSubmitForm} onCancel={() => { setShowForm(false); setEditId(null) }} />
          )}

          <EntriesTable
            filtered={showAll ? filtered : [...filtered].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "")).slice(0, 7)}
            sortBy={sortBy} sortDir={sortDir} toggleSort={toggleSort}
            editId={editId}
            totalIngresos={totalIngresos} totalEgresos={totalEgresos} balance={balance}
            traspasoTotal={desglose.traspYaEf + desglose.traspEfYa}
            onEdit={onEditEntry} onRemove={removeEntry} onPermanentDelete={permanentDelete}
          />

          {deletedEntries.length > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setTrashOpen(true)}
                style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.1)", color: "#f87171", cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                🗑️ Papelera ({deletedEntries.length})
              </button>
            </div>
          )}

          {trashOpen && (
            <CajaTrashModal
              eliminados={deletedEntries}
              onRestore={restoreEntry}
              onPermanentDelete={permanentDelete}
              onClose={() => setTrashOpen(false)}
            />
          )}
        </>
      )}

      <div style={{ textAlign: "center" }}>
        <button
          onClick={() => {
            if (window.confirm("¿Resetear Caja a los datos originales?\n\nSe borrarán TODOS los movimientos (incluidos los que agregaste) y se cargarán los 14 seed iniciales.")) {
              handleReset()
            }
          }}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#3f3f46", textDecoration: "underline" }}
        >
          Resetear datos originales
        </button>
      </div>
    </div>
  )
}
