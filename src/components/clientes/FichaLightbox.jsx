import { memo } from "react"
import { C } from "../../lib/colors"

// Lightbox fullscreen para previsualizar imagen, video o PDF.
// `item` debe tener { tipo, url, nombre? }. null = oculto.
export default memo(function FichaLightbox({ item, onClose }) {
  if (!item) return null
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center" }}>
        <button onClick={onClose} style={{ position:"absolute", top:-14, right:-14, background:C.danger, border:"none", borderRadius:"50%", color:"#fff", width:30, height:30, cursor:"pointer", fontSize:18, fontWeight:700, zIndex:1 }}>×</button>
        {item.tipo==="image"
          ? <img src={item.url} alt="" style={{ maxWidth:"90vw", maxHeight:"85vh", borderRadius:8, objectFit:"contain" }} />
          : item.tipo==="video"
          ? <video src={item.url} controls autoPlay style={{ maxWidth:"90vw", maxHeight:"85vh", borderRadius:8 }} />
          : <embed src={item.url} type="application/pdf" style={{ width:"85vw", height:"85vh", borderRadius:8 }} />}
        {item.nombre && <div style={{ marginTop:8, color:"#fff", fontSize:12 }}>{item.nombre}</div>}
      </div>
    </div>
  )
})
