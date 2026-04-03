import { useState } from "react"
import { C, estadoColors, ADMIN_EMAIL } from "../lib/colors"
import { inp, btn, td } from "./shared"

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

      {/* Usuarios */}
      <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:20, marginBottom:24 }}>
        <h3 style={{ fontSize:16, fontWeight:600, marginTop:0, marginBottom:16 }}>Gestión de Usuarios</h3>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background:C.cardAlt }}>
                {["Nombre","Correo","Estado","Ver Clientes","Permisos","Acciones"].map(h=>
                  <th key={h} style={{ padding:10, textAlign:"left", fontWeight:600, color:C.muted, fontSize:12, borderBottom:`1px solid ${C.border}` }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {!nonAdmins.length && (
                <tr><td colSpan={6} style={{ padding:30, textAlign:"center", color:C.muted }}>No hay usuarios.</td></tr>
              )}
              {nonAdmins.map(u => (
                <tr key={u.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <td style={td}>{u.name}</td>
                  <td style={td}>{u.email}</td>
                  <td style={td}>
                    <button onClick={()=>togActive(u.id)} style={{ padding:"4px 14px", borderRadius:20, border:"none", cursor:"pointer", fontSize:12, fontWeight:600, background:u.active?C.green:C.red, color:"#fff" }}>
                      {u.active?"Activo":"Inactivo"}
                    </button>
                  </td>
                  <td style={td}>
                    <select value={u.client_visibility||"always"} onChange={e=>setVis(u.id,e.target.value)} style={{ padding:"4px 8px", borderRadius:6, border:`1px solid ${C.border}`, background:C.inputBg, color:C.text, fontSize:11, outline:"none", minWidth:90 }}>
                      {VIS_OPTS.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td style={td}>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {ALL_PERMS.map(p => (
                        <button key={p} onClick={()=>togPerm(u.id,p)} style={{
                          padding:"3px 10px", borderRadius:12, border:"none", cursor:"pointer", fontSize:11, fontWeight:600,
                          background:(u.permissions||[]).includes(p)?C.accent+"33":C.border,
                          color:(u.permissions||[]).includes(p)?C.accent:C.muted,
                        }}>{p}</button>
                      ))}
                    </div>
                  </td>
                  <td style={td}>
                    <button onClick={()=>{if(window.confirm("¿Eliminar este usuario permanentemente?"))onDeleteProfile(u.id)}} style={{ background:"none", border:"none", cursor:"pointer", color:C.danger, padding:4 }}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h10M12 6V14a1 1 0 01-1 1H5a1 1 0 01-1-1V6M6 6V4a1 1 0 011-1h2a1 1 0 011 1v2"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
