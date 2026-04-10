import { useState, useMemo } from "react"
import { MESES_CORTO } from "../../../lib/finanzas/constants"
import { peruNow, getWeekNumberISO, calcContract } from "../../../lib/finanzas/helpers"
import { useContratos } from "./hooks/useContratos"
import ContractModal from "./ContractModal"
import ConfirmModal from "./ConfirmModal"
import TrashModal from "./TrashModal"
import TablaView from "./views/TablaView"
import WeeklyView from "./views/WeeklyView"
import MonthlyView from "./views/MonthlyView"
import FullPlataView from "./views/FullPlataView"

// Owns view-mode + filter state. Hands off persistence to useContratos
// and renders the appropriate sub-view.
export default function ContratosModule() {
  const { loaded, contracts, activeContracts, nextContractId, handleSave, handleDelete, handleRestore, handlePermanentDelete, handleReset, calcSummary } = useContratos()

  const [editContract, setEditContract] = useState(undefined)
  const [deleteId, setDeleteId] = useState(null)
  const [trashOpen, setTrashOpen] = useState(false)
  const currentWeekNum = getWeekNumberISO(peruNow())
  const currentMonthNum = peruNow().getMonth() + 1
  const currentYear = peruNow().getFullYear()

  const [filterSem, setFilterSem] = useState(String(currentWeekNum))
  const [filterMes, setFilterMes] = useState("")
  const [filterEstado, setFilterEstado] = useState("")
  const [view, setView] = useState("tabla")
  const [search, setSearch] = useState("")

  const anios = useMemo(
    () => [...new Set(activeContracts.map(c => c.anio || 2026).filter(Boolean))].sort((a, b) => a - b),
    [activeContracts]
  )

  const filtered = useMemo(() => activeContracts.filter(c => {
    if (filterSem && c.semana !== +filterSem) return false
    if (filterMes && c.mes !== +filterMes) return false
    if (filterEstado) { const calc = calcContract(c); if (filterEstado !== calc.estado) return false }
    if (search) { const s = search.toLowerCase(); return (c.id + c.cliente + c.notas).toLowerCase().includes(s) }
    return true
  }), [activeContracts, filterSem, filterMes, filterEstado, search])

  const filteredSummary = useMemo(() => calcSummary(filtered), [filtered, calcSummary])
  const quickLabel = filterSem ? `Semana ${filterSem}${+filterSem === currentWeekNum ? " (actual)" : ""}` : filterMes ? `${MESES_CORTO[+filterMes]} ${currentYear}` : "Todo"

  const setQuickAll = () => { setFilterSem(""); setFilterMes(""); setFilterEstado(""); setSearch("") }
  const setQuickWeek = (w) => { setFilterMes(""); setFilterSem(String(w)) }
  const setQuickMonth = (m) => { setFilterSem(""); setFilterMes(String(m)) }

  if (!loaded) return <div className="flex items-center justify-center py-16 text-zinc-500 text-sm">Cargando...</div>

  const viewBtns = [
    { id: "t-sem", label: filterSem ? `Sem ${filterSem}${+filterSem === currentWeekNum ? " ←" : ""}` : `Sem ${currentWeekNum}`, action: () => { setQuickWeek(currentWeekNum); setView("tabla") }, active: view === "tabla" && !!filterSem },
    { id: "t-mes", label: filterMes && !filterSem ? `${MESES_CORTO[+filterMes]}` : MESES_CORTO[currentMonthNum], action: () => { setQuickMonth(currentMonthNum); setView("tabla") }, active: view === "tabla" && !!filterMes && !filterSem },
    { id: "t-todo", label: "Todo", action: () => { setQuickAll(); setView("tabla") }, active: view === "tabla" && !filterSem && !filterMes },
    { id: "sep", label: "|", action: null, active: false },
    { id: "v-semanal", label: "📅 Comparar semanas", action: () => setView("semanal"), active: view === "semanal" },
    { id: "v-mensual", label: "🗓️ Comparar meses", action: () => setView("mensual"), active: view === "mensual" },
    { id: "v-plata", label: "🔍 Mi Plata", action: () => setView("plata"), active: view === "plata" },
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {viewBtns.map(b => b.id === "sep" ? (
          <span key="sep" style={{ color: "#3f3f46", fontSize: 16, margin: "0 4px" }}>|</span>
        ) : (
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
        ))}
        {view === "tabla" && filterSem && (
          <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: 4 }}>
            <button onClick={() => +filterSem > 1 && setQuickWeek(+filterSem - 1)} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid #3f3f46", background: "#27272a", color: "#a1a1aa", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
            <button onClick={() => +filterSem < currentWeekNum && setQuickWeek(+filterSem + 1)} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid #3f3f46", background: "#27272a", color: "#a1a1aa", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
          </div>
        )}
        {view === "tabla" && filterMes && !filterSem && (
          <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: 4 }}>
            <button onClick={() => +filterMes > 1 && setQuickMonth(+filterMes - 1)} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid #3f3f46", background: "#27272a", color: "#a1a1aa", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
            <button onClick={() => +filterMes < currentMonthNum && setQuickMonth(+filterMes + 1)} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid #3f3f46", background: "#27272a", color: "#a1a1aa", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
          </div>
        )}
      </div>

      {view === "tabla" && (
        <TablaView
          filtered={filtered} filteredSummary={filteredSummary}
          filterSem={filterSem} filterMes={filterMes} currentWeekNum={currentWeekNum} quickLabel={quickLabel}
          filterEstado={filterEstado} setFilterEstado={setFilterEstado}
          search={search} setSearch={setSearch}
          setQuickAll={setQuickAll}
          onEdit={setEditContract} onDelete={setDeleteId}
          onPermanentDelete={handlePermanentDelete}
        />
      )}
      {view === "semanal" && (
        <WeeklyView activeContracts={activeContracts} anios={anios} currentWeekNum={currentWeekNum} currentMonthNum={currentMonthNum} currentYear={currentYear} calcSummary={calcSummary} />
      )}
      {view === "mensual" && (
        <MonthlyView activeContracts={activeContracts} anios={anios} currentMonthNum={currentMonthNum} currentYear={currentYear} calcSummary={calcSummary} />
      )}
      {view === "plata" && <FullPlataView activeContracts={activeContracts} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <button onClick={() => setEditContract(null)}
          style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, boxShadow: "0 2px 8px rgba(14,165,233,0.3)" }}>
          + Nuevo Contrato
        </button>
        {(() => {
          const eliminados = contracts.filter(c => c.eliminado)
          if (eliminados.length === 0) return null
          return (
            <button onClick={() => setTrashOpen(true)}
              style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.1)", color: "#f87171", cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              🗑️ Papelera ({eliminados.length})
            </button>
          )
        })()}
      </div>

      {trashOpen && (
        <TrashModal
          eliminados={contracts.filter(c => c.eliminado)}
          onRestore={handleRestore}
          onPermanentDelete={handlePermanentDelete}
          onClose={() => setTrashOpen(false)}
        />
      )}
      <div style={{ textAlign: "center" }}>
        <button onClick={handleReset} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#3f3f46", textDecoration: "underline" }}>Resetear datos originales</button>
      </div>

      {editContract !== undefined && (
        <ContractModal contract={editContract} onSave={handleSave} onClose={() => setEditContract(undefined)} nextId={nextContractId} />
      )}
      {deleteId && (
        <ConfirmModal message={`¿Seguro que quieres eliminar el contrato ${deleteId}?`} onConfirm={() => { handleDelete(deleteId); setDeleteId(null) }} onCancel={() => setDeleteId(null)} />
      )}
    </div>
  )
}
