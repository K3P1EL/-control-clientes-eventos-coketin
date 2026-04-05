import { useState } from "react"
import { C, estadoColors, ADMIN_EMAIL } from "../lib/colors"
import { inp, btn, DInput } from "./shared"

const ALL_PERMS = ["registro","fichas","clientes","almacen","inventario","agenda","pagos","auditoria","dashboard"]
const PERM_LABELS = { registro:"Registro", fichas:"Contratera", clientes:"Clientes", almacen:"Almacen", inventario:"Inventario", agenda:"Agenda", pagos:"Pagos", auditoria:"Auditoria", dashboard:"Dashboard" }
const PERM_ICONS = { registro:"M3 3h12v12H3z", fichas:"M14 2H6a2 2 0 00-2 2v16h12a2 2 0 002-2V8z", clientes:"M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2", almacen:"M3 3h4l2 3h6l2-3h4v12H3z", inventario:"M4 4h16v4H4z", agenda:"M8 2v4M16 2v4M3 10h18", pagos:"M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2", auditoria:"M9 3a6 6 0 100 12A6 6 0 009 3z", dashboard:"M3 10h3v5H3zM8 6h3v9H8zM13 3h3v12h-3z" }
const VIS_OPTS  = [["always","Siempre"],["month","1 mes"],["week","1 semana"],["3days","3 días"],["today","Solo hoy"],["none","Ninguno"]]

const ALL_TYPES = [
  { value:"image/jpeg", label:"JPG" }, { value:"image/png", label:"PNG" },
  { value:"application/pdf", label:"PDF" }, { value:"video/mp4", label:"MP4" }, { value:"video/quicktime", label:"MOV" },
]

