import { useState, useEffect, useRef, useMemo } from "react"
import { cDark } from "../ui/darkStyles"
import DarkMoneyInput from "../ui/DarkMoneyInput"
import { PERSONAS, MODALS } from "../../../lib/finanzas/constants"
import { peruNow, peruToday, getWeekNumberISO, formatMoney, calcContract } from "../../../lib/finanzas/helpers"

// Modal to create or edit a contract. `contract` is null/undefined for new.
export default function ContractModal({ contract, onSave, onClose, nextId }) {
  const isNew = !contract
  const [form, setForm] = useState(contract || {
    id: nextId, cliente: "", total: 0, adelanto: 0, modalAdel: "Efectivo", recibioAdel: "Yo",
    fechaAdel: peruToday(), enCajaAdel: true, cobro: 0, modalCobro: "Efectivo",
    recibioCobro: "Yo", fechaCobro: "", enCajaCobro: false, descuento: 0, notas: "", depend: false,
    semana: getWeekNumberISO(peruNow()), mes: peruNow().getMonth() + 1, anio: peruNow().getFullYear(), eliminado: false,
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const calc = calcContract(form)

  // Check if the form has been modified before closing — prevent
  // accidental data loss on ESC / click-outside / X button.
  const initial = useMemo(() => JSON.stringify(contract || { id: nextId, cliente: "", total: 0, adelanto: 0, modalAdel: "Efectivo", recibioAdel: "Yo", fechaAdel: peruToday(), enCajaAdel: true, cobro: 0, modalCobro: "Efectivo", recibioCobro: "Yo", fechaCobro: "", enCajaCobro: false, descuento: 0, notas: "", depend: false, semana: getWeekNumberISO(peruNow()), mes: peruNow().getMonth() + 1, anio: peruNow().getFullYear(), eliminado: false }), [contract, nextId])
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

          <div style={{ background: form.noTrackAdel ? "#1f1f23" : "rgba(16,185,129,0.05)", borderRadius: 12, padding: 14, border: `1px solid ${form.noTrackAdel ? "#3f3f46" : "rgba(16,185,129,0.2)"}`, opacity: form.noTrackAdel ? 0.7 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: form.noTrackAdel ? "#71717a" : "#34d399" }}>💵 ADELANTO</div>
              <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#71717a", cursor: "pointer", fontWeight: 600 }}>
                <input type="checkbox" checked={form.noTrackAdel || false} onChange={e => { set("noTrackAdel", e.target.checked); if (e.target.checked) { set("adelanto", 0); set("modalAdel", ""); set("recibioAdel", ""); set("fechaAdel", ""); set("enCajaAdel", false) } }} />
                No trackeado
              </label>
            </div>
            {!form.noTrackAdel && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                  <div style={groupStyle}><label style={cDark.label}>Monto</label><DarkMoneyInput style={fs} value={form.adelanto} onChange={v => set("adelanto", v)} /></div>
                  <div style={groupStyle}><label style={cDark.label}>Modalidad</label><select style={fs} value={form.modalAdel} onChange={e => set("modalAdel", e.target.value)}>{MODALS.map(m => <option key={m}>{m}</option>)}</select></div>
                  <div style={groupStyle}><label style={cDark.label}>Recibió</label><select style={fs} value={form.recibioAdel} onChange={e => set("recibioAdel", e.target.value)}>{PERSONAS.map(p => <option key={p||"__none__"} value={p}>{p || "— Nadie"}</option>)}</select></div>
                  <div style={groupStyle}><label style={cDark.label}>Fecha</label><input style={fs} type="date" value={form.fechaAdel} onChange={e => set("fechaAdel", e.target.value)} /></div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 12, color: "#a1a1aa", cursor: "pointer" }}>
                  <input type="checkbox" checked={form.enCajaAdel} onChange={e => set("enCajaAdel", e.target.checked)} /> ¿En caja?
                </label>
              </>
            )}
          </div>

          <div style={{ background: form.noTrackCobro ? "#1f1f23" : "rgba(56,189,248,0.05)", borderRadius: 12, padding: 14, border: `1px solid ${form.noTrackCobro ? "#3f3f46" : "rgba(56,189,248,0.2)"}`, opacity: form.noTrackCobro ? 0.7 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: form.noTrackCobro ? "#71717a" : "#38bdf8" }}>🧾 COBRO</div>
              <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#71717a", cursor: "pointer", fontWeight: 600 }}>
                <input type="checkbox" checked={form.noTrackCobro || false} onChange={e => { set("noTrackCobro", e.target.checked); if (e.target.checked) { set("cobro", 0); set("modalCobro", ""); set("recibioCobro", ""); set("fechaCobro", ""); set("enCajaCobro", false) } }} />
                No trackeado
              </label>
            </div>
            {!form.noTrackCobro && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                  <div style={groupStyle}><label style={cDark.label}>Monto</label><DarkMoneyInput style={fs} value={form.cobro} onChange={v => set("cobro", v)} /></div>
                  <div style={groupStyle}><label style={cDark.label}>Modalidad</label><select style={fs} value={form.modalCobro} onChange={e => set("modalCobro", e.target.value)}>{MODALS.map(m => <option key={m}>{m}</option>)}</select></div>
                  <div style={groupStyle}><label style={cDark.label}>Recibió</label><select style={fs} value={form.recibioCobro} onChange={e => set("recibioCobro", e.target.value)}>{PERSONAS.map(p => <option key={p||"__none__"} value={p}>{p || "— Nadie"}</option>)}</select></div>
                  <div style={groupStyle}><label style={cDark.label}>Fecha</label><input style={fs} type="date" value={form.fechaCobro} onChange={e => set("fechaCobro", e.target.value)} /></div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 12, color: "#a1a1aa", cursor: "pointer" }}>
                  <input type="checkbox" checked={form.enCajaCobro} onChange={e => set("enCajaCobro", e.target.checked)} /> ¿En caja?
                </label>
              </>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 12 }}>
            <div style={groupStyle}><label style={cDark.label}>Descuento</label><DarkMoneyInput style={fs} value={form.descuento} onChange={v => set("descuento", Math.max(0, v))} /></div>
            <div style={groupStyle}><label style={cDark.label}>Año</label><DarkMoneyInput style={fs} value={form.anio} onChange={v => set("anio", Math.min(2099, Math.max(2020, v || 2026)))} /></div>
            <div style={groupStyle}><label style={cDark.label}>Semana</label><DarkMoneyInput style={fs} value={form.semana} onChange={v => set("semana", Math.min(53, Math.max(1, v || 1)))} /></div>
            <div style={groupStyle}><label style={cDark.label}>Mes</label><DarkMoneyInput style={fs} value={form.mes} onChange={v => set("mes", Math.min(12, Math.max(1, v || 1)))} /></div>
            <div style={groupStyle}>
              <label style={cDark.label}>Dependencia</label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginTop: 6, cursor: "pointer", color: "#a1a1aa" }}>
                <input type="checkbox" checked={form.depend} onChange={e => set("depend", e.target.checked)} /> Sí
              </label>
            </div>
          </div>
          <div style={groupStyle}><label style={cDark.label}>Notas</label><input style={fs} value={form.notas} onChange={e => set("notas", e.target.value)} placeholder="Notas del evento..." /></div>

          <div style={{ background: "rgba(139,92,246,0.05)", borderRadius: 12, padding: 14, border: "1px solid rgba(139,92,246,0.2)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
            <div><div style={{ fontSize: 10, color: "#a78bfa", fontWeight: 600 }}>POR COBRAR</div><div style={{ fontSize: 16, fontWeight: 800, color: "#e4e4e7" }}>{formatMoney(calc.porCobrar)}</div></div>
            <div><div style={{ fontSize: 10, color: "#a78bfa", fontWeight: 600 }}>GANANCIA</div><div style={{ fontSize: 16, fontWeight: 800, color: "#e4e4e7" }}>{formatMoney(calc.ganancia)}</div></div>
            <div><div style={{ fontSize: 10, color: "#a78bfa", fontWeight: 600 }}>EN CAJA</div><div style={{ fontSize: 16, fontWeight: 800, color: "#e4e4e7" }}>{formatMoney(calc.enCaja)}</div></div>
            <div><div style={{ fontSize: 10, color: calc.pendiente > 0 ? "#f87171" : "#34d399", fontWeight: 600 }}>PENDIENTE</div><div style={{ fontSize: 16, fontWeight: 800, color: calc.pendiente > 0 ? "#f87171" : "#34d399" }}>{formatMoney(calc.pendiente)}</div></div>
          </div>
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid #3f3f46", display: "flex", gap: 10, justifyContent: "flex-end", position: "sticky", bottom: 0, background: "#18181b", borderRadius: "0 0 18px 18px" }}>
          <button onClick={safeClose} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #3f3f46", background: "#27272a", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#a1a1aa" }}>Cancelar</button>
          <button onClick={() => { onSave(form); onClose() }} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, boxShadow: "0 2px 8px rgba(14,165,233,0.3)" }}>
            {isNew ? "Crear Contrato" : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </div>
  )
}
