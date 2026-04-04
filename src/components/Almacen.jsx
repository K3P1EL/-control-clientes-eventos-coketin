import { useState, useEffect, useRef } from "react"
import { C } from "../lib/colors"
import { inp, mi, btn, td, ib, sel, DInput } from "./shared"
import { Bdg } from "./shared"
import { fmtDate } from "../lib/helpers"

const ESTADOS    = ["por_recoger","recogido","en_uso","entregado","devuelto"]
const EST_LABEL  = { por_recoger:"Por recoger", recogido:"Recogido", en_uso:"En uso", entregado:"Entregado", devuelto:"Devuelto" }
const EST_COLOR  = { por_recoger:C.yellow, recogido:C.blue, en_uso:C.purple, entregado:C.accent, devuelto:C.green }

export default function Almacen({
  almacen, clients, user, adm,
  navClientId, clearNav, goToClient,
  onAddSalida, onUpdateSalida, onDeleteSalida,
  onAddItem,   onUpdateItem,   onDeleteItem,
  onAddAlmacenArchivo, onDeleteAlmacenArchivo,
}) {
  const [view,      setView_]     = useState(() => { try { const v = localStorage.getItem("almacen_view"); return v || null } catch { return null } })
  const setView = (v) => { setView_(v || null); try { if (v) localStorage.setItem("almacen_view", v); else localStorage.removeItem("almacen_view") } catch {} }
  const [viewFile,  setViewFile]  = useState(null)
  const [searchCl,  setSearchCl]  = useState("")
  const [uploadingCount, setUploadingCount] = useState(0)
  const [errorFiles, setErrorFiles] = useState(new Set())
  const fRef = useRef(null)

  useEffect(() => {
    if (!navClientId) return
    const existing = almacen.find(s=>s.client_id===navClientId)
    if (existing) {
      setView(existing.id)
    } else {
      const cl = clients.find(c=>c.id===navClientId)
      onAddSalida(navClientId, cl?.nombre||"", cl?.code||"").then(ns=>setView(ns.id))
    }
    clearNav()
  }, [navClientId])

  // ── Detail view ───────────────────────────────────────────────────────────
  if (view) {
    const s = almacen.find(x=>x.id===view)
    if (!s) {
      if (almacen.length > 0) { setView(null); return null }
      return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:60, color:C.muted }}><div style={{ textAlign:"center" }}><div style={{ width:28, height:28, border:`3px solid ${C.border}`, borderTop:`3px solid ${C.accent}`, borderRadius:"50%", animation:"spin 1s linear infinite", margin:"0 auto 12px" }} />Cargando salida...</div></div>
    }
    const totalItems = (s.almacen_items||[]).length
    const devueltos  = (s.almacen_items||[]).filter(it=>it.devuelto).length

    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, flexWrap:"wrap" }}>
          <button onClick={()=>setView(null)} style={{ background:C.inputBg, border:`1px solid ${C.border}`, color:C.accent, borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>Volver
          </button>
          <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>Salida de Almacén</h2>
          <Bdg c={EST_COLOR[s.estado]||C.muted}>
            <select value={s.estado} onChange={e=>onUpdateSalida(s.id,{estado:e.target.value})} style={sel}>
              {ESTADOS.map(e=><option key={e} value={e}>{EST_LABEL[e]}</option>)}
            </select>
          </Bdg>
          {s.client_id && (
            <button onClick={()=>goToClient(s.client_id)} style={{ background:C.accent+"22", border:"none", borderRadius:6, color:C.accent, cursor:"pointer", padding:"4px 10px", fontSize:12, fontWeight:600 }}>
              Ver cliente: {s.client_name||s.client_code}
            </button>
          )}
          {adm && <button onClick={async()=>{if(!window.confirm("¿Eliminar esta salida permanentemente?"))return;await onDeleteSalida(s.id);setView(null)}} style={{ marginLeft:"auto", background:C.danger+"22", border:`1px solid ${C.danger}44`, borderRadius:8, color:C.danger, cursor:"pointer", padding:"6px 14px", fontSize:12, fontWeight:600 }}>Eliminar</button>}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {/* Items */}
          <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <h3 style={{ fontSize:15, fontWeight:600, margin:0, color:C.accent }}>Productos / Materiales</h3>
              <button onClick={()=>onAddItem(s.id,{nombre:"",cantidad:1,devuelto:false})} style={{ background:C.accent+"22", border:`1px solid ${C.accent}44`, borderRadius:6, color:C.accent, cursor:"pointer", padding:"4px 10px", fontSize:12, fontWeight:700 }}>+ Producto</button>
            </div>
            {totalItems>0 && <div style={{ fontSize:12, color:C.muted, marginBottom:10 }}>{devueltos}/{totalItems} devueltos</div>}
            {!(s.almacen_items||[]).length && <div style={{ padding:20, textAlign:"center", color:C.muted, fontSize:13, background:C.cardAlt, borderRadius:8 }}>Sin productos. Agrega lo que se llevan.</div>}
            {(s.almacen_items||[]).map((it,idx) => (
              <div key={it.id} style={{ display:"flex", gap:6, alignItems:"center", padding:"8px 10px", background:idx%2?C.cardAlt+"66":"transparent", borderRadius:6, marginBottom:2 }}>
                <DInput value={it.nombre} onCommit={v=>onUpdateItem(s.id,it.id,{nombre:v})} style={{ ...mi, flex:1 }} placeholder="Nombre del producto..." />
                <DInput type="number" value={it.cantidad} onCommit={v=>onUpdateItem(s.id,it.id,{cantidad:v})} style={{ ...mi, width:50 }} placeholder="1" />
                <button onClick={()=>onUpdateItem(s.id,it.id,{devuelto:!it.devuelto})} style={{ padding:"3px 8px", borderRadius:6, border:"none", cursor:"pointer", fontSize:10, fontWeight:700, background:it.devuelto?C.green+"33":C.yellow+"33", color:it.devuelto?C.green:C.yellow }}>
                  {it.devuelto?"✓ Devuelto":"Pendiente"}
                </button>
                <button onClick={()=>{if(window.confirm("¿Eliminar este item?"))onDeleteItem(s.id,it.id)}} style={{ ...ib, color:C.danger }}>
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 4h8M9 4V10a1 1 0 01-1 1H4a1 1 0 01-1-1V4"/></svg>
                </button>
              </div>
            ))}
            <div style={{ marginTop:12 }}>
              <label style={{ fontSize:12, fontWeight:600, color:C.muted, marginBottom:4, display:"block" }}>Notas</label>
              <DInput tag="textarea" value={s.notas||""} onCommit={v=>onUpdateSalida(s.id,{notas:v})} style={{ ...inp, minHeight:50, resize:"vertical", fontFamily:"inherit" }} placeholder="Observaciones..." />
            </div>
            <div style={{ fontSize:11, color:C.muted, marginTop:10 }}>Creado por {s.created_by_name} — {fmtDate(s.created_at)}</div>
          </div>

          {/* Archivos */}
          <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:20 }}>
            <h3 style={{ fontSize:15, fontWeight:600, marginTop:0, marginBottom:12, color:C.accent }}>Archivos / Grabaciones</h3>
            <input ref={fRef} type="file" accept="video/*,image/*,application/pdf" multiple style={{ display:"none" }} onChange={async e=>{const files=Array.from(e.target.files||[]);e.target.value="";if(!files.length)return;setUploadingCount(c=>c+files.length);await Promise.all(files.map(f=>onAddAlmacenArchivo(s.id,f).catch(err=>alert("Error: "+err.message)))).finally(()=>setUploadingCount(c=>Math.max(0,c-files.length)))}} />
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}
              onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor=C.accent}} onDragLeave={e=>{e.currentTarget.style.borderColor="transparent"}}
              onDrop={async e=>{e.preventDefault();e.currentTarget.style.borderColor="transparent";const files=Array.from(e.dataTransfer.files||[]).filter(f=>/^(image|video|application\/pdf)/.test(f.type));if(!files.length)return;setUploadingCount(c=>c+files.length);await Promise.all(files.map(f=>onAddAlmacenArchivo(s.id,f).catch(err=>alert("Error: "+err.message)))).finally(()=>setUploadingCount(c=>Math.max(0,c-files.length)))}}>
              <button onClick={()=>fRef.current?.click()} style={{ background:C.inputBg, border:`1px solid ${C.border}`, borderRadius:8, color:C.accent, cursor:"pointer", padding:"8px 16px", fontSize:12, fontWeight:600 }}>Subir archivo</button>
              {uploadingCount > 0 && <span style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.accent }}><span style={{ display:"inline-block", width:12, height:12, border:"2px solid currentColor", borderTopColor:"transparent", borderRadius:"50%", animation:"spin .8s linear infinite" }} />{uploadingCount} subiendo...</span>}
              <span style={{ fontSize:11, color:C.muted }}>o arrastra aqui</span>
            </div>
            {!(s.almacen_archivos||[]).length && <div style={{ padding:20, textAlign:"center", color:C.muted, fontSize:13, background:C.cardAlt, borderRadius:8 }}>Sin archivos.</div>}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(120px, 1fr))", gap:10 }}>
              {(s.almacen_archivos||[]).map(ar => {
                const isErr = errorFiles.has(ar.id)
                return (
                  <div key={ar.id} style={{ borderRadius:12, overflow:"hidden", border:`2px solid ${isErr?C.red:C.border}`, position:"relative", opacity:isErr?.5:1, transition:"opacity .2s" }}>
                    <div onClick={()=>setViewFile(ar)} style={{ cursor:"pointer", aspectRatio:"1" }}>
                      {ar.tipo?.startsWith("image")
                        ? <img src={ar.url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                        : ar.tipo?.startsWith("video")
                        ? <div style={{ width:"100%",height:"100%",background:C.cardAlt,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4 }}><svg width="32" height="32" fill="none" stroke={C.purple} strokeWidth="2"><path d="M5 3l14 9-14 9V3z"/></svg><span style={{ fontSize:10,color:C.muted }}>Video</span></div>
                        : <div style={{ width:"100%",height:"100%",background:C.cardAlt,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4 }}><svg width="28" height="28" fill="none" stroke={C.red} strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg><span style={{ fontSize:10,color:C.muted }}>PDF</span></div>}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"5px 8px", background:C.cardAlt }}>
                      <span style={{ fontSize:9, color:isErr?C.red:C.muted, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{isErr?"Error":ar.nombre||"Archivo"}</span>
                      <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                        <button onClick={e=>{e.stopPropagation();setErrorFiles(prev=>{const s=new Set(prev);if(s.has(ar.id))s.delete(ar.id);else s.add(ar.id);return s})}} style={{ background:isErr?C.yellow+"22":C.red+"22", border:"none", borderRadius:4, cursor:"pointer", padding:"2px 5px", fontSize:9, fontWeight:700, color:isErr?C.yellow:C.red }}>{isErr?"Restaurar":"Error"}</button>
                        {adm && <button onClick={e=>{e.stopPropagation();if(window.confirm("¿Eliminar este archivo?"))onDeleteAlmacenArchivo(s.id,ar.id)}} style={{ background:C.danger+"22", border:"none", borderRadius:4, cursor:"pointer", padding:"2px 5px", fontSize:9, color:C.danger }}>x</button>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* File viewer */}
        {viewFile && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }} onClick={()=>setViewFile(null)}>
            <div onClick={e=>e.stopPropagation()} style={{ maxWidth:"90vw", maxHeight:"90vh", position:"relative" }}>
              <button onClick={()=>setViewFile(null)} style={{ position:"absolute", top:-12, right:-12, background:C.danger, border:"none", borderRadius:"50%", color:"#fff", width:28, height:28, cursor:"pointer", fontSize:16, fontWeight:700, zIndex:1 }}>×</button>
              {viewFile.tipo?.startsWith("image") && <img src={viewFile.url} alt="" style={{ maxWidth:"90vw", maxHeight:"85vh", borderRadius:8, objectFit:"contain" }} />}
              {viewFile.tipo?.startsWith("video") && <video src={viewFile.url} controls autoPlay style={{ maxWidth:"90vw", maxHeight:"85vh", borderRadius:8 }} />}
              {viewFile.tipo==="application/pdf" && <embed src={viewFile.url} type="application/pdf" style={{ width:"85vw", height:"85vh", borderRadius:8 }} />}
              <div style={{ textAlign:"center", marginTop:8, color:"#fff", fontSize:12 }}>{viewFile.nombre}</div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── List view ─────────────────────────────────────────────────────────────
  const mySalidas = adm ? almacen : almacen.filter(s=>s.created_by===user.id)
  const searchResults = searchCl.trim()
    ? clients.filter(c => {
        if (c.erronea || c.deleted_at) return false
        const q = searchCl.toLowerCase()
        return (c.nombre||"").toLowerCase().includes(q)
          || (c.code||"").toLowerCase().includes(q)
          || (c.dni||"").includes(q)
          || (c.phones||[]).some(p=>p.includes(q))
      })
    : []

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>Almacén</h2>
      </div>

      {/* Buscador para nueva salida */}
      <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:16, marginBottom:20, position:"relative" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <svg width="18" height="18" fill="none" stroke={C.muted} strokeWidth="2"><circle cx="8" cy="8" r="5"/><path d="M13 13l3 3"/></svg>
          <input value={searchCl} onChange={e=>setSearchCl(e.target.value)} placeholder="Nueva salida — busca por nombre, código, celular o DNI..." style={{ ...inp, marginBottom:0, flex:1, fontSize:14, border:"none", background:"transparent", padding:"4px 0" }} />
          {searchCl && <button onClick={()=>setSearchCl("")} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", padding:4, fontSize:16 }}>×</button>}
        </div>
        {searchCl.trim() && (
          <div style={{ marginTop:10, maxHeight:220, overflow:"auto", borderTop:`1px solid ${C.border}`, paddingTop:10 }}>
            {!searchResults.length && <div style={{ padding:16, textAlign:"center", color:C.muted, fontSize:13 }}>No se encontró ningún cliente.</div>}
            {searchResults.map(c => {
              const existing = almacen.find(s=>s.client_id===c.id && s.estado!=="devuelto")
              return (
              <button key={c.id} onClick={async()=>{
                if (existing) { setView(existing.id); setSearchCl(""); return }
                const ns = await onAddSalida(c.id,c.nombre||"",c.code||""); setView(ns.id); setSearchCl("")
              }} style={{
                width:"100%", padding:"10px 14px", border:`1px solid ${C.border}`, borderRadius:8, background:C.cardAlt,
                cursor:"pointer", textAlign:"left", color:C.text, fontSize:13, marginBottom:6,
                display:"flex", alignItems:"center", justifyContent:"space-between", transition:"all .15s",
              }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent}
              onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                <div>
                  <div style={{ fontWeight:600, fontSize:14 }}>{c.nombre||"Sin nombre"}</div>
                  <div style={{ display:"flex", gap:8, marginTop:3, flexWrap:"wrap" }}>
                    {c.code && <span style={{ fontSize:10, fontWeight:700, color:C.cyan, fontFamily:"monospace", background:C.cyan+"18", padding:"1px 5px", borderRadius:4 }}>{c.code}</span>}
                    {(c.phones||[])[0] && <span style={{ fontSize:10, color:C.accent }}>{(c.phones||[])[0]}</span>}
                    {c.dni && <span style={{ fontSize:10, color:C.yellow }}>DNI: {c.dni}</span>}
                  </div>
                </div>
                <div style={{ background:existing?C.teal+"22":C.accent+"22", borderRadius:6, padding:"4px 10px", fontSize:11, fontWeight:700, color:existing?C.teal:C.accent, whiteSpace:"nowrap" }}>{existing?"→ Ver salida":"+ Crear salida"}</div>
              </button>
            )})}
          </div>
        )}
      </div>

      {mySalidas.length===0 ? (
        <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:40, textAlign:"center", color:C.muted }}>
          No hay salidas de almacén. Busca un cliente arriba para crear una.
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:14 }}>
          {mySalidas.map(s => {
            const totalItems = (s.almacen_items||[]).length
            const devueltos  = (s.almacen_items||[]).filter(it=>it.devuelto).length
            return (
              <button key={s.id} onClick={()=>setView(s.id)} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"16px 18px", cursor:"pointer", textAlign:"left", transition:"all .2s", borderLeft:`4px solid ${EST_COLOR[s.estado]||C.muted}` }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent}
                onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color:C.text }}>{s.client_name||"Sin cliente"}</div>
                    {s.client_code && <span style={{ fontSize:9, fontWeight:700, color:C.cyan, fontFamily:"monospace", background:C.cyan+"18", padding:"1px 5px", borderRadius:4 }}>{s.client_code}</span>}
                  </div>
                  <span style={{ padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700, background:(EST_COLOR[s.estado]||C.muted)+"33", color:EST_COLOR[s.estado]||C.muted }}>
                    {EST_LABEL[s.estado]}
                  </span>
                </div>
                <div style={{ fontSize:12, color:C.muted }}>{totalItems} productos • {devueltos} devueltos • {(s.almacen_archivos||[]).length} archivos</div>
                <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>{s.created_by_name} — {fmtDate(s.created_at)}</div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
