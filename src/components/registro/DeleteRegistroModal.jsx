import { memo } from "react"
import { C } from "../../lib/colors"

// Modal de confirmación de borrado de registro.
// Si el registro tiene ficha vinculada (linked != null), ofrece dos
// caminos: borrar solo el registro, o registro + ficha completa.
// Si no, confirmación simple.
export default memo(function DeleteRegistroModal({
  delConfirm, setDelConfirm, onHardDeleteReg, onDeleteClient,
}) {
  if (!delConfirm) return null
  const { regId, linked } = delConfirm
  const cts = linked ? (linked.contratos || []) : []
  const totalArch = cts.reduce((s, ct) => s + (ct.contrato_archivos || []).length, 0)
  const totalAdel = cts.reduce((s, ct) => s + (ct.adelantos || []).length, 0)

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.65)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={()=>setDelConfirm(null)}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.card, borderRadius:14, border:`1px solid ${C.red}44`, padding:24, maxWidth:400, width:"100%" }}>
        <h3 style={{ margin:"0 0 8px", fontSize:17, fontWeight:700, color:C.red }}>Eliminar registro</h3>
        {linked ? <>
          <p style={{ margin:"0 0 12px", fontSize:13, color:C.muted }}>Este registro tiene una ficha vinculada:</p>
          <div style={{ background:C.cardAlt, borderRadius:10, padding:14, marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:6 }}>{linked.nombre||"Sin nombre"} <span style={{ fontSize:11, color:C.cyan, fontFamily:"monospace" }}>{linked.code}</span></div>
            {cts.length > 0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}><span style={{ color:C.muted }}>Contratos</span><span style={{ color:C.yellow, fontWeight:600 }}>{cts.length}</span></div>}
            {totalAdel > 0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}><span style={{ color:C.muted }}>Adelantos</span><span style={{ color:C.yellow, fontWeight:600 }}>{totalAdel}</span></div>}
            {totalArch > 0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:12 }}><span style={{ color:C.muted }}>Archivos</span><span style={{ color:C.yellow, fontWeight:600 }}>{totalArch}</span></div>}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <button onClick={()=>{setDelConfirm(null);onHardDeleteReg(regId)}} style={{ padding:10, borderRadius:10, border:`1px solid ${C.border}`, background:C.cardAlt, color:C.text, cursor:"pointer", fontSize:13, fontWeight:600, textAlign:"left" }}>Solo borrar el registro <span style={{ fontSize:11, color:C.muted, display:"block" }}>La ficha y sus datos se mantienen</span></button>
            <button onClick={()=>{setDelConfirm(null);onHardDeleteReg(regId);onDeleteClient(linked.id)}} style={{ padding:10, borderRadius:10, border:`1px solid ${C.red}44`, background:C.red+"15", color:C.red, cursor:"pointer", fontSize:13, fontWeight:700, textAlign:"left" }}>Borrar registro + ficha <span style={{ fontSize:11, color:C.red+"aa", display:"block" }}>Se eliminan contratos, adelantos y archivos</span></button>
            <button onClick={()=>setDelConfirm(null)} style={{ padding:8, background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:12, textAlign:"center" }}>Cancelar</button>
          </div>
        </> : <>
          <p style={{ margin:"0 0 16px", fontSize:13, color:C.muted }}>Este registro no tiene ficha vinculada. Se eliminara permanentemente.</p>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={()=>setDelConfirm(null)} style={{ flex:1, padding:10, borderRadius:10, background:"transparent", border:`1px solid ${C.border}`, color:C.muted, cursor:"pointer", fontSize:13, fontWeight:600 }}>Cancelar</button>
            <button onClick={()=>{setDelConfirm(null);onHardDeleteReg(regId)}} style={{ flex:1, padding:10, borderRadius:10, background:C.danger, border:"none", color:"#fff", cursor:"pointer", fontSize:13, fontWeight:700 }}>Eliminar</button>
          </div>
        </>}
      </div>
    </div>
  )
})
