// Inline form to create or edit a cash entry. Caja styles are inline
// to match the rest of the Caja module.
const fs = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #3f3f46", fontSize: 13, background: "#27272a", color: "#e4e4e7", outline: "none", boxSizing: "border-box" }

export default function EntryForm({ form, setForm, editId, onSubmit, onCancel }) {
  return (
    <div style={{ background: "rgba(24,24,27,0.8)", borderRadius: 16, border: "1px solid rgba(63,63,70,0.6)", padding: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr 1fr 1fr", gap: 12, alignItems: "end" }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#a1a1aa", marginBottom: 3, display: "block" }}>Fecha</label>
          <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} style={fs} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#a1a1aa", marginBottom: 3, display: "block" }}>Tipo</label>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setForm(p => ({ ...p, tipo: "ingreso" }))}
              style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: form.tipo === "ingreso" ? "1px solid rgba(16,185,129,0.4)" : "1px solid #3f3f46", background: form.tipo === "ingreso" ? "rgba(16,185,129,0.15)" : "#27272a", color: form.tipo === "ingreso" ? "#34d399" : "#71717a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>📥</button>
            <button onClick={() => setForm(p => ({ ...p, tipo: "egreso" }))}
              style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: form.tipo === "egreso" ? "1px solid rgba(239,68,68,0.4)" : "1px solid #3f3f46", background: form.tipo === "egreso" ? "rgba(239,68,68,0.15)" : "#27272a", color: form.tipo === "egreso" ? "#f87171" : "#71717a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>📤</button>
            <button onClick={() => setForm(p => ({ ...p, tipo: "traspaso", modalidad: "Yape>Efectivo" }))}
              style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: form.tipo === "traspaso" ? "1px solid rgba(251,191,36,0.4)" : "1px solid #3f3f46", background: form.tipo === "traspaso" ? "rgba(251,191,36,0.15)" : "#27272a", color: form.tipo === "traspaso" ? "#fbbf24" : "#71717a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🔄</button>
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#a1a1aa", marginBottom: 3, display: "block" }}>Monto (S/)</label>
          <input type="text" inputMode="numeric" value={form.monto || ""} placeholder="0"
            onChange={e => { const v = e.target.value.replace(/[^0-9.]/g, ""); setForm(p => ({ ...p, monto: parseFloat(v) || 0 })) }} style={fs} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#a1a1aa", marginBottom: 3, display: "block" }}>Concepto</label>
          <input type="text" value={form.concepto} onChange={e => setForm(p => ({ ...p, concepto: e.target.value }))} placeholder="Ej: Pago luz, Venta toldo..." style={fs} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#a1a1aa", marginBottom: 3, display: "block" }}>Quién entregó</label>
          <input type="text" value={form.quien} onChange={e => setForm(p => ({ ...p, quien: e.target.value }))} placeholder="Nombre..." style={fs} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#a1a1aa", marginBottom: 3, display: "block" }}>{form.tipo === "traspaso" ? "Dirección" : "Modalidad"}</label>
          <div style={{ display: "flex", gap: 4 }}>
            {form.tipo === "traspaso" ? (
              <>
                <button onClick={() => setForm(p => ({ ...p, modalidad: "Yape>Efectivo" }))}
                  style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: form.modalidad === "Yape>Efectivo" ? "1px solid rgba(251,191,36,0.4)" : "1px solid #3f3f46", background: form.modalidad === "Yape>Efectivo" ? "rgba(251,191,36,0.15)" : "#27272a", color: form.modalidad === "Yape>Efectivo" ? "#fbbf24" : "#71717a", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>📱→💵</button>
                <button onClick={() => setForm(p => ({ ...p, modalidad: "Efectivo>Yape" }))}
                  style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: form.modalidad === "Efectivo>Yape" ? "1px solid rgba(251,191,36,0.4)" : "1px solid #3f3f46", background: form.modalidad === "Efectivo>Yape" ? "rgba(251,191,36,0.15)" : "#27272a", color: form.modalidad === "Efectivo>Yape" ? "#fbbf24" : "#71717a", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>💵→📱</button>
              </>
            ) : (
              ["Efectivo", "Yape"].map(m => (
                <button key={m} onClick={() => setForm(p => ({ ...p, modalidad: m }))}
                  style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: form.modalidad === m ? "1px solid rgba(139,92,246,0.4)" : "1px solid #3f3f46", background: form.modalidad === m ? "rgba(139,92,246,0.15)" : "#27272a", color: form.modalidad === m ? "#a78bfa" : "#71717a", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  {m === "Efectivo" ? "💵" : "📱"} {m}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => setForm(p => ({ ...p, delNegocio: !p.delNegocio, ...(!p.delNegocio ? {} : { deContrato: false }) }))}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8, cursor: "pointer", border: form.delNegocio ? "1px solid rgba(14,165,233,0.4)" : "1px solid #3f3f46", background: form.delNegocio ? "rgba(14,165,233,0.1)" : "#27272a", color: form.delNegocio ? "#38bdf8" : "#71717a", fontSize: 12, fontWeight: 700 }}>
          <span style={{ width: 18, height: 18, borderRadius: 4, border: form.delNegocio ? "2px solid #38bdf8" : "2px solid #52525b", background: form.delNegocio ? "rgba(14,165,233,0.2)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#38bdf8" }}>{form.delNegocio ? "✓" : ""}</span>
          🏪 Del negocio
        </button>
        <span style={{ fontSize: 11, color: "#52525b" }}>{form.delNegocio ? "Ingreso/egreso del negocio" : "Dinero de otras personas"}</span>
        {form.delNegocio && (
          <button onClick={() => setForm(p => ({ ...p, deContrato: !p.deContrato }))}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8, cursor: "pointer", border: form.deContrato ? "1px solid rgba(139,92,246,0.4)" : "1px solid #3f3f46", background: form.deContrato ? "rgba(139,92,246,0.1)" : "#27272a", color: form.deContrato ? "#a78bfa" : "#71717a", fontSize: 12, fontWeight: 700 }}>
            <span style={{ width: 18, height: 18, borderRadius: 4, border: form.deContrato ? "2px solid #a78bfa" : "2px solid #52525b", background: form.deContrato ? "rgba(139,92,246,0.2)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#a78bfa" }}>{form.deContrato ? "✓" : ""}</span>
            📋 Del contrato
          </button>
        )}
        {form.delNegocio && form.tipo === "egreso" && (
          <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "#52525b", marginRight: 2 }}>Cat:</span>
            {[{ v: "sueldo", l: "💰 Sueldo" }, { v: "servicio", l: "🏢 Servicio" }, { v: "", l: "Otro" }].map(({ v, l }) => (
              <button key={v} onClick={() => setForm(p => ({ ...p, categoria: v }))}
                style={{ padding: "5px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", border: form.categoria === v ? "1px solid rgba(245,158,11,0.4)" : "1px solid #3f3f46", background: form.categoria === v ? "rgba(245,158,11,0.1)" : "#27272a", color: form.categoria === v ? "#fbbf24" : "#71717a" }}>
                {l}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={onSubmit} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
          {editId ? "Guardar cambios" : "Guardar"}
        </button>
        <button onClick={onCancel} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #3f3f46", background: "#27272a", color: "#a1a1aa", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
