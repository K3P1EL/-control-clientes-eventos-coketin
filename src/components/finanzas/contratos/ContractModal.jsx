import { useState, useEffect, useRef, useMemo } from "react"
import { cDark } from "../ui/darkStyles"
import DarkMoneyInput from "../ui/DarkMoneyInput"
import { PERSONAS, MODALS } from "../../../lib/finanzas/constants"
import { peruNow, peruToday, getWeekNumberISO, formatMoney, calcContract, normalizeContract } from "../../../lib/finanzas/helpers"
import { getJSON, setJSON } from "../../../lib/storage"
import { STORAGE_KEYS } from "../../../lib/finanzas/constants"
import { saveCaja } from "../../../services/finanzas"

// Factory functions — evaluate peruToday() fresh each call so long-running sessions get today's date
const emptyAdel = () => ({ monto: 0, modalidad: "Efectivo", recibio: "Yo", fecha: peruToday(), enCaja: true, noTrack: false })
const emptyCobro = () => ({ monto: 0, modalidad: "Efectivo", recibio: "Yo", fecha: "", enCaja: false, noTrack: false })

function defaultForm(nextId) {
  const now = peruNow()
  return {
    id: nextId, cliente: "", total: 0,
    adelantos: [emptyAdel()],
    cobros: [emptyCobro()],
    descuento: 0, notas: "", depend: false,
    semana: getWeekNumberISO(now), mes: now.getMonth() + 1, anio: now.getFullYear(), eliminado: false,
  }
}

// Quick-add to Caja directly from contract modal (writes to localStorage + Supabase)
function quickAddToCaja(cajaEntry) {
  const current = getJSON(STORAGE_KEYS.CAJA) || []
  const nextNum = current.length > 0 ? Math.max(...current.map(e => e.num || 0)) + 1 : 1
  const entry = { ...cajaEntry, id: Date.now(), num: nextNum, concepto: cajaEntry.concepto || "Sin concepto" }
  const updated = [entry, ...current]
  setJSON(STORAGE_KEYS.CAJA, updated)
  saveCaja(updated).catch(() => {})
  return entry
}

