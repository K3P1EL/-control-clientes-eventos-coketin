import { useState, useMemo } from "react"
import DarkStatCard from "../ui/DarkStatCard"
import { formatMoney, peruToday, getWeekNumberISO } from "../../../lib/finanzas/helpers"
import { useCajaEntries } from "./hooks/useCajaEntries"
import { useCajaDesglose } from "./hooks/useCajaDesglose"
import EntryForm from "./EntryForm"
import EntriesTable from "./EntriesTable"
import MetricsView from "./MetricsView"

const EMPTY_FORM = { fecha: "", tipo: "ingreso", monto: 0, concepto: "", quien: "", modalidad: "Yape", delNegocio: true, deContrato: false, categoria: "" }

export default function CajaModule() {
  const { loaded, entries, activeEntries, deletedEntries, addEntry, removeEntry, restoreEntry, permanentDelete, mesesDisponibles, semanasDisponibles } = useCajaEntries()

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filterMes, setFilterMes] = useState("")
  const [filterSem, setFilterSem] = useState("")
  const [sortBy, setSortBy] = useState("num")
  const [sortDir, setSortDir] = useState("desc")
  const [showMetrics, setShowMetrics] = useState(false)
  const [soloNegocio, setSoloNegocio] = useState(false)
  const [soloContrato, setSoloContrato] = useState(false)

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortBy(field); setSortDir("desc") }
  }

  const filtered = useMemo(() => {
    let list = [...activeEntries]
    if (filterMes) list = list.filter(e => e.fecha && e.fecha.slice(0, 7) === filterMes)
    if (filterSem) list = list.filter(e => { if (!e.fecha) return false; const d = new Date(e.fecha + "T12:00:00"); return String(getWeekNumberISO(d)) === filterSem })
    if (soloNegocio) list = list.filter(e => e.delNegocio !== false)
    if (soloContrato) list = list.filter(e => e.deContrato && e.delNegocio !== false)
    return list.sort((a, b) => {
      let cmp
      if (sortBy === "num") cmp = (a.num || 0) - (b.num || 0)
      else cmp = (a.fecha || "").localeCompare(b.fecha || "")
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [activeEntries, filterMes, filterSem, soloNegocio, soloContrato, sortBy, sortDir])

  const totalIngresos = filtered.filter(e => e.tipo === "ingreso").reduce((s, e) => s + (e.monto || 0), 0)
  const totalEgresos = filtered.filter(e => e.tipo === "egreso").reduce((s, e) => s + (e.monto || 0), 0)
  const balance = totalIngresos - totalEgresos

  const desglose = useCajaDesglose(filtered)

  const onSubmitForm = () => {
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

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => setSoloNegocio(!soloNegocio)}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10, cursor: "pointer", border: soloNegocio ? "1px solid rgba(14,165,233,0.4)" : "1px solid #3f3f46", background: soloNegocio ? "rgba(14,165,233,0.1)" : "rgba(39,39,42,0.5)", color: soloNegocio ? "#38bdf8" : "#a1a1aa", fontSize: 13, fontWeight: 700 }}>
          <span style={{ width: 18, height: 18, borderRadius: 4, border: soloNegocio ? "2px solid #38bdf8" : "2px solid #52525b", background: soloNegocio ? "rgba(14,165,233,0.2)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#38bdf8" }}>{soloNegocio ? "✓" : ""}</span>
          🏪 Solo negocio
        </button>
        {soloNegocio && <span style={{ fontSize: 11, color: "#52525b" }}>Ocultando dinero externo</span>}
        <button onClick={() => setSoloContrato(!soloContrato)}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10, cursor: "pointer", border: soloContrato ? "1px solid rgba(139,92,246,0.4)" : "1px solid #3f3f46", background: soloContrato ? "rgba(139,92,246,0.1)" : "rgba(39,39,42,0.5)", color: soloContrato ? "#a78bfa" : "#a1a1aa", fontSize: 13, fontWeight: 700 }}>
          <span style={{ width: 18, height: 18, borderRadius: 4, border: soloContrato ? "2px solid #a78bfa" : "2px solid #52525b", background: soloContrato ? "rgba(139,92,246,0.2)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#a78bfa" }}>{soloContrato ? "✓" : ""}</span>
          📋 Solo contrato
        </button>
        {soloContrato && <span style={{ fontSize: 11, color: "#52525b" }}>Solo movimientos de contratos</span>}
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
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={openNewForm} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>+ Nuevo movimiento</button>
            <select value={filterMes} onChange={e => { setFilterMes(e.target.value); setFilterSem("") }}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #3f3f46", fontSize: 12, background: "#27272a", color: "#e4e4e7", cursor: "pointer" }}>
              <option value="">Todos los meses</option>
              {mesesDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={filterSem} onChange={e => { setFilterSem(e.target.value); setFilterMes("") }}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #3f3f46", fontSize: 12, background: "#27272a", color: "#e4e4e7", cursor: "pointer" }}>
              <option value="">Todas las semanas</option>
              {semanasDisponibles.map(s => <option key={s} value={String(s)}>Sem {s}</option>)}
            </select>
            {(filterMes || filterSem) && (
              <button onClick={() => { setFilterMes(""); setFilterSem("") }} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✕ Limpiar</button>
            )}
          </div>

          {showForm && (
            <EntryForm form={form} setForm={setForm} editId={editId} onSubmit={onSubmitForm} onCancel={() => { setShowForm(false); setEditId(null) }} />
          )}

          <EntriesTable
            filtered={filtered}
            sortBy={sortBy} sortDir={sortDir} toggleSort={toggleSort}
            editId={editId}
            totalIngresos={totalIngresos} totalEgresos={totalEgresos} balance={balance}
            traspasoTotal={desglose.traspYaEf + desglose.traspEfYa}
            onEdit={onEditEntry} onRemove={removeEntry}
          />

          {deletedEntries.length > 0 && (
            <div style={{ background: "rgba(24,24,27,0.8)", borderRadius: 16, border: "1px solid rgba(63,63,70,0.6)", overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(63,63,70,0.4)", background: "rgba(239,68,68,0.03)" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#f87171" }}>Eliminados ({deletedEntries.length})</span>
              </div>
              <div style={{ padding: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {deletedEntries.map(e => (
                  <div key={e.id} style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#a1a1aa" }}>
                    <span>{e.fecha}</span>
                    <span style={{ color: e.tipo === "ingreso" ? "#34d399" : "#f87171" }}>{formatMoney(e.monto)}</span>
                    <span style={{ color: "#52525b" }}>{e.concepto}</span>
                    <button onClick={() => restoreEntry(e.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "#38bdf8", fontWeight: 600, textDecoration: "underline" }}>Restaurar</button>
                    <button onClick={() => permanentDelete(e.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "#f87171", fontWeight: 600, textDecoration: "underline" }}>Borrar</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
