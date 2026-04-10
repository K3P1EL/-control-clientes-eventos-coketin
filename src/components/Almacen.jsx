import { useState, useEffect, useRef, memo } from "react"
import { C } from "../lib/colors"
import { inp, mi, btn, td, ib, sel, DInput, toast, SafeImg } from "./shared"
import { Bdg } from "./shared"
import { fmtDate } from "../lib/helpers"
import { getStr, setStr } from "../lib/storage"

const ESTADOS    = ["por_recoger","recogido","en_uso","entregado","devuelto"]
const EST_LABEL  = { por_recoger:"Por recoger", recogido:"Recogido", en_uso:"En uso", entregado:"Entregado", devuelto:"Devuelto" }
const EST_COLOR  = { por_recoger:C.yellow, recogido:C.blue, en_uso:C.purple, entregado:C.accent, devuelto:C.green }

export default memo(function Almacen({
  almacen, clients, regs, user, adm,
  navClientId, clearNav, goToClient,
  onAddSalida, onUpdateSalida, onDeleteSalida,
  onAddItem,   onUpdateItem,   onDeleteItem,
  onAddAlmacenArchivo, onDeleteAlmacenArchivo,
  onAddArchivoRecojo, onDeleteArchivoRecojo,
}) {
  const [view,      setView_]     = useState(() => getStr("almacen_view"))
  const setView = (v) => { setView_(v || null); setStr("almacen_view", v) }
  const [viewFile,  setViewFile]  = useState(null)
  const [searchCl,  setSearchCl]  = useState("")
  const [uploadingCount, setUploadingCount] = useState(0)
  const [errorFiles, setErrorFiles] = useState(new Set())
  const [uploadingRecojo, setUploadingRecojo] = useState(0)
  const fRef = useRef(null)
  const fRefRecojo = useRef(null)

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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- onAddSalida is a stable useCallback from App.jsx; listing it would cause no change but silences the lint rule.
  }, [navClientId, clearNav])

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
          {s.client_code && <button onClick={()=>{
            const url = `${window.location.origin}/ver/${s.client_code}`
            const msg = `Mira los productos de tu evento (${s.client_name||s.client_code}):\n${url}`
            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank")
          }} style={{ background:"#25D366"+"22", border:`1px solid #25D36644`, borderRadius:8, color:"#25D366", cursor:"pointer", padding:"6px 12px", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
            Compartir
          </button>}
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
                <DInput type="number" value={it.cantidad} onCommit={v=>{const n=Math.max(1,Number(v)||1);onUpdateItem(s.id,it.id,{cantidad:n})}} style={{ ...mi, width:50 }} placeholder="1" min="1" />
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

          {/* Archivos — 2 columnas: Salida y Recojo */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {/* Archivos de SALIDA */}
            <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:20, borderLeft:`3px solid ${C.orange}` }}>
              <h3 style={{ fontSize:14, fontWeight:600, marginTop:0, marginBottom:10, color:C.orange }}>Lo que se lleva</h3>
              <input ref={fRef} type="file" accept="video/*,image/*,application/pdf" multiple style={{ display:"none" }} onChange={async e=>{const files=Array.from(e.target.files||[]);e.target.value="";if(!files.length)return;setUploadingCount(c=>c+files.length);const failed=[];await Promise.all(files.map(f=>onAddAlmacenArchivo(s.id,f).catch(err=>failed.push(f.name))));setUploadingCount(c=>Math.max(0,c-files.length));if(failed.length)toast(`Error subiendo: ${failed.join(", ")}`)}} />
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <button onClick={()=>fRef.current?.click()} style={{ background:C.inputBg, border:`1px solid ${C.border}`, borderRadius:8, color:C.orange, cursor:"pointer", padding:"6px 14px", fontSize:11, fontWeight:600 }}>Subir foto</button>
                {uploadingCount > 0 && <span style={{ fontSize:11, color:C.orange }}>{uploadingCount} subiendo...</span>}
              </div>
              {!(s.almacen_archivos||[]).length && <div style={{ padding:14, textAlign:"center", color:C.muted, fontSize:12, background:C.cardAlt, borderRadius:8 }}>Sin archivos de salida</div>}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(100px, 1fr))", gap:8 }}>
                {(s.almacen_archivos||[]).map(ar => {
                  const isErr = errorFiles.has(ar.id)
                  return (
                    <div key={ar.id} style={{ borderRadius:10, overflow:"hidden", border:`2px solid ${isErr?C.red:C.border}`, opacity:isErr?0.5:1 }}>
                      <div onClick={()=>setViewFile(ar)} style={{ cursor:"pointer", aspectRatio:"1" }}>
                        {ar.tipo?.startsWith("image") ? <SafeImg src={ar.url} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} />
                        : ar.tipo?.startsWith("video") ? <div style={{ width:"100%",height:"100%",background:C.cardAlt,display:"flex",alignItems:"center",justifyContent:"center" }}><svg width="24" height="24" fill="none" stroke={C.purple} strokeWidth="2"><path d="M5 3l14 9-14 9V3z"/></svg></div>
                        : <div style={{ width:"100%",height:"100%",background:C.cardAlt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:C.yellow,fontWeight:700 }}>PDF</div>}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"4px 6px", background:C.cardAlt }}>
                        <span style={{ fontSize:8, color:C.muted, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ar.nombre||"Archivo"}</span>
                        <div style={{ display:"flex", gap:3 }}>
                          <button onClick={()=>setErrorFiles(prev=>{const x=new Set(prev);if(x.has(ar.id))x.delete(ar.id);else x.add(ar.id);return x})} style={{ background:isErr?C.yellow+"22":C.red+"22", border:"none", borderRadius:3, cursor:"pointer", padding:"1px 4px", fontSize:8, fontWeight:700, color:isErr?C.yellow:C.red }}>{isErr?"↩":"!"}</button>
                          {adm && <button onClick={()=>{if(window.confirm("¿Eliminar?"))onDeleteAlmacenArchivo(s.id,ar.id)}} style={{ background:C.danger+"22", border:"none", borderRadius:3, cursor:"pointer", padding:"1px 4px", fontSize:8, color:C.danger }}>x</button>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Archivos de RECOJO */}
            <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:20, borderLeft:`3px solid ${C.green}` }}>
              <h3 style={{ fontSize:14, fontWeight:600, marginTop:0, marginBottom:10, color:C.green }}>Lo que se recoge</h3>
              <input ref={fRefRecojo} type="file" accept="video/*,image/*,application/pdf" multiple style={{ display:"none" }} onChange={async e=>{const files=Array.from(e.target.files||[]);e.target.value="";if(!files.length)return;setUploadingRecojo(c=>c+files.length);const failed=[];await Promise.all(files.map(f=>onAddArchivoRecojo(s.id,f).catch(err=>failed.push(f.name))));setUploadingRecojo(c=>Math.max(0,c-files.length));if(failed.length)toast(`Error subiendo: ${failed.join(", ")}`)}} />
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <button onClick={()=>fRefRecojo.current?.click()} style={{ background:C.inputBg, border:`1px solid ${C.border}`, borderRadius:8, color:C.green, cursor:"pointer", padding:"6px 14px", fontSize:11, fontWeight:600 }}>Subir foto</button>
                {uploadingRecojo > 0 && <span style={{ fontSize:11, color:C.green }}>{uploadingRecojo} subiendo...</span>}
              </div>
              {!(s.almacen_archivos_recojo||[]).length && <div style={{ padding:14, textAlign:"center", color:C.muted, fontSize:12, background:C.cardAlt, borderRadius:8 }}>Sin archivos de recojo</div>}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(100px, 1fr))", gap:8 }}>
                {(s.almacen_archivos_recojo||[]).map(ar => (
                  <div key={ar.id} style={{ borderRadius:10, overflow:"hidden", border:`2px solid ${C.border}` }}>
                    <div onClick={()=>setViewFile(ar)} style={{ cursor:"pointer", aspectRatio:"1" }}>
                      {ar.tipo?.startsWith("image") ? <SafeImg src={ar.url} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} />
                      : ar.tipo?.startsWith("video") ? <div style={{ width:"100%",height:"100%",background:C.cardAlt,display:"flex",alignItems:"center",justifyContent:"center" }}><svg width="24" height="24" fill="none" stroke={C.purple} strokeWidth="2"><path d="M5 3l14 9-14 9V3z"/></svg></div>
                      : <div style={{ width:"100%",height:"100%",background:C.cardAlt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:C.yellow,fontWeight:700 }}>PDF</div>}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"4px 6px", background:C.cardAlt }}>
                      <span style={{ fontSize:8, color:C.muted, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ar.nombre||"Archivo"}</span>
                      {adm && <button onClick={()=>{if(window.confirm("¿Eliminar?"))onDeleteArchivoRecojo(s.id,ar.id)}} style={{ background:C.danger+"22", border:"none", borderRadius:3, cursor:"pointer", padding:"1px 4px", fontSize:8, color:C.danger }}>x</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notas de perdida */}
            <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:20, borderLeft:`3px solid ${C.red}` }}>
              <h3 style={{ fontSize:14, fontWeight:600, marginTop:0, marginBottom:10, color:C.red }}>Perdidas / Danos</h3>
              <DInput tag="textarea" value={s.notas_perdida||""} onCommit={v=>onUpdateSalida(s.id,{notas_perdida:v})} style={{ ...inp, minHeight:60, resize:"vertical", fontFamily:"inherit" }} placeholder="Detalla que se perdio o dano en el evento..." />
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
  const activeSalidas = almacen.filter(s => !s.deleted_at)
  const mySalidas = adm ? activeSalidas : activeSalidas.filter(s=>s.created_by===user.id)
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
            const linkedClient = clients.find(c => c.id === s.client_id)
            const clientDeleted = linkedClient?.deleted_at
            const clientRegDeleted = linkedClient && (linkedClient.reg_ids||[]).length > 0 && (linkedClient.reg_ids||[]).every(rid => { const r = regs?.find(x=>x.id===rid); return !r || r.deleted })
            const borderColor = clientDeleted ? C.red : clientRegDeleted ? C.orange : EST_COLOR[s.estado] || C.muted
            return (
              <button key={s.id} onClick={()=>setView(s.id)} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"16px 18px", cursor:"pointer", textAlign:"left", transition:"all .2s", borderLeft:`4px solid ${borderColor}`, opacity:clientDeleted?0.6:1 }}
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
})