// Reusable payment row (adelanto or cobro)
function PaymentRow({ entry, onChange, onRemove, canRemove, color, fs, groupStyle, cajaLabel }) {
  const upd = (k, v) => onChange({ ...entry, [k]: v })
  const [cajaOpen, setCajaOpen] = useState(false)
  const [cajaSaved, setCajaSaved] = useState(false)
  const [cajaForm, setCajaForm] = useState(null)
  if (entry.noTrack) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
        <span style={{ fontSize: 11, color: "#71717a", fontStyle: "italic" }}>No trackeado</span>
        <button onClick={() => upd("noTrack", false)} style={{ fontSize: 10, color, cursor: "pointer", background: "none", border: `1px solid ${color}44`, borderRadius: 6, padding: "2px 8px" }}>Trackear</button>
        {canRemove && <button onClick={onRemove} style={{ fontSize: 14, color: "#52525b", cursor: "pointer", background: "none", border: "none", marginLeft: "auto" }}>×</button>}
      </div>
    )
  }
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
        <div style={groupStyle}><label style={cDark.label}>Monto</label><DarkMoneyInput style={fs} value={entry.monto} onChange={v => upd("monto", v)} /></div>
        <div style={groupStyle}><label style={cDark.label}>Modalidad</label><select style={{ ...fs, opacity: entry.recibio ? 1 : 0.4 }} value={entry.modalidad} onChange={e => upd("modalidad", e.target.value)} disabled={!entry.recibio}><option value="">—</option>{MODALS.map(m => <option key={m}>{m}</option>)}</select></div>
        <div style={groupStyle}><label style={cDark.label}>Recibió</label><select style={fs} value={entry.recibio} onChange={e => { const v = e.target.value; onChange({ ...entry, recibio: v, ...(!v ? { modalidad: "" } : {}) }) }}>{PERSONAS.map(p => <option key={p||"__none__"} value={p}>{p || "— Nadie"}</option>)}</select></div>
        <div style={groupStyle}><label style={cDark.label}>Fecha</label><input style={fs} type="date" value={entry.fecha} onChange={e => upd("fecha", e.target.value)} /></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#a1a1aa", cursor: "pointer" }}>
          <input type="checkbox" checked={entry.enCaja} onChange={e => upd("enCaja", e.target.checked)} /> ¿En caja?
        </label>
        {entry.enCaja && entry.monto > 0 && cajaLabel && !cajaSaved && (
          <button type="button" onClick={() => { setCajaForm({ fecha: entry.fecha || peruToday(), tipo: "ingreso", monto: entry.monto, concepto: cajaLabel, quien: entry.recibio === "Yo" ? "" : (entry.recibio || ""), modalidad: entry.modalidad || "Efectivo", delNegocio: true, deContrato: true, gastoAjeno: false, categoria: "" }); setCajaOpen(!cajaOpen) }}
            style={{ padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(14,165,233,0.3)", background: "rgba(14,165,233,0.1)", color: "#38bdf8", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>
            📥 Caja
          </button>
        )}
        {cajaSaved && <span style={{ fontSize: 10, color: "#34d399", fontWeight: 700 }}>✅ Registrado en Caja</span>}
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#52525b", cursor: "pointer" }}>
          <input type="checkbox" checked={false} onChange={() => upd("noTrack", true)} /> No trackear
        </label>
        {canRemove && <button onClick={onRemove} style={{ fontSize: 14, color: "#52525b", cursor: "pointer", background: "none", border: "none", marginLeft: "auto" }} title="Quitar">×</button>}
      </div>
      {cajaOpen && cajaForm && (
        <div style={{ marginTop: 6, padding: "10px 12px", background: "rgba(14,165,233,0.06)", borderRadius: 8, border: "1px solid rgba(14,165,233,0.2)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#38bdf8", marginBottom: 8 }}>📥 Registrar en Caja</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr", gap: 6 }}>
            <div><label style={{ fontSize: 9, color: "#71717a" }}>Monto</label><input style={{ ...fs, fontSize: 12 }} type="text" value={cajaForm.monto} onChange={e => setCajaForm(p => ({ ...p, monto: parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0 }))} /></div>
            <div><label style={{ fontSize: 9, color: "#71717a" }}>Modalidad</label><select style={{ ...fs, fontSize: 12 }} value={cajaForm.modalidad} onChange={e => setCajaForm(p => ({ ...p, modalidad: e.target.value }))}><option>Efectivo</option><option>Yape</option></select></div>
            <div><label style={{ fontSize: 9, color: "#71717a" }}>Quién</label><input style={{ ...fs, fontSize: 12 }} value={cajaForm.quien} onChange={e => setCajaForm(p => ({ ...p, quien: e.target.value }))} placeholder="Nombre" /></div>
            <div><label style={{ fontSize: 9, color: "#71717a" }}>Concepto</label><input style={{ ...fs, fontSize: 12 }} value={cajaForm.concepto} onChange={e => setCajaForm(p => ({ ...p, concepto: e.target.value }))} /></div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => setCajaOpen(false)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #3f3f46", background: "transparent", color: "#71717a", cursor: "pointer", fontSize: 10 }}>Cancelar</button>
            <button type="button" onClick={() => { quickAddToCaja(cajaForm); setCajaSaved(true); setCajaOpen(false) }}
              style={{ padding: "4px 12px", borderRadius: 6, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>
              Guardar en Caja
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Modal to create or edit a contract. `contract` is null/undefined for new.
export default function ContractModal({ contract, onSave, onClose, nextId, prodTags = [] }) {
  const isNew = !contract
  const normalized = contract ? normalizeContract(contract) : null
  const [form, setForm] = useState(normalized || defaultForm(nextId))
  const [showServicios, setShowServicios] = useState(false)
  const [cancelDialog, setCancelDialog] = useState(null) // null | "choose" | "parcial"
  const [parcialInput, setParcialInput] = useState("")
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const calc = calcContract(form)
  const productos = form.productos || []
  const toggleProducto = (p) => setForm(prev => {
    const curr = prev.productos || []
    return { ...prev, productos: curr.includes(p) ? curr.filter(x => x !== p) : [...curr, p] }
  })

  // Array helpers
  const setAdelanto = (idx, entry) => setForm(p => ({ ...p, adelantos: p.adelantos.map((a, i) => i === idx ? entry : a) }))
  const addAdelanto = () => setForm(p => ({ ...p, adelantos: [...p.adelantos, emptyAdel()] }))
  const removeAdelanto = (idx) => setForm(p => ({ ...p, adelantos: p.adelantos.filter((_, i) => i !== idx) }))

  const setCobro = (idx, entry) => setForm(p => ({ ...p, cobros: p.cobros.map((a, i) => i === idx ? entry : a) }))
  const addCobro = () => setForm(p => ({ ...p, cobros: [...p.cobros, emptyCobro()] }))
  const removeCobro = (idx) => setForm(p => ({ ...p, cobros: p.cobros.filter((_, i) => i !== idx) }))

  const initial = useMemo(() => JSON.stringify(normalized || defaultForm(nextId)), [normalized, nextId])
  const isDirty = JSON.stringify(form) !== initial
  const dirtyRef = useRef(isDirty)
  dirtyRef.current = isDirty
  const safeClose = () => {
    if (dirtyRef.current && !window.confirm("¿Descartar cambios sin guardar?")) return
    onClose()
  }

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") safeClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const fs = cDark.input
  const groupStyle = { display: "flex", flexDirection: "column", gap: 2 }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={safeClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#18181b", borderRadius: 18, width: "100%", maxWidth: 640, maxHeight: "90vh", overflow: "auto", boxShadow: "0 25px 50px rgba(0,0,0,0.5)", border: "1px solid #3f3f46" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #3f3f46", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#18181b", borderRadius: "18px 18px 0 0", zIndex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#e4e4e7" }}>{isNew ? "Nuevo Contrato" : `Editar ${form.id}`}</h2>
          <button onClick={safeClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#71717a", padding: "4px 8px" }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={groupStyle}><label style={cDark.label}>Código</label><input style={{ ...fs, background: isNew ? "#27272a" : "#1f1f23" }} value={form.id} onChange={e => isNew && set("id", e.target.value)} readOnly={!isNew} /></div>
            <div style={groupStyle}><label style={cDark.label}>Cliente</label><input style={fs} value={form.cliente} onChange={e => set("cliente", e.target.value)} placeholder="Nombre..." /></div>
            <div style={groupStyle}><label style={cDark.label}>Total Contrato</label><DarkMoneyInput style={fs} value={form.total} onChange={v => set("total", v)} /></div>
          </div>

          {/* ADELANTOS */}
          <div style={{ background: "rgba(16,185,129,0.05)", borderRadius: 12, padding: 14, border: "1px solid rgba(16,185,129,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#34d399" }}>💵 ADELANTO{form.adelantos.length > 1 ? "S" : ""} ({form.adelantos.length})</div>
              <button onClick={addAdelanto} style={{ fontSize: 11, fontWeight: 700, color: "#34d399", cursor: "pointer", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: "3px 10px" }}>+</button>
            </div>
            {form.adelantos.map((a, i) => (
              <PaymentRow key={i} entry={a} onChange={e => setAdelanto(i, e)} onRemove={() => removeAdelanto(i)} canRemove={form.adelantos.length > 1} color="#34d399" fs={fs} groupStyle={groupStyle}
                cajaLabel={`${form.id} · Adelanto`} />
            ))}
          </div>

          {/* COBROS */}
          <div style={{ background: "rgba(56,189,248,0.05)", borderRadius: 12, padding: 14, border: "1px solid rgba(56,189,248,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#38bdf8" }}>🧾 COBRO{form.cobros.length > 1 ? "S" : ""} ({form.cobros.length})</div>
              <button onClick={addCobro} style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", cursor: "pointer", background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: 8, padding: "3px 10px" }}>+</button>
            </div>
            {form.cobros.map((a, i) => (
              <PaymentRow key={i} entry={a} onChange={e => setCobro(i, e)} onRemove={() => removeCobro(i)} canRemove={form.cobros.length > 1} color="#38bdf8" fs={fs} groupStyle={groupStyle}
                cajaLabel={`${form.id} · Cobro`} />
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr", gap: 12 }}>
            <div style={groupStyle}><label style={cDark.label}>Descuento</label><DarkMoneyInput style={fs} value={form.descuento} onChange={v => set("descuento", Math.max(0, v))} /></div>
            <div style={groupStyle}>
              <label style={cDark.label}>Gastos</label>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <DarkMoneyInput style={fs} value={form.gastos} onChange={v => set("gastos", Math.max(0, v))} />
                {form.gastos > 0 && (
                  <button type="button" onClick={() => { quickAddToCaja({ fecha: peruToday(), tipo: "egreso", monto: form.gastos, concepto: `${form.id} · Gastos`, quien: "", modalidad: "Efectivo", delNegocio: true, deContrato: true, gastoAjeno: false, categoria: "" }); alert("✅ Gasto registrado en Caja") }}
                    title="Registrar gasto en Caja" style={{ padding: "2px 6px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#f87171", cursor: "pointer", fontSize: 9, fontWeight: 700, whiteSpace: "nowrap" }}>📤</button>
                )}
              </div>
            </div>
            <div style={groupStyle}><label style={cDark.label}>Año</label><DarkMoneyInput style={fs} value={form.anio} onChange={v => set("anio", Math.min(2099, Math.max(2020, v || peruNow().getFullYear())))} /></div>
            <div style={groupStyle}><label style={cDark.label}>Semana</label><DarkMoneyInput style={fs} value={form.semana} onChange={v => set("semana", Math.min(53, Math.max(1, v || 1)))} /></div>
            <div style={groupStyle}><label style={cDark.label}>Mes</label><DarkMoneyInput style={fs} value={form.mes} onChange={v => set("mes", Math.min(12, Math.max(1, v || 1)))} /></div>
            <div style={groupStyle}>
              <label style={cDark.label}>Dependencia</label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginTop: 6, cursor: "pointer", color: "#a1a1aa" }}>
                <input type="checkbox" checked={form.depend} onChange={e => set("depend", e.target.checked)} /> Sí
              </label>
            </div>
          </div>
          {/* Servicios — colapsable, reutiliza producto_tags */}
          {prodTags.length > 0 && (
            <div style={{ background: "rgba(39,39,42,0.4)", borderRadius: 10, border: "1px solid rgba(63,63,70,0.4)", overflow: "hidden" }}>
              <button type="button" onClick={() => setShowServicios(s => !s)}
                style={{ width: "100%", padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#d4d4d8", fontSize: 12, fontWeight: 700 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  🏷️ Servicios
                  {productos.length > 0 ? (
                    <span style={{ fontSize: 11, color: "#34d399", fontWeight: 600 }}>
                      {productos.slice(0, 3).join(" + ")}{productos.length > 3 ? ` + ${productos.length - 3} más` : ""}
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, color: "#52525b", fontWeight: 500 }}>Ninguno seleccionado</span>
                  )}
                </span>
                <span style={{ color: "#71717a", fontSize: 12 }}>{showServicios ? "▲" : "▼"}</span>
              </button>
              {showServicios && (
                <div style={{ padding: "8px 14px 14px", display: "flex", flexWrap: "wrap", gap: 6, borderTop: "1px solid rgba(63,63,70,0.4)" }}>
                  {prodTags.map(p => {
                    const active = productos.includes(p)
                    return (
                      <button key={p} type="button" onClick={() => toggleProducto(p)}
                        style={{ padding: "5px 10px", borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${active ? "rgba(16,185,129,0.5)" : "rgba(63,63,70,0.6)"}`, background: active ? "rgba(16,185,129,0.15)" : "rgba(24,24,27,0.6)", color: active ? "#34d399" : "#71717a", transition: "all 0.15s" }}>
                        {active ? "✓ " : ""}{p}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div style={groupStyle}><label style={cDark.label}>Notas</label><input style={fs} value={form.notas} onChange={e => set("notas", e.target.value)} placeholder="Notas del evento..." /></div>

          {(() => {
            const totalAdel = (form.adelantos || []).reduce((s, a) => s + (a.monto || 0), 0)
            if (totalAdel > (form.total || 0) && form.total > 0) return (
              <div style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 10, padding: "8px 14px", fontSize: 11, color: "#fbbf24", fontWeight: 600 }}>
                ⚠️ Adelantos ({formatMoney(totalAdel)}) superan el total del contrato ({formatMoney(form.total)})
              </div>
            )
            return null
          })()}
          <div style={{ background: "rgba(139,92,246,0.05)", borderRadius: 12, padding: 14, border: "1px solid rgba(139,92,246,0.2)", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
            {(form.descuento > 0) && <div><div style={{ fontSize: 10, color: "#fbbf24", fontWeight: 600 }}>PRECIO FINAL</div><div style={{ fontSize: 16, fontWeight: 800, color: "#fbbf24" }}>{formatMoney(calc.precioFinal)}</div></div>}
            <div><div style={{ fontSize: 10, color: "#a78bfa", fontWeight: 600 }}>POR COBRAR</div><div style={{ fontSize: 16, fontWeight: 800, color: "#e4e4e7" }}>{formatMoney(calc.porCobrar)}</div></div>
            <div><div style={{ fontSize: 10, color: "#a78bfa", fontWeight: 600 }}>GANANCIA</div><div style={{ fontSize: 16, fontWeight: 800, color: "#e4e4e7" }}>{formatMoney(calc.ganancia)}</div></div>
            <div><div style={{ fontSize: 10, color: "#a78bfa", fontWeight: 600 }}>EN CAJA</div><div style={{ fontSize: 16, fontWeight: 800, color: "#e4e4e7" }}>{formatMoney(calc.enCaja)}</div></div>
            <div><div style={{ fontSize: 10, color: calc.pendiente > 0 ? "#f87171" : "#34d399", fontWeight: 600 }}>PENDIENTE</div><div style={{ fontSize: 16, fontWeight: 800, color: calc.pendiente > 0 ? "#f87171" : "#34d399" }}>{formatMoney(calc.pendiente)}</div></div>
          </div>
          {calc.exceso > 0 && (
            <div style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 10, padding: "8px 14px", fontSize: 11, color: "#fbbf24", fontWeight: 600 }}>
              ⚠️ Se cobró {formatMoney(calc.exceso)} de más — ganancia real: {formatMoney(calc.ganancia)}
            </div>
          )}

          {/* Cancelación del contrato */}
          {form.cancelado ? (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#f87171" }}>❌ CONTRATO CANCELADO</div>
                <div style={{ fontSize: 10, color: "#a1a1aa", marginTop: 2 }}>
                  {form.cancelInfo?.tipo === "retenido" && `Te quedaste con S/${form.cancelInfo.montoRetenido} (penalidad)`}
                  {form.cancelInfo?.tipo === "devuelto_todo" && "Devolviste todo al cliente"}
                  {form.cancelInfo?.tipo === "devuelto_parcial" && `Devolviste S/${form.cancelInfo.montoDevuelto}, retuviste S/${form.cancelInfo.montoRetenido}`}
                  {" · Caja se maneja manualmente"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {form.cancelInfo?.montoDevuelto > 0 && (
                  <button type="button" onClick={() => { quickAddToCaja({ fecha: form.cancelInfo.fecha || peruToday(), tipo: "egreso", monto: form.cancelInfo.montoDevuelto, concepto: `${form.id} · Devolución cancelación`, quien: "", modalidad: "Efectivo", delNegocio: true, deContrato: true, gastoAjeno: false, categoria: "" }); alert("✅ Devolución registrada en Caja") }}
                    style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.1)", color: "#f87171", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                    📤 Registrar devolución S/{form.cancelInfo.montoDevuelto} en Caja
                  </button>
                )}
                <button type="button" onClick={() => set("cancelado", false) || set("cancelInfo", null)}
                  style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(16,185,129,0.4)", background: "rgba(16,185,129,0.1)", color: "#34d399", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                  ↩ Reactivar
                </button>
              </div>
            </div>
          ) : !isNew && (
            <button type="button" onClick={() => { setParcialInput(""); setCancelDialog("choose") }}
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)", color: "#f87171", cursor: "pointer", fontSize: 11, fontWeight: 600, alignSelf: "flex-start" }}>
              ❌ Cancelar contrato (cliente se arrepintió)
            </button>
          )}
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid #3f3f46", display: "flex", gap: 10, justifyContent: "flex-end", position: "sticky", bottom: 0, background: "#18181b", borderRadius: "0 0 18px 18px" }}>
          <button onClick={safeClose} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #3f3f46", background: "#27272a", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#a1a1aa" }}>Cancelar</button>
          <button onClick={() => {
              // Clean phantom entries: remove 0-monto non-noTrack entries if there are others
              const cleanAdel = form.adelantos.filter(a => a.noTrack || a.monto > 0)
              const cleanCobros = form.cobros.filter(a => a.noTrack || a.monto > 0)
              onSave({ ...form, adelantos: cleanAdel.length ? cleanAdel : form.adelantos, cobros: cleanCobros.length ? cleanCobros : form.cobros })
              onClose()
            }} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, boxShadow: "0 2px 8px rgba(14,165,233,0.3)" }}>
            {isNew ? "Crear Contrato" : "Guardar Cambios"}
          </button>
        </div>

        {/* Diálogo de cancelación */}
        {cancelDialog && (() => {
          const totalPagado = (form.adelantos || []).reduce((s, a) => s + (a.monto || 0), 0) + (form.cobros || []).reduce((s, a) => s + (a.monto || 0), 0)
          const applyCancel = (info) => {
            setForm(p => ({ ...p, cancelado: true, cancelInfo: info }))
            setCancelDialog(null)
          }
          return (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setCancelDialog(null)}>
              <div onClick={e => e.stopPropagation()}
                style={{ background: "#18181b", borderRadius: 14, border: "1px solid rgba(239,68,68,0.4)", padding: 24, maxWidth: 440, width: "100%", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#f87171", marginBottom: 4 }}>❌ Cancelar contrato N {form.id}</div>
                <div style={{ fontSize: 12, color: "#a1a1aa", marginBottom: 18 }}>El cliente pagó hasta ahora: <strong style={{ color: "#34d399" }}>S/ {totalPagado}</strong></div>

                {cancelDialog === "choose" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 12, color: "#d4d4d8", marginBottom: 4 }}>¿Qué pasa con esa plata?</div>
                    <button type="button" onClick={() => applyCancel({ tipo: "retenido", montoRetenido: totalPagado, montoDevuelto: 0, fecha: new Date().toISOString().slice(0, 10) })}
                      style={{ padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.08)", color: "#34d399", cursor: "pointer", fontSize: 13, fontWeight: 700, textAlign: "left" }}>
                      💰 Me quedo con todo <span style={{ fontSize: 11, color: "#71717a", fontWeight: 500 }}>(penalidad · ganancia S/{totalPagado})</span>
                    </button>
                    <button type="button" onClick={() => applyCancel({ tipo: "devuelto_todo", montoRetenido: 0, montoDevuelto: totalPagado, fecha: new Date().toISOString().slice(0, 10) })}
                      style={{ padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171", cursor: "pointer", fontSize: 13, fontWeight: 700, textAlign: "left" }}>
                      ↩ Devuelvo todo <span style={{ fontSize: 11, color: "#71717a", fontWeight: 500 }}>(registra egreso en Caja)</span>
                    </button>
                    <button type="button" onClick={() => setCancelDialog("parcial")}
                      style={{ padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.08)", color: "#fbbf24", cursor: "pointer", fontSize: 13, fontWeight: 700, textAlign: "left" }}>
                      ⚖️ Devuelvo parcial <span style={{ fontSize: 11, color: "#71717a", fontWeight: 500 }}>(te pregunto cuánto)</span>
                    </button>
                  </div>
                )}

                {cancelDialog === "parcial" && (
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#a1a1aa", marginBottom: 6 }}>¿Cuánto le devolviste al cliente? (máx S/{totalPagado})</label>
                    <input type="text" inputMode="decimal" value={parcialInput} autoFocus
                      onChange={e => setParcialInput(e.target.value.replace(/[^0-9.]/g, ""))}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          const dev = Math.max(0, Math.min(totalPagado, parseFloat(parcialInput) || 0))
                          applyCancel({ tipo: "devuelto_parcial", montoRetenido: totalPagado - dev, montoDevuelto: dev, fecha: new Date().toISOString().slice(0, 10) })
                        }
                      }}
                      placeholder="0"
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #3f3f46", background: "#27272a", color: "#e4e4e7", fontSize: 14, fontWeight: 700, outline: "none", marginBottom: 14 }} />
                    {parcialInput && (
                      <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 14, background: "rgba(39,39,42,0.6)", padding: "8px 12px", borderRadius: 8 }}>
                        Devolverás <strong style={{ color: "#f87171" }}>S/{Math.min(totalPagado, parseFloat(parcialInput) || 0)}</strong> · Te quedas con <strong style={{ color: "#34d399" }}>S/{totalPagado - Math.min(totalPagado, parseFloat(parcialInput) || 0)}</strong>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button type="button" onClick={() => setCancelDialog("choose")}
                        style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #3f3f46", background: "transparent", color: "#a1a1aa", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>← Atrás</button>
                      <button type="button" onClick={() => {
                        const dev = Math.max(0, Math.min(totalPagado, parseFloat(parcialInput) || 0))
                        applyCancel({ tipo: "devuelto_parcial", montoRetenido: totalPagado - dev, montoDevuelto: dev, fecha: new Date().toISOString().slice(0, 10) })
                      }}
                        style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Confirmar</button>
                    </div>
                  </div>
                )}

                <button type="button" onClick={() => setCancelDialog(null)}
                  style={{ marginTop: 12, width: "100%", padding: "8px", borderRadius: 8, border: "none", background: "transparent", color: "#71717a", cursor: "pointer", fontSize: 11 }}>
                  Cerrar sin cancelar
                </button>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
