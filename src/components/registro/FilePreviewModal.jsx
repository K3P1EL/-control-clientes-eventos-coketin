import { memo } from "react"
import { C } from "../../lib/colors"
import { canChangeTipo } from "../../lib/helpers"

// Modal que muestra la grilla de archivos vinculados a una ficha
// (proforma o contrato), con toggle de tipo, marcar/quitar error
// y eliminar (admin). Se abre desde la columna "Archivo" de la tabla.
export default memo(function FilePreviewModal({
  previewRegId, clients, errorFiles, setErrorFiles, adm,
  onUpdateContrato, onDeleteContratoArchivo,
  onAddMore, setViewFile, onClose,
}) {
  if (!previewRegId) return null
  const linked = clients.find(c => !c.deleted_at && (c.reg_ids || []).includes(previewRegId))
  if (!linked) return null
  const lastCt = (linked.contratos || []).slice(-1)[0]
  const archivos = (linked.contratos || []).flatMap(ct => ct.contrato_archivos || [])
  if (!archivos.length) return null
  const tipo = lastCt?.tipo || "proforma"
  const toggleTipo = (newTipo) => {
    if (!lastCt || tipo === newTipo) return
    if (!canChangeTipo()) { alert("Limite de cambios alcanzado (3 por hora)"); return }
    onUpdateContrato(linked.id, lastCt.id, { tipo: newTipo })
  }
  const errCount = archivos.filter(a => errorFiles.has(a.id)).length

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.65)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.card, borderRadius:16, border:`1px solid ${C.border}`, padding:28, maxWidth:580, width:"100%", maxHeight:"85vh", display:"flex", flexDirection:"column" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
            <h3 style={{ margin:0, fontSize:17, fontWeight:700, color:C.text }}>{archivos.length} archivo{archivos.length>1?"s":""}</h3>
            {errCount > 0 && <span style={{ fontSize:11, color:C.red, fontWeight:600 }}>{errCount} con error</span>}
            <div style={{ display:"inline-flex", borderRadius:20, background:C.bg, padding:2 }}>
              <button onClick={()=>toggleTipo("proforma")} style={{ padding:"5px 14px", borderRadius:18, border:"none", cursor:"pointer", fontSize:11, fontWeight:700, background:tipo!=="contrato"?C.yellow:C.bg, color:tipo!=="contrato"?"#fff":C.muted, transition:"all .2s" }}>Proforma</button>
              <button onClick={()=>toggleTipo("contrato")} style={{ padding:"5px 14px", borderRadius:18, border:"none", cursor:"pointer", fontSize:11, fontWeight:700, background:tipo==="contrato"?C.green:C.bg, color:tipo==="contrato"?"#fff":C.muted, transition:"all .2s" }}>Contrato</button>
            </div>
          </div>
          <button onClick={onClose} style={{ background:C.danger, border:"none", borderRadius:"50%", color:"#fff", width:28, height:28, cursor:"pointer", fontSize:15, fontWeight:700, flexShrink:0 }}>x</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(120px, 1fr))", gap:12, overflowY:"auto", flex:1 }}>
          {archivos.map(ar => {
            const isErr = errorFiles.has(ar.id)
            return (
              <div key={ar.id} style={{ borderRadius:12, overflow:"hidden", border:`2px solid ${isErr?C.red:C.border}`, position:"relative", opacity:isErr?.5:1, transition:"opacity .2s" }}>
                <div onClick={()=>setViewFile(ar)} style={{ cursor:"pointer", aspectRatio:"1" }}>
                  {ar.tipo==="image" || ar.tipo?.startsWith("image")
                    ? <img src={ar.url} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} />
                    : ar.tipo==="video" || ar.tipo?.startsWith("video")
                    ? <div style={{ width:"100%",height:"100%",background:C.cardAlt,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4 }}><svg width="32" height="32" fill="none" stroke={C.purple} strokeWidth="2"><path d="M5 3l14 9-14 9V3z"/></svg><span style={{ fontSize:10,color:C.muted }}>Video</span></div>
                    : <div style={{ width:"100%",height:"100%",background:C.cardAlt,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4 }}><svg width="28" height="28" fill="none" stroke={C.red} strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg><span style={{ fontSize:10,color:C.muted }}>PDF</span></div>}
                </div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"5px 8px", background:C.cardAlt }}>
                  <span style={{ fontSize:9, color:isErr?C.red:C.muted, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{isErr?"Error":ar.nombre||"Archivo"}</span>
                  <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                    <button onClick={e=>{e.stopPropagation();setErrorFiles(prev=>{const s=new Set(prev);if(s.has(ar.id))s.delete(ar.id);else s.add(ar.id);return s})}} title={isErr?"Quitar marca":"Marcar como error"} style={{ background:isErr?C.yellow+"22":C.red+"22", border:"none", borderRadius:4, cursor:"pointer", padding:"2px 5px", fontSize:9, fontWeight:700, color:isErr?C.yellow:C.red }}>{isErr?"Restaurar":"Error"}</button>
                    {adm && <button onClick={e=>{e.stopPropagation();if(window.confirm("¿Eliminar este archivo?"))onDeleteContratoArchivo(linked.id,lastCt?.id,ar.id)}} title="Eliminar" style={{ background:C.danger+"22", border:"none", borderRadius:4, cursor:"pointer", padding:"2px 5px", fontSize:9, color:C.danger }}>x</button>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <button onClick={onAddMore} style={{ marginTop:14, width:"100%", padding:"10px", borderRadius:10, border:`1px dashed ${C.border}`, background:"transparent", color:C.accent, cursor:"pointer", fontSize:13, fontWeight:600, flexShrink:0 }}>+ Subir mas fotos</button>
      </div>
    </div>
  )
})
