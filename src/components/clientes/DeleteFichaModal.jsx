import { memo, useEffect } from "react"
import { C } from "../../lib/colors"

// Modal de confirmación para mover una ficha a la papelera.
// Muestra un resumen de los datos vinculados (contratos, adelantos, archivos, regs).
export default memo(function DeleteFichaModal({ c, onCancel, onConfirm }) {
  // Close on ESC — consistent with every other modal in the app.
  useEffect(() => {
    if (!c) return
    const onKey = (e) => { if (e.key === "Escape") onCancel() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [c, onCancel])

  if (!c) return null
  const cts = c.contratos || []
  const totalArchivos = cts.reduce((s, ct) => s + (ct.contrato_archivos || []).length, 0)
  const totalAdelantos = cts.reduce((s, ct) => s + (ct.adelantos || []).length, 0)
  const regCount = (c.reg_ids || []).length
  const hasData = cts.length > 0 || totalArchivos > 0 || totalAdelantos > 0 || regCount > 0

  // Calculate pending money across all contracts
  const pendienteTotal = cts.reduce((s, ct) => {
    const adelSum = (ct.adelantos || []).filter(a => !a.invalid).reduce((ss, a) => ss + (Number(a.monto) || 0), 0)
    const resto = Math.max(0, (Number(ct.total) || 0) - adelSum)
    return s + resto
  }, 0)

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.65)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onCancel}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.card, borderRadius:14, border:`1px solid ${C.red}44`, padding:24, maxWidth:420, width:"100%" }}>
        <h3 style={{ margin:"0 0 8px", fontSize:17, fontWeight:700, color:C.red }}>Eliminar ficha</h3>
        <p style={{ margin:"0 0 16px", fontSize:13, color:C.muted }}>Se movera a la papelera <strong style={{ color:C.text }}>{c.nombre||c.code||"esta ficha"}</strong> con sus datos vinculados:</p>
        {hasData ? (
          <div style={{ background:C.cardAlt, borderRadius:10, padding:14, marginBottom:16, display:"flex", flexDirection:"column", gap:8 }}>
            {cts.length > 0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
              <span style={{ color:C.text }}>Contratos</span>
              <span style={{ color:C.yellow, fontWeight:700 }}>{cts.length}</span>
            </div>}
            {totalAdelantos > 0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
              <span style={{ color:C.text }}>Adelantos/Pagos</span>
              <span style={{ color:C.yellow, fontWeight:700 }}>{totalAdelantos}</span>
            </div>}
            {totalArchivos > 0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
              <span style={{ color:C.text }}>Archivos subidos</span>
              <span style={{ color:C.yellow, fontWeight:700 }}>{totalArchivos}</span>
            </div>}
            {regCount > 0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
              <span style={{ color:C.text }}>Registros vinculados</span>
              <span style={{ color:C.muted, fontWeight:700 }}>{regCount} (no se borran)</span>
            </div>}
            {pendienteTotal > 0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, background:C.red+"15", borderRadius:6, padding:"6px 10px", marginTop:4 }}>
              <span style={{ color:C.red, fontWeight:700 }}>⚠ Pendiente de cobro</span>
              <span style={{ color:C.red, fontWeight:700 }}>S/ {pendienteTotal.toLocaleString("es-PE")}</span>
            </div>}
          </div>
        ) : (
          <div style={{ background:C.cardAlt, borderRadius:10, padding:14, marginBottom:16, fontSize:13, color:C.muted, textAlign:"center" }}>Sin datos vinculados</div>
        )}
        <div style={{ fontSize:11, color:C.muted, marginBottom:16, background:C.accent+"11", padding:"8px 12px", borderRadius:6 }}>Se movera a la Papelera. Podras restaurarlo en los proximos 10 dias.</div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onCancel} style={{ flex:1, padding:10, borderRadius:10, background:"transparent", border:`1px solid ${C.border}`, color:C.muted, cursor:"pointer", fontSize:13, fontWeight:600 }}>Cancelar</button>
          <button onClick={onConfirm} style={{ flex:1, padding:10, borderRadius:10, background:C.danger, border:"none", color:"#fff", cursor:"pointer", fontSize:13, fontWeight:700 }}>Mover a papelera</button>
        </div>
      </div>
    </div>
  )
})
