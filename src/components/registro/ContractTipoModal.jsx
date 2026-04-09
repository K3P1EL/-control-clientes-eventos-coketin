import { memo } from "react"
import { C } from "../../lib/colors"

// Mini modal "Proforma o Contrato?" que aparece al subir archivos
// desde la tabla de Registro cuando NO existe ficha previa.
export default memo(function ContractTipoModal({ contractFiles, onCancel, onPick }) {
  if (!contractFiles) return null
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={onCancel}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, padding:28, textAlign:"center", maxWidth:360 }}>
        <h3 style={{ margin:"0 0 6px", fontSize:16, fontWeight:700, color:C.text }}>Tipo de documento</h3>
        <p style={{ margin:"0 0 6px", fontSize:13, color:C.muted }}>{contractFiles.files.length} archivo{contractFiles.files.length>1?"s":""} seleccionado{contractFiles.files.length>1?"s":""}</p>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"center", marginBottom:16 }}>
          {contractFiles.files.map((f,i) => (
            <span key={i} style={{ fontSize:10, color:C.accent, background:C.accent+"15", padding:"3px 8px", borderRadius:6, maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.name}</span>
          ))}
        </div>
        <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
          <button onClick={()=>onPick("proforma")} style={{ padding:"10px 24px", borderRadius:10, border:"none", cursor:"pointer", fontSize:13, fontWeight:700, background:C.yellow+"33", color:C.yellow }}>Proforma</button>
          <button onClick={()=>onPick("contrato")} style={{ padding:"10px 24px", borderRadius:10, border:"none", cursor:"pointer", fontSize:13, fontWeight:700, background:C.green+"33", color:C.green }}>Contrato</button>
        </div>
        <button onClick={onCancel} style={{ marginTop:14, background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:12 }}>Cancelar</button>
      </div>
    </div>
  )
})
