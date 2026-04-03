import { useState } from "react"
import { C } from "../lib/colors"
import { inp } from "./shared"

export default function LinkPopup({ c, clients, onMergeClients, setLinking, setView, setActiveContrato }) {
  const [sCod, setSCod] = useState("")
  const [sNom, setSNom] = useState("")
  const [sCel, setSCel] = useState("")
  const [sDni, setSDni] = useState("")

  const hasSearch = sCod.trim() || sNom.trim() || sCel.trim() || sDni.trim()

  const results = clients.filter(cx => {
    if (cx.id === c.id || !hasSearch) return false
    if (sCod.trim() && (cx.code||"").toLowerCase().includes(sCod.trim().toLowerCase())) return true
    if (sNom.trim() && (cx.nombre||"").toLowerCase().includes(sNom.trim().toLowerCase())) return true
    if (sCel.trim() && ((cx.phones||[]).some(p=>p.includes(sCel.trim())) || (cx.celular||"").includes(sCel.trim()))) return true
    if (sDni.trim() && (cx.dni||"").includes(sDni.trim())) return true
    return false
  })

  const merge = async (cx) => {
    // El target es cx, la fuente es c (c se elimina)
    await onMergeClients(cx.id, c.id)
    setLinking(false)
    setView(cx.id)
    setActiveContrato(0)
  }

  const fs = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }
  const fl = { fontSize:11, fontWeight:600, color:C.muted, marginBottom:3, display:"block" }

  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={() => setLinking(false)}
    >
      <div onClick={e=>e.stopPropagation()} style={{ background:C.card, borderRadius:16, border:`1px solid ${C.border}`, padding:24, width:460, maxHeight:"80vh", overflow:"auto" }}>
        <h3 style={{ margin:"0 0 4px", fontSize:18, fontWeight:700, color:C.text }}>Vincular a cliente existente</h3>
        <p style={{ color:C.muted, fontSize:13, margin:"0 0 16px" }}>Los contratos de esta ficha se moverán al cliente destino.</p>
        <div style={fs}>
          <div><label style={fl}>Código</label><input value={sCod} onChange={e=>setSCod(e.target.value)} style={{ ...inp, marginBottom:0 }} placeholder="FIC-XXXXXX" autoFocus /></div>
          <div><label style={fl}>Nombre</label><input value={sNom} onChange={e=>setSNom(e.target.value)} style={{ ...inp, marginBottom:0 }} placeholder="Juan, María..." /></div>
          <div><label style={fl}>Celular</label><input value={sCel} onChange={e=>setSCel(e.target.value)} style={{ ...inp, marginBottom:0 }} placeholder="957..." /></div>
          <div><label style={fl}>DNI</label><input value={sDni} onChange={e=>setSDni(e.target.value)} style={{ ...inp, marginBottom:0 }} placeholder="7385..." /></div>
        </div>
        <div style={{ maxHeight:220, overflow:"auto" }}>
          {hasSearch && results.length === 0 && (
            <div style={{ padding:16, textAlign:"center", color:C.muted, fontSize:13 }}>No se encontró ningún cliente.</div>
          )}
          {results.map(cx => {
            const visits = (cx.contratos||[]).length
            return (
              <button key={cx.id} onClick={()=>merge(cx)} style={{
                width:"100%", padding:"10px 12px", borderRadius:8, border:`1px solid ${C.border}`,
                background:C.cardAlt, cursor:"pointer", textAlign:"left", marginBottom:6,
                display:"flex", alignItems:"center", justifyContent:"space-between",
              }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{cx.nombre||"Sin nombre"}</div>
                  <div style={{ fontSize:12, color:C.muted }}>
                    {(cx.phones||[])[0]||"Sin número"}
                    {cx.code ? ` · ${cx.code}` : ""}
                    {cx.dni  ? ` · DNI: ${cx.dni}` : ""}
                  </div>
                </div>
                <div style={{ padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700, background:C.purple+"33", color:C.purple }}>
                  {visits} visita{visits!==1?"s":""}
                </div>
              </button>
            )
          })}
        </div>
        <button onClick={()=>setLinking(false)} style={{ marginTop:12, width:"100%", padding:8, borderRadius:8, border:`1px solid ${C.border}`, background:"transparent", color:C.muted, cursor:"pointer", fontSize:13 }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
