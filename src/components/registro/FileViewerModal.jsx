import { memo } from "react"
import { C } from "../../lib/colors"

// Visor fullscreen de un archivo único (imagen, video o PDF).
// Se abre desde el grid del FilePreviewModal o de la tabla.
export default memo(function FileViewerModal({ viewFile, onClose }) {
  if (!viewFile) return null
  const t = viewFile.tipo
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.88)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ maxWidth:"92vw", maxHeight:"92vh", position:"relative" }}>
        <button onClick={onClose} style={{ position:"absolute", top:-14, right:-14, background:C.danger, border:"none", borderRadius:"50%", color:"#fff", width:32, height:32, cursor:"pointer", fontSize:18, fontWeight:700, zIndex:1 }}>x</button>
        {(t==="image"||t?.startsWith("image")) && <img src={viewFile.url} alt="" style={{ maxWidth:"90vw", maxHeight:"85vh", borderRadius:10, objectFit:"contain" }} />}
        {(t==="video"||t?.startsWith("video")) && <video src={viewFile.url} controls autoPlay style={{ maxWidth:"90vw", maxHeight:"85vh", borderRadius:10 }} />}
        {(t==="pdf"||t==="application/pdf") && <embed src={viewFile.url} type="application/pdf" style={{ width:"85vw", height:"85vh", borderRadius:10 }} />}
        <div style={{ textAlign:"center", marginTop:8, color:"#fff", fontSize:12 }}>{viewFile.nombre||"Archivo"}</div>
      </div>
    </div>
  )
})