export default function Admin({ users, tags, locales, prodTags, uploadCfg, onSetUploadCfg, visionKey, onSetVisionKey, trashDays, onSetTrashDays, onSetTags, onSetLocales, onSetProdTags, onUpdateProfile, onDeleteProfile }) {
  const [nt,  setNt]  = useState("")
  const [nl,  setNl]  = useState("")
  const [npt, setNpt] = useState("")
  const [showUsers, setShowUsers] = useState(false)
  const [openConfig, setOpenConfig] = useState(null)
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)

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

  // ── User management view ───────────────────────────────────────────────
  if (showUsers) return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <button onClick={()=>setShowUsers(false)} style={{ background:C.inputBg, border:`1px solid ${C.border}`, color:C.accent, borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>Volver
        </button>
        <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>Gestion de Usuarios</h2>
        <span style={{ fontSize:13, color:C.muted }}>{nonAdmins.length} empleado{nonAdmins.length!==1?"s":""}</span>
      </div>
      {!nonAdmins.length && <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:40, textAlign:"center", color:C.muted }}>No hay usuarios registrados.</div>}
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {nonAdmins.map(u => {
          const userLocals = u.locales || []
          const togLocal = (l) => {
            const next = userLocals.includes(l) ? userLocals.filter(x=>x!==l) : [...userLocals, l]
            onUpdateProfile(u.id, { locales: next })
          }
          return (
          <div key={u.id} style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden" }}>
            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", gap:12, padding:"16px 20px", borderBottom:`1px solid ${C.border}`, flexWrap:"wrap" }}>
              <div style={{ width:36, height:36, borderRadius:10, background:u.active?C.accent+"22":C.red+"22", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg width="18" height="18" fill="none" stroke={u.active?C.accent:C.red} strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 3a4 4 0 100 8 4 4 0 000-8z"/></svg>
              </div>
              <div style={{ flex:1, minWidth:150 }}>
                <DInput value={u.name||""} onCommit={v=>onUpdateProfile(u.id,{name:v})} placeholder="Sin nombre" style={{ fontSize:16, fontWeight:700, color:C.text, background:"transparent", border:"none", outline:"none", padding:0, width:"100%" }} />
                <div style={{ fontSize:11, color:C.muted }}>{u.email}</div>
              </div>
              <button onClick={()=>togActive(u.id)} style={{ padding:"5px 16px", borderRadius:20, border:"none", cursor:"pointer", fontSize:11, fontWeight:700, background:u.active?C.green:C.red, color:"#fff" }}>
                {u.active?"Activo":"Inactivo"}
              </button>
              <button onClick={()=>{if(window.confirm("¿Eliminar este usuario?"))onDeleteProfile(u.id)}} title="Eliminar" style={{ background:C.danger+"22", border:"none", borderRadius:8, cursor:"pointer", color:C.danger, padding:"6px 8px" }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h10M12 6V14a1 1 0 01-1 1H5a1 1 0 01-1-1V6M6 6V4a1 1 0 011-1h2a1 1 0 011 1v2"/></svg>
              </button>
            </div>

            <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:14 }}>
              {/* Modo de vista */}
              <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                <span style={{ fontSize:11, color:C.muted, fontWeight:600, minWidth:70 }}>Vista:</span>
                <div style={{ display:"inline-flex", borderRadius:16, background:C.bg, padding:2 }}>
                  <button onClick={()=>onUpdateProfile(u.id,{view_mode:"simple",can_toggle_view:false})} style={{ padding:"4px 12px", borderRadius:14, border:"none", cursor:"pointer", fontSize:10, fontWeight:600, background:(u.view_mode||"completo")==="simple"&&!u.can_toggle_view?C.yellow:C.bg, color:(u.view_mode||"completo")==="simple"&&!u.can_toggle_view?"#fff":C.muted, transition:"all .2s" }}>Simple</button>
                  <button onClick={()=>onUpdateProfile(u.id,{view_mode:"completo",can_toggle_view:false})} style={{ padding:"4px 12px", borderRadius:14, border:"none", cursor:"pointer", fontSize:10, fontWeight:600, background:(u.view_mode||"completo")==="completo"&&!u.can_toggle_view?C.accent:C.bg, color:(u.view_mode||"completo")==="completo"&&!u.can_toggle_view?"#fff":C.muted, transition:"all .2s" }}>Completo</button>
                  <button onClick={()=>onUpdateProfile(u.id,{can_toggle_view:true})} style={{ padding:"4px 12px", borderRadius:14, border:"none", cursor:"pointer", fontSize:10, fontWeight:600, background:u.can_toggle_view?C.purple:C.bg, color:u.can_toggle_view?"#fff":C.muted, transition:"all .2s" }}>Puede elegir</button>
                </div>
              </div>

              {/* Locales */}
              {locales.length > 0 && (
                <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                  <span style={{ fontSize:11, color:C.muted, fontWeight:600, minWidth:70 }}>Locales:</span>
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                    {locales.map(l => (
                      <button key={l} onClick={()=>togLocal(l)} style={{
                        padding:"4px 12px", borderRadius:10, border:"none", cursor:"pointer", fontSize:10, fontWeight:600,
                        background:userLocals.includes(l)?C.orange+"33":C.border,
                        color:userLocals.includes(l)?C.orange:C.muted,
                      }}>{l}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Permisos - grid visual con config expandible */}
              <div>
                <span style={{ fontSize:11, color:C.muted, fontWeight:600 }}>Accesos:</span>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(100px, 1fr))", gap:6, marginTop:6 }}>
                  {ALL_PERMS.map(p => {
                    const active = (u.permissions||[]).includes(p)
                    const hasConfig = p === "agenda" || p === "fichas" || p === "registro"
                    const configOpen = openConfig === `${u.id}:${p}`
                    return (
                      <button key={p} onClick={()=>{
                        if (!active) { togPerm(u.id,p); if(hasConfig) setOpenConfig(`${u.id}:${p}`) }
                        else if (hasConfig && active) setOpenConfig(configOpen?null:`${u.id}:${p}`)
                        else togPerm(u.id,p)
                      }} style={{
                        padding:"8px 6px", borderRadius:10, border:`1px solid ${configOpen?C.accent:active?C.accent+"44":C.border}`, cursor:"pointer",
                        background:active?C.accent+"15":"transparent", display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                        transition:"all .15s", position:"relative",
                      }}>
                        <svg width="16" height="16" fill="none" stroke={active?C.accent:C.muted} strokeWidth="2"><path d={PERM_ICONS[p]}/></svg>
                        <span style={{ fontSize:10, fontWeight:600, color:active?C.accent:C.muted }}>{PERM_LABELS[p]}</span>
                        {hasConfig && active && <svg width="8" height="8" fill="none" stroke={C.accent} strokeWidth="2" style={{ position:"absolute", top:3, right:3 }}><circle cx="4" cy="4" r="3"/></svg>}
                      </button>
                    )
                  })}
                </div>

                {/* Config panel for Agenda */}
                {openConfig === `${u.id}:agenda` && (u.permissions||[]).includes("agenda") && (
                  <div style={{ background:C.cardAlt, borderRadius:10, padding:12, marginTop:8, animation:"fadeIn .15s" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                      <span style={{ fontSize:11, color:C.accent, fontWeight:700 }}>Config. Agenda</span>
                      <button onClick={()=>setOpenConfig(null)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:14 }}>×</button>
                    </div>
                    <div style={{ display:"flex", gap:16, alignItems:"center", flexWrap:"wrap" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontSize:12, color:C.text }}>Proximos</span>
                        <input type="number" value={u.agenda_days??30} min={0} max={365}
                          onChange={e=>onUpdateProfile(u.id,{agenda_days:Math.max(0,Number(e.target.value)||0)})}
                          style={{ width:55, padding:"5px 8px", borderRadius:6, border:`1px solid ${C.border}`, background:C.inputBg, color:C.text, fontSize:13, outline:"none", textAlign:"center", fontWeight:700 }} />
                        <span style={{ fontSize:12, color:C.text }}>dias</span>
                      </div>
                      <div style={{ display:"inline-flex", borderRadius:16, background:C.bg, padding:2 }}>
                        {[["own","Sus contratos"],["all","Todo"]].map(([v,l])=>(
                          <button key={v} onClick={()=>onUpdateProfile(u.id,{agenda_scope:v})} style={{ padding:"5px 14px", borderRadius:14, border:"none", cursor:"pointer", fontSize:11, fontWeight:600, background:(u.agenda_scope||"own")===v?C.accent:C.bg, color:(u.agenda_scope||"own")===v?"#fff":C.muted, transition:"all .2s" }}>{l}</button>
                        ))}
                      </div>
                    </div>
                    {locales.length > 0 && (
                      <div style={{ marginTop:10 }}>
                        <span style={{ fontSize:11, color:C.muted }}>Locales en agenda:</span>
                        <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:4 }}>
                          {locales.map(l => (
                            <button key={l} onClick={()=>{
                              const curr = u.agenda_locales || []
                              onUpdateProfile(u.id, { agenda_locales: curr.includes(l)?curr.filter(x=>x!==l):[...curr,l] })
                            }} style={{
                              padding:"4px 10px", borderRadius:8, border:"none", cursor:"pointer", fontSize:10, fontWeight:600,
                              background:(u.agenda_locales||[]).includes(l)?C.accent+"33":C.border,
                              color:(u.agenda_locales||[]).includes(l)?C.accent:C.muted,
                            }}>{l}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Config panel for Contratera */}
                {openConfig === `${u.id}:fichas` && (u.permissions||[]).includes("fichas") && (
                  <div style={{ background:C.cardAlt, borderRadius:10, padding:12, marginTop:8, animation:"fadeIn .15s" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                      <span style={{ fontSize:11, color:C.accent, fontWeight:700 }}>Config. Contratera</span>
                      <button onClick={()=>setOpenConfig(null)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:14 }}>×</button>
                    </div>
                    <div style={{ display:"flex", gap:16, alignItems:"center", flexWrap:"wrap" }}>
                      <div style={{ display:"inline-flex", borderRadius:16, background:C.bg, padding:2 }}>
                        <span style={{ fontSize:11, color:C.muted, padding:"5px 8px" }}>Ve:</span>
                        {[["own","Solo sus fichas"],["all","Todas las fichas"]].map(([v,l])=>(
                          <button key={v} onClick={()=>onUpdateProfile(u.id,{fichas_scope:v})} style={{ padding:"5px 14px", borderRadius:14, border:"none", cursor:"pointer", fontSize:11, fontWeight:600, background:(u.fichas_scope||"own")===v?C.accent:C.bg, color:(u.fichas_scope||"own")===v?"#fff":C.muted, transition:"all .2s" }}>{l}</button>
                        ))}
                      </div>
                    </div>
                    {locales.length > 0 && (
                      <div style={{ marginTop:10 }}>
                        <span style={{ fontSize:11, color:C.muted }}>Locales visibles:</span>
                        <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:4 }}>
                          {locales.map(l => (
                            <button key={l} onClick={()=>{
                              const curr = u.fichas_locales || []
                              onUpdateProfile(u.id, { fichas_locales: curr.includes(l)?curr.filter(x=>x!==l):[...curr,l] })
                            }} style={{
                              padding:"4px 10px", borderRadius:8, border:"none", cursor:"pointer", fontSize:10, fontWeight:600,
                              background:(u.fichas_locales||[]).includes(l)?C.accent+"33":C.border,
                              color:(u.fichas_locales||[]).includes(l)?C.accent:C.muted,
                            }}>{l}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Config panel for Registro */}
                {openConfig === `${u.id}:registro` && (u.permissions||[]).includes("registro") && (
                  <div style={{ background:C.cardAlt, borderRadius:10, padding:12, marginTop:8, animation:"fadeIn .15s" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                      <span style={{ fontSize:11, color:C.accent, fontWeight:700 }}>Config. Registro</span>
                      <button onClick={()=>setOpenConfig(null)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:14 }}>×</button>
                    </div>
                    <div style={{ display:"flex", gap:16, alignItems:"center", flexWrap:"wrap" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontSize:11, color:C.muted }}>Ve registros de:</span>
                        <select value={u.client_visibility||"always"} onChange={e=>setVis(u.id,e.target.value)} style={{ padding:"4px 8px", borderRadius:6, border:`1px solid ${C.border}`, background:C.inputBg, color:C.text, fontSize:11, outline:"none" }}>
                          {VIS_OPTS.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )})}
      </div>
    </div>
  )

  // ── Main admin view ───────────────────────────────────────────────────
  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:700, marginBottom:20 }}>Panel de Administracion</h2>

      {/* Usuarios - button */}
      <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:20, marginBottom:24, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h3 style={{ fontSize:16, fontWeight:600, margin:0 }}>Gestion de Usuarios</h3>
          <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>{nonAdmins.length} empleado{nonAdmins.length!==1?"s":""} registrado{nonAdmins.length!==1?"s":""}</div>
        </div>
        <button onClick={()=>setShowUsers(true)} style={{ background:C.accent, border:"none", borderRadius:10, color:"#fff", cursor:"pointer", padding:"10px 20px", fontSize:13, fontWeight:700 }}>Gestionar usuarios</button>
      </div>

      {/* Tags de estado */}
      <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:20, marginBottom:24 }}>
        <h3 style={{ fontSize:16, fontWeight:600, marginTop:0, marginBottom:16 }}>Tags de Estado</h3>
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          <input value={nt} onChange={e=>setNt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addT()} placeholder="Nuevo estado..." style={{ ...inp, marginBottom:0, flex:1 }} />
          <button onClick={addT} style={btn}>Agregar</button>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {tags.map((t,i) => (
            <div key={t} draggable
              onDragStart={()=>setDragIdx(i)}
              onDragOver={e=>{e.preventDefault();setDragOverIdx(i)}}
              onDragEnd={()=>{
                if(dragIdx!==null && dragOverIdx!==null && dragIdx!==dragOverIdx){
                  const next=[...tags]; const [item]=next.splice(dragIdx,1); next.splice(dragOverIdx,0,item); onSetTags(next)
                }
                setDragIdx(null);setDragOverIdx(null)
              }}
              style={{
                display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:20,
                background:estadoColors[i%estadoColors.length]+"33", color:estadoColors[i%estadoColors.length],
                fontSize:13, fontWeight:600, cursor:"grab", transition:"transform .15s, opacity .15s",
                opacity:dragIdx===i?0.4:1,
                transform:dragOverIdx===i&&dragIdx!==i?"translateX(8px)":"none",
                border:dragOverIdx===i&&dragIdx!==i?`2px dashed ${C.accent}`:"2px solid transparent",
              }}>
              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity:0.4 }}><path d="M1 3h8M1 7h8"/></svg>
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
              onChange={e => { const v = Math.max(1, Math.min(200, Number(e.target.value) || 1)); onSetUploadCfg({ ...uploadCfg, maxMB: v }) }}
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
        <div style={{ marginTop:16 }}>
          <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.muted, marginBottom:6 }}>Dias de papelera</label>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <input type="number" value={trashDays??10} min={1} max={90}
              onChange={e=>onSetTrashDays(Number(e.target.value)||10)}
              style={{ ...inp, marginBottom:0, width:70, textAlign:"center", fontWeight:700 }} />
            <span style={{ fontSize:12, color:C.muted }}>dias antes de eliminarse permanentemente</span>
          </div>
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
