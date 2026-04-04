import { useState } from "react"
import { C, estadoColors, ADMIN_EMAIL } from "../lib/colors"
import { inp, btn } from "./shared"

const ALL_PERMS = ["registro","clientes","almacen","inventario","agenda","pagos","auditoria","dashboard"]
const VIS_OPTS  = [["always","Siempre"],["month","1 mes"],["week","1 semana"],["3days","3 días"],["today","Solo hoy"],["none","Ninguno"]]

const ALL_TYPES = [
  { value:"image/jpeg", label:"JPG" }, { value:"image/png", label:"PNG" },
  { value:"application/pdf", label:"PDF" }, { value:"video/mp4", label:"MP4" }, { value:"video/quicktime", label:"MOV" },
]

export default function Admin({ users, tags, locales, prodTags, uploadCfg, onSetUploadCfg, visionKey, onSetVisionKey, onSetTags, onSetLocales, onSetProdTags, onUpdateProfile, onDeleteProfile }) {
  const [nt,  setNt]  = useState("")
  const [nl,  setNl]  = useState("")
  const [npt, setNpt] = useState("")
  const [showUsers, setShowUsers] = useState(false)

  const togActive = (uid) => {
    const u = users.find(x=>x.id===uid)
    onUpdateProfile(uid, { active: !u?.active })
  }
  const togPerm = (uid, p) => {
    const u = users.find(x=>x.id===uid)
    const ps = u?.permissions||[]
    onUpdateProfile(uid, { permissions: ps.includes(p) ? ps.filter(x=>x!==p) : [...ps,p] })
  }
  const setVis = (uid, v) => onUpdateProfile(uid, { client_visibility: v })

  const addT  = async () => { if(!nt.trim()||tags.includes(nt.trim())) return; await onSetTags([...tags,nt.trim()]); setNt("") }
  const remT  = async (t) => onSetTags(tags.filter(x=>x!==t))
  const addL  = async () => { if(!nl.trim()||locales.includes(nl.trim())) return; await onSetLocales([...locales,nl.trim()]); setNl("") }
  const remL  = async (l) => onSetLocales(locales.filter(x=>x!==l))
  const addPT = async () => { if(!npt.trim()||prodTags.includes(npt.trim())) return; await onSetProdTags([...prodTags,npt.trim()]); setNpt("") }
  const remPT = async (t) => onSetProdTags(prodTags.filter(x=>x!==t))

  const nonAdmins = users.filter(u => u.email !== ADMIN_EMAIL)

  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:700, marginBottom:20 }}>Panel de Administración</h2>

      {/* Usuarios - button */}
      <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:20, marginBottom:24, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h3 style={{ fontSize:16, fontWeight:600, margin:0 }}>Gestion de Usuarios</h3>
          <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>{nonAdmins.length} empleado{nonAdmins.length!==1?"s":""} registrado{nonAdmins.length!==1?"s":""}</div>
        </div>
        <button onClick={()=>setShowUsers(true)} style={{ background:C.accent, border:"none", borderRadius:10, color:"#fff", cursor:"pointer", padding:"10px 20px", fontSize:13, fontWeight:700 }}>Gestionar usuarios</button>
      </div>

      {/* Usuarios - modal */}
      {showUsers && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.65)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={()=>setShowUsers(false)}>
          <div onClick={e=>e.stopPropagation()} style={{ background:C.bg, borderRadius:16, border:`1px solid ${C.border}`, width:"100%", maxWidth:700, maxHeight:"90vh", display:"flex", flexDirection:"column" }}>
            {/* Header */}
            <div style={{ padding:"18px 24px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
              <h3 style={{ margin:0, fontSize:18, fontWeight:700, color:C.text }}>Gestion de Usuarios</h3>
              <button onClick={()=>setShowUsers(false)} style={{ background:C.danger, border:"none", borderRadius:"50%", color:"#fff", width:28, height:28, cursor:"pointer", fontSize:15, fontWeight:700 }}>x</button>
            </div>
            {/* Body */}
            <div style={{ padding:"16px 24px", overflowY:"auto", flex:1, display:"flex", flexDirection:"column", gap:14 }}>
              {!nonAdmins.length && <div style={{ padding:30, textAlign:"center", color:C.muted }}>No hay usuarios.</div>}
              {nonAdmins.map(u => {
                const userLocals = u.locales || []
                const togLocal = (l) => {
                  const next = userLocals.includes(l) ? userLocals.filter(x=>x!==l) : [...userLocals, l]
                  onUpdateProfile(u.id, { locales: next })
                }
                return (
                <div key={u.id} style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:18 }}>
                  {/* Row 1: Name, email, status, delete */}
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14, flexWrap:"wrap" }}>
                    <div style={{ flex:1, minWidth:150 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:C.text }}>{u.name||"Sin nombre"}</div>
                      <div style={{ fontSize:12, color:C.muted }}>{u.email}</div>
                    </div>
                    <button onClick={()=>togActive(u.id)} style={{ padding:"4px 14px", borderRadius:20, border:"none", cursor:"pointer", fontSize:12, fontWeight:600, background:u.active?C.green:C.red, color:"#fff" }}>
                      {u.active?"Activo":"Inactivo"}
                    </button>
                    <select value={u.client_visibility||"always"} onChange={e=>setVis(u.id,e.target.value)} style={{ padding:"4px 8px", borderRadius:6, border:`1px solid ${C.border}`, background:C.inputBg, color:C.text, fontSize:11, outline:"none" }}>
                      {VIS_OPTS.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                    </select>
                    <button onClick={()=>{if(window.confirm("¿Eliminar este usuario?"))onDeleteProfile(u.id)}} title="Eliminar" style={{ background:C.danger+"22", border:"none", borderRadius:8, cursor:"pointer", color:C.danger, padding:"6px 8px" }}>
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h10M12 6V14a1 1 0 01-1 1H5a1 1 0 01-1-1V6M6 6V4a1 1 0 011-1h2a1 1 0 011 1v2"/></svg>
                    </button>
                  </div>
                  {/* Row 2: Locales */}
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>Locales asignados</div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {locales.map(l => (
                        <button key={l} onClick={()=>togLocal(l)} style={{
                          padding:"3px 12px", borderRadius:12, border:"none", cursor:"pointer", fontSize:11, fontWeight:600,
                          background:userLocals.includes(l)?C.orange+"33":C.border,
                          color:userLocals.includes(l)?C.orange:C.muted,
                        }}>{l}</button>
                      ))}
                      {!locales.length && <span style={{ fontSize:11, color:C.muted }}>No hay locales configurados</span>}
                    </div>
                  </div>
                  {/* Row 3: Permisos */}
                  <div style={{ marginBottom: (u.permissions||[]).includes("agenda") ? 12 : 0 }}>
                    <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>Permisos</div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {ALL_PERMS.map(p => (
                        <button key={p} onClick={()=>togPerm(u.id,p)} style={{
                          padding:"4px 12px", borderRadius:12, border:"none", cursor:"pointer", fontSize:11, fontWeight:600,
                          background:(u.permissions||[]).includes(p)?C.accent+"33":C.border,
                          color:(u.permissions||[]).includes(p)?C.accent:C.muted,
                        }}>{p}</button>
                      ))}
                    </div>
                  </div>
                  {/* Row 4: Agenda config */}
                  {(u.permissions||[]).includes("agenda") && (
                    <div style={{ background:C.cardAlt, borderRadius:8, padding:12 }}>
                      <div style={{ fontSize:11, color:C.muted, marginBottom:8 }}>Agenda</div>
                      <div style={{ display:"flex", gap:14, alignItems:"center", flexWrap:"wrap" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{ fontSize:11, color:C.text }}>Proximos</span>
                          <input type="number" value={u.agenda_days??30} min={0} max={365}
                            onChange={e=>onUpdateProfile(u.id,{agenda_days:Number(e.target.value)||0})}
                            style={{ width:50, padding:"4px 6px", borderRadius:6, border:`1px solid ${C.border}`, background:C.inputBg, color:C.text, fontSize:12, outline:"none", textAlign:"center", fontWeight:700 }} />
                          <span style={{ fontSize:11, color:C.text }}>dias</span>
                        </div>
                        <div style={{ display:"inline-flex", borderRadius:16, background:C.bg, padding:2 }}>
                          {[["own","Sus contratos"],["all","Todo"],["local","Por local"]].map(([v,l])=>(
                            <button key={v} onClick={()=>onUpdateProfile(u.id,{agenda_scope:v})} style={{ padding:"4px 12px", borderRadius:14, border:"none", cursor:"pointer", fontSize:11, fontWeight:600, background:(u.agenda_scope||"own")===v?C.accent:C.bg, color:(u.agenda_scope||"own")===v?"#fff":C.muted, transition:"all .2s" }}>{l}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )})}
            </div>
          </div>
        </div>
      )}

      {/* Tags de estado */}
      <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:20, marginBottom:24 }}>
        <h3 style={{ fontSize:16, fontWeight:600, marginTop:0, marginBottom:16 }}>Tags de Estado</h3>
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          <input value={nt} onChange={e=>setNt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addT()} placeholder="Nuevo estado..." style={{ ...inp, marginBottom:0, flex:1 }} />
          <button onClick={addT} style={btn}>Agregar</button>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {tags.map((t,i) => (
            <div key={t} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:20, background:estadoColors[i%estadoColors.length]+"33", color:estadoColors[i%estadoColors.length], fontSize:13, fontWeight:600 }}>
              {t}
              <button onClick={()=>remT(t)} style={{ background:"none", border:"none", cursor:"pointer", color:"inherit", padding:0, lineHeight:1, fontSize:16 }}>×</button>
            </div>
          ))}
        </div>
      </div>

      {/* Locales */}
      <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:20, marginBottom:24 }}>
        <h3 style={{ fontSize:16, fontWeight:600, marginTop:0, marginBottom:16 }}>Locales / Tiendas</h3>
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          <input value={nl} onChange={e=>setNl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addL()} placeholder="Nuevo local..." style={{ ...inp, marginBottom:0, flex:1 }} />
          <button onClick={addL} style={btn}>Agregar</button>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {locales.map(l => (
            <div key={l} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:20, background:C.orange+"33", color:C.orange, fontSize:13, fontWeight:600 }}>
              {l}
              <button onClick={()=>remL(l)} style={{ background:"none", border:"none", cursor:"pointer", color:"inherit", padding:0, lineHeight:1, fontSize:16 }}>×</button>
            </div>
          ))}
        </div>
      </div>

      {/* Configuración del sistema */}
      <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:20, marginBottom:24 }}>
        <h3 style={{ fontSize:16, fontWeight:600, marginTop:0, marginBottom:16 }}>Configuración del Sistema</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
          <div>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.muted, marginBottom:6 }}>Tamaño máximo de archivos (MB)</label>
            <input type="number" value={uploadCfg?.maxMB ?? 45} min={1} max={200}
              onChange={e => onSetUploadCfg({ ...uploadCfg, maxMB: Number(e.target.value) || 45 })}
              style={{ ...inp, marginBottom:0, width:120 }} />
          </div>
          <div>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.muted, marginBottom:6 }}>Calidad de compresión de fotos</label>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <input type="range" min={0.1} max={1} step={0.05} value={uploadCfg?.quality ?? 0.85}
                onChange={e => onSetUploadCfg({ ...uploadCfg, quality: Number(e.target.value) })}
                style={{ flex:1, accentColor:C.accent }} />
              <span style={{ fontSize:14, fontWeight:700, color:C.accent, minWidth:40 }}>{Math.round((uploadCfg?.quality ?? 0.85) * 100)}%</span>
            </div>
            <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>Menor = más pequeño pero menos calidad. Las imágenes se redimensionan a máx 1920px.</div>
          </div>
        </div>
        <div>
          <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.muted, marginBottom:6 }}>Tipos de archivo permitidos</label>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {ALL_TYPES.map(t => {
              const active = (uploadCfg?.allowedTypes || []).includes(t.value)
              return (
                <button key={t.value} onClick={() => {
                  const types = uploadCfg?.allowedTypes || []
                  const next = active ? types.filter(x => x !== t.value) : [...types, t.value]
                  if (next.length === 0) return // al menos 1
                  onSetUploadCfg({ ...uploadCfg, allowedTypes: next })
                }} style={{
                  padding:"6px 16px", borderRadius:20, border:"none", cursor:"pointer", fontSize:12, fontWeight:600,
                  background: active ? C.accent+"33" : C.border, color: active ? C.accent : C.muted,
                }}>{t.label}</button>
              )
            })}
          </div>
        </div>
        <div style={{ marginTop:16 }}>
          <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.muted, marginBottom:6 }}>Google Vision API Key (para OCR de documentos)</label>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <input type="password" value={visionKey||""} onChange={e=>onSetVisionKey(e.target.value)} placeholder="AIzaSy..." style={{ ...inp, marginBottom:0, flex:1, fontFamily:"monospace" }} />
            {visionKey ? <span style={{ fontSize:11, color:C.green, fontWeight:600 }}>Configurada</span> : <span style={{ fontSize:11, color:C.muted }}>Sin configurar</span>}
          </div>
          <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>Obtener en Google Cloud Console &gt; APIs &gt; Vision API. Se usa para escanear DNI/documentos en fichas de cliente.</div>
        </div>
      </div>

      {/* Productos */}
      <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:20 }}>
        <h3 style={{ fontSize:16, fontWeight:600, marginTop:0, marginBottom:16 }}>Tags de Productos</h3>
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          <input value={npt} onChange={e=>setNpt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addPT()} placeholder="Nuevo producto/servicio..." style={{ ...inp, marginBottom:0, flex:1 }} />
          <button onClick={addPT} style={btn}>Agregar</button>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {prodTags.map(t => (
            <div key={t} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:20, background:C.accent+"33", color:C.accent, fontSize:13, fontWeight:600 }}>
              {t}
              <button onClick={()=>remPT(t)} style={{ background:"none", border:"none", cursor:"pointer", color:"inherit", padding:0, lineHeight:1, fontSize:16 }}>×</button>
            </div>
          ))}
          {!prodTags.length && <span style={{ color:C.muted, fontSize:13 }}>Sin tags. Los empleados podrán escribir libremente.</span>}
        </div>
      </div>
    </div>
  )
}
