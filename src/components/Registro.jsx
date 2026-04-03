import { useState, useEffect, useRef } from "react"
import * as XLSX from "xlsx"
import { C, estadoColors } from "../lib/colors"
import { today, nowTime, genCode, canChangeTipo } from "../lib/helpers"
import { Bdg, DInput, lbl, inp, mi, sel, btn, td, ib } from "./shared"

function getBg(val, map) { return map[val] || C.border }

export default function Registro({
  regs, user, adm, tags, photos, clients, locales, users,
  navRegId, navRegDate, clearNavReg,
  onAddReg, onUpdateReg, onUploadRegPhoto, onHardDeleteReg, onAddClient, onAddContratoArchivo, onUpdateContrato, goToClient,
}) {
  const [date,      setDate]      = useState(today())
  const [viewUser,  setViewUser_] = useState(() => { if (!adm) return user.id; try { return localStorage.getItem("reg_viewUser") || null } catch { return null } })
  const setViewUser = (v) => { setViewUser_(v); try { if (v) localStorage.setItem("reg_viewUser", v); else localStorage.removeItem("reg_viewUser") } catch {} }
  const [selLocal,  setSelLocal]  = useState(locales[0] || "")
  const [dateRange, setDateRange] = useState("dia")
  const [contractUpId, setContractUpId] = useState(null)
  const [contractFiles, setContractFiles] = useState(null) // { regId, files[] }
  const [contractUploading, setContractUploading] = useState(new Set())
  const [previewRegId, setPreviewRegId] = useState(null)
  const [viewFile, setViewFile] = useState(null)
  const [selectedRow, setSelectedRow] = useState(null)
  const cRef = useRef(null)

  useEffect(() => {
    if (navRegId) {
      setViewUser(navRegId)
      if (navRegDate) setDate(navRegDate)
      clearNavReg()
    }
  }, [navRegId])

  useEffect(() => {
    if (locales.length && !locales.includes(selLocal)) setSelLocal(locales[0])
  }, [locales])

  const toD  = d => { const p=d.split("/"); return `${p[2]}-${p[1]}-${p[0]}` }
  const fromD= d => { const p=d.split("-"); return `${p[2]}/${p[1]}/${p[0]}` }
  const shift= n => { const p=date.split("/"); const d=new Date(+p[2],+p[1]-1,+p[0]); d.setDate(d.getDate()+n); setDate(`${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`) }

  const add = async () => {
    await onAddReg({ fecha:today(), user_id:user.id, empleado:user.name, local:selLocal, hora:nowTime(), foto:"", canal:"F", sexo:"", edad:"", pirana:"", estado:"", observaciones:"" })
    if (adm && date !== today()) setDate(today())
  }

  const upd = (id, field, val) => onUpdateReg(id, { [field]: val })

  const del = (id) => onUpdateReg(id, { deleted:true, deleted_by:user.name, deleted_at:new Date().toISOString() })
  const restore = (id) => onUpdateReg(id, { deleted:false, deleted_by:null, deleted_at:null })
  const hardDel = (id) => { if (window.confirm("¿Eliminar este registro permanentemente?")) onHardDeleteReg(id) }

  // Files picked — if ficha exists, upload directly. If not, ask tipo first.
  const onContractFile = (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ""
    if (!files.length || !contractUpId) return
    const regId = contractUpId
    setContractUpId(null)
    const linked = clients.find(c => (c.reg_ids||[]).includes(regId))
    if (linked) {
      // Already has ficha — upload directly, no tipo modal needed
      doUpload(regId, files, null, linked)
    } else {
      // No ficha — ask tipo first
      setContractFiles({ regId, files })
    }
  }

  // User picks proforma/contrato from modal (only for new fichas)
  const onContractTipo = (tipo) => {
    if (!contractFiles) return
    const { regId, files } = contractFiles
    setContractFiles(null)
    doUpload(regId, files, tipo, null)
  }

  // Actual upload logic
  const doUpload = async (regId, files, tipo, existingClient) => {
    setContractUploading(prev => new Set(prev).add(regId))
    try {
      let clientId, contratoId
      if (existingClient) {
        clientId = existingClient.id
        contratoId = (existingClient.contratos||[]).slice(-1)[0]?.id
      } else {
        const nc = await onAddClient(
          { code: genCode(), reg_ids: [regId], created_by: user.id, created_by_name: user.name, nombre: "", dni: "", phones: [], direccion: "", referencia: "" },
          { tipo, estado: "activo" }
        )
        clientId = nc.id
        contratoId = nc.contratos?.[0]?.id
      }
      if (clientId && contratoId) {
        await Promise.all(files.map(f => onAddContratoArchivo(clientId, contratoId, f)))
      }
      onUpdateReg(regId, { foto: "SI" })
    } catch (err) { alert("Error subiendo archivo: " + err.message) }
    finally { setContractUploading(prev => { const s = new Set(prev); s.delete(regId); return s }) }
  }

  // ── ADMIN: employee grid ──────────────────────────────────────────────────
  if (adm && viewUser === null) {
    const empMap = {}
    regs.forEach(r => {
      if (!empMap[r.user_id]) empMap[r.user_id] = { id:r.user_id, name:r.empleado, total:0, todayCount:0 }
      empMap[r.user_id].total++
      if (r.fecha === today()) empMap[r.user_id].todayCount++
    })
    const employees = Object.values(empMap)
    const todayTotal = regs.filter(r => r.fecha===today()).length

    return (
      <div>
        <h2 style={{ margin:"0 0 6px", fontSize:20, fontWeight:700 }}>Registro de Clientes</h2>
        <p style={{ color:C.muted, fontSize:13, margin:"0 0 24px" }}>Selecciona un empleado para ver sus registros.</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:16 }}>
          {/* General */}
          <button onClick={()=>setViewUser("__all__")} style={{ background:`linear-gradient(135deg,${C.accent}22,${C.accent}08)`, border:`2px solid ${C.accent}44`, borderRadius:16, padding:"24px 20px", cursor:"pointer", textAlign:"left", transition:"all .2s" }}
            onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent}
            onMouseLeave={e=>e.currentTarget.style.borderColor=C.accent+"44"}>
            <div style={{ width:44,height:44,background:C.accent+"33",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14 }}>
              <svg width="22" height="22" fill="none" stroke={C.accent} strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            </div>
            <div style={{ fontSize:16,fontWeight:700,color:C.text,marginBottom:4 }}>General</div>
            <div style={{ fontSize:12,color:C.muted }}>Todos los empleados</div>
            <div style={{ display:"flex",gap:16,marginTop:12 }}>
              <div><div style={{ fontSize:20,fontWeight:700,color:C.accent }}>{todayTotal}</div><div style={{ fontSize:10,color:C.muted }}>Hoy</div></div>
              <div><div style={{ fontSize:20,fontWeight:700,color:C.muted }}>{regs.length}</div><div style={{ fontSize:10,color:C.muted }}>Total</div></div>
            </div>
          </button>
          {employees.map((emp,idx) => {
            const cc = [C.blue,C.teal,C.purple,C.pink,C.orange,C.cyan,C.yellow,C.green][idx%8]
            const ini = emp.name.split(" ").map(w=>w[0]?.toUpperCase()).join("").slice(0,2)
            return (
              <button key={emp.id} onClick={()=>setViewUser(emp.id)} style={{ background:C.card, border:`2px solid ${C.border}`, borderRadius:16, padding:"24px 20px", cursor:"pointer", textAlign:"left", transition:"all .2s" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=cc}
                onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                <div style={{ width:44,height:44,background:cc+"33",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14,fontSize:16,fontWeight:700,color:cc }}>{ini}</div>
                <div style={{ fontSize:16,fontWeight:700,color:C.text,marginBottom:4 }}>{emp.name}</div>
                <div style={{ fontSize:12,color:C.muted }}>Empleado</div>
                <div style={{ display:"flex",gap:16,marginTop:12 }}>
                  <div><div style={{ fontSize:20,fontWeight:700,color:cc }}>{emp.todayCount}</div><div style={{ fontSize:10,color:C.muted }}>Hoy</div></div>
                  <div><div style={{ fontSize:20,fontWeight:700,color:C.muted }}>{emp.total}</div><div style={{ fontSize:10,color:C.muted }}>Total</div></div>
                </div>
              </button>
            )
          })}
          {!employees.length && <div style={{ gridColumn:"1/-1", background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:40, textAlign:"center", color:C.muted }}>No hay empleados con registros aún.</div>}
        </div>
      </div>
    )
  }

  // ── Table view ────────────────────────────────────────────────────────────
  const filterByDate = (r) => {
    if (!adm || dateRange === "dia") return r.fecha === date
    if (dateRange === "todo") return true
    try {
      const p = r.fecha.split("/")
      const rd = new Date(+p[2], +p[1]-1, +p[0])
      const pd = date.split("/")
      const cd = new Date(+pd[2], +pd[1]-1, +pd[0])
      const diff = (cd - rd) / 86400000
      if (dateRange === "semana") return diff >= 0 && diff < 7
      if (dateRange === "mes")    return p[1]===pd[1] && p[2]===pd[2]
      if (dateRange === "año")    return p[2]===pd[2]
    } catch { return true }
    return true
  }

  const dateRegs = regs.filter(filterByDate)
  const allRows  = adm
    ? (viewUser==="__all__" ? dateRegs : dateRegs.filter(r=>r.user_id===viewUser))
    : dateRegs.filter(r=>r.user_id===user.id && !r.deleted)
  const rows  = allRows
  const total = rows.filter(r=>!r.deleted).length
  const viewName = adm
    ? (viewUser==="__all__" ? "General — Todos" : (rows[0]?.empleado || users.find(u=>u.id===viewUser)?.name || "Empleado"))
    : user.name

  const exportExcel = () => {
    try {
      const data = rows.filter(r=>!r.deleted).map((r,i) => ({
        "#": i+1, Fecha:r.fecha, Empleado:r.empleado, Local:r.local||"", "Hora Ingreso":r.hora||"",
        Foto:r.foto||"", Canal:r.canal==="W"?"WhatsApp":r.canal==="F"?"Físico":"",
        Sexo:r.sexo==="H"?"Hombre":r.sexo==="M"?"Mujer":"", Edad:r.edad||"",
        "Piraña":r.pirana||"", Estado:r.estado||"", Observaciones:r.observaciones||"",
      }))
      if (!data.length) { alert("No hay registros para exportar"); return }
      const ws = XLSX.utils.json_to_sheet(data)
      ws["!cols"] = [4,12,15,10,12,6,10,8,6,8,14,25].map(w=>({wch:w}))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Registros")
      const buf  = XLSX.write(wb, { bookType:"xlsx", type:"array" })
      const blob = new Blob([buf], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      const rn   = dateRange==="todo"?"Todo":dateRange==="año"?date.split("/")[2]:dateRange==="mes"?date.split("/")[1]+"-"+date.split("/")[2]:dateRange==="semana"?"Sem-"+date.replace(/\//g,"-"):date.replace(/\//g,"-")
      a.href = url; a.download = `Registros_${rn}.xlsx`
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch(e) { alert("Error al exportar: " + e.message) }
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {adm && (
            <button onClick={()=>setViewUser(null)} style={{ background:C.inputBg, border:`1px solid ${C.border}`, color:C.accent, borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>Volver
            </button>
          )}
          <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>{viewName}</h2>
          {adm && <span style={{ fontSize:12, color:C.muted }}>{rows.length} registros</span>}
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
          {adm ? (
            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
              <div style={{ display:"flex", gap:0 }}>
                {[["dia","Día"],["semana","Semana"],["mes","Mes"],["año","Año"],["todo","Todo"]].map(([v,l]) => (
                  <button key={v} onClick={()=>setDateRange(v)} style={{
                    padding:"6px 10px", border:`1px solid ${C.border}`,
                    background:dateRange===v?C.accent+"22":C.inputBg,
                    color:dateRange===v?C.accent:C.muted, cursor:"pointer", fontSize:11, fontWeight:600,
                    borderRadius:v==="dia"?"8px 0 0 8px":v==="todo"?"0 8px 8px 0":"0",
                    borderLeft:v==="dia"?undefined:"none",
                  }}>{l}</button>
                ))}
              </div>
              {dateRange !== "todo" && (
                <div style={{ display:"flex", alignItems:"center", gap:0 }}>
                  <button onClick={()=>shift(-1)} style={{ background:C.inputBg, border:`1px solid ${C.border}`, color:C.text, borderRadius:"8px 0 0 8px", padding:"6px 8px", cursor:"pointer", fontSize:14, lineHeight:1 }}>‹</button>
                  <input type="date" value={toD(date)} onChange={e=>setDate(fromD(e.target.value))} style={{ background:C.inputBg, border:`1px solid ${C.border}`, borderLeft:"none", borderRight:"none", color:C.text, padding:"6px 10px", fontSize:12, outline:"none" }} />
                  <button onClick={()=>shift(1)}  style={{ background:C.inputBg, border:`1px solid ${C.border}`, color:C.text, borderRadius:"0 8px 8px 0", padding:"6px 8px", cursor:"pointer", fontSize:14, lineHeight:1 }}>›</button>
                </div>
              )}
              {date !== today() && dateRange !== "todo" && (
                <button onClick={()=>setDate(today())} style={{ background:C.accent+"22", border:`1px solid ${C.accent}44`, color:C.accent, borderRadius:8, padding:"6px 10px", cursor:"pointer", fontSize:11, fontWeight:600 }}>Hoy</button>
              )}
            </div>
          ) : (
            <div style={{ background:C.inputBg, padding:"8px 14px", borderRadius:8, border:`1px solid ${C.border}`, color:C.text, fontSize:13, display:"flex", alignItems:"center", gap:6 }}>
              <svg width="14" height="14" fill="none" stroke={C.muted} strokeWidth="2"><rect x="3" y="4" width="14" height="14" rx="2"/><path d="M16 2v4M8 2v4M3 10h14"/></svg>
              {date}
            </div>
          )}
          <div style={{ display:"flex", alignItems:"center", gap:6, background:C.orange+"22", border:`1px solid ${C.orange}44`, borderRadius:8, padding:"6px 12px" }}>
            <svg width="14" height="14" fill="none" stroke={C.orange} strokeWidth="2"><path d="M3 9l2-7h6l2 7M3 9h12M3 9l1 4h10l1-4"/></svg>
            <select value={selLocal} onChange={e=>setSelLocal(e.target.value)} style={{ background:"transparent", border:"none", color:C.orange, fontSize:13, fontWeight:600, cursor:"pointer", outline:"none" }}>
              {locales.map(l => <option key={l} value={l} style={{ background:C.card, color:C.text }}>{l}</option>)}
            </select>
          </div>
          <button onClick={add} style={btn}>+ Agregar Registro</button>
          {adm && (
            <button onClick={exportExcel} style={{ background:C.green+"22", border:`1px solid ${C.green}44`, borderRadius:8, color:C.green, cursor:"pointer", padding:"6px 12px", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v10H4V3h5l3 3z"/><path d="M9 3v3h3"/></svg>
              Excel
            </button>
          )}
        </div>
      </div>

      <input ref={cRef} type="file" accept="image/jpeg,image/png,application/pdf,video/mp4,video/quicktime" multiple style={{ display:"none" }} onChange={onContractFile} />

      {/* Mini modal: Proforma o Contrato? */}
      {contractFiles && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={()=>setContractFiles(null)}>
          <div onClick={e=>e.stopPropagation()} style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, padding:28, textAlign:"center", maxWidth:360 }}>
            <h3 style={{ margin:"0 0 6px", fontSize:16, fontWeight:700, color:C.text }}>Tipo de documento</h3>
            <p style={{ margin:"0 0 6px", fontSize:13, color:C.muted }}>{contractFiles.files.length} archivo{contractFiles.files.length>1?"s":""} seleccionado{contractFiles.files.length>1?"s":""}</p>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"center", marginBottom:16 }}>
              {contractFiles.files.map((f,i) => (
                <span key={i} style={{ fontSize:10, color:C.accent, background:C.accent+"15", padding:"3px 8px", borderRadius:6, maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.name}</span>
              ))}
            </div>
            <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
              <button onClick={()=>onContractTipo("proforma")} style={{ padding:"10px 24px", borderRadius:10, border:"none", cursor:"pointer", fontSize:13, fontWeight:700, background:C.yellow+"33", color:C.yellow }}>Proforma</button>
              <button onClick={()=>onContractTipo("contrato")} style={{ padding:"10px 24px", borderRadius:10, border:"none", cursor:"pointer", fontSize:13, fontWeight:700, background:C.green+"33", color:C.green }}>Contrato</button>
            </div>
            <button onClick={()=>setContractFiles(null)} style={{ marginTop:14, background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:12 }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* File preview modal */}
      {previewRegId && (() => {
        const linked = clients.find(c => (c.reg_ids||[]).includes(previewRegId))
        if (!linked) return null
        const lastCt = (linked.contratos||[]).slice(-1)[0]
        const archivos = (linked.contratos||[]).flatMap(ct => ct.contrato_archivos||[])
        if (!archivos.length) return null
        const tipo = lastCt?.tipo || "proforma"
        const toggleTipo = (newTipo) => {
          if (!lastCt || tipo === newTipo) return
          if (!canChangeTipo()) { alert("Limite de cambios alcanzado (3 por hora)"); return }
          onUpdateContrato(linked.id, lastCt.id, { tipo: newTipo })
        }
        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setPreviewRegId(null)}>
            <div onClick={e=>e.stopPropagation()} style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, padding:24, maxWidth:440, width:"100%" }}>
              {/* Header with tipo toggle */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:C.text }}>{archivos.length} archivo{archivos.length>1?"s":""}</h3>
                  <div style={{ display:"inline-flex", borderRadius:20, background:C.bg, padding:2 }}>
                    <button onClick={()=>toggleTipo("proforma")} style={{ padding:"4px 12px", borderRadius:18, border:"none", cursor:"pointer", fontSize:10, fontWeight:700, background:tipo!=="contrato"?C.yellow:C.bg, color:tipo!=="contrato"?"#fff":C.muted, transition:"all .2s" }}>Proforma</button>
                    <button onClick={()=>toggleTipo("contrato")} style={{ padding:"4px 12px", borderRadius:18, border:"none", cursor:"pointer", fontSize:10, fontWeight:700, background:tipo==="contrato"?C.green:C.bg, color:tipo==="contrato"?"#fff":C.muted, transition:"all .2s" }}>Contrato</button>
                  </div>
                </div>
                <button onClick={()=>setPreviewRegId(null)} style={{ background:C.danger, border:"none", borderRadius:"50%", color:"#fff", width:26, height:26, cursor:"pointer", fontSize:14, fontWeight:700 }}>x</button>
              </div>
              {/* File grid */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(90px, 1fr))", gap:10 }}>
                {archivos.map(ar => (
                  <div key={ar.id} onClick={()=>{setPreviewRegId(null);setViewFile(ar)}} style={{ borderRadius:10, overflow:"hidden", border:`1px solid ${C.border}`, cursor:"pointer", aspectRatio:"1", position:"relative" }}>
                    {ar.tipo==="image" || ar.tipo?.startsWith("image")
                      ? <img src={ar.url} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} />
                      : ar.tipo==="video" || ar.tipo?.startsWith("video")
                      ? <div style={{ width:"100%",height:"100%",background:C.cardAlt,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4 }}><svg width="28" height="28" fill="none" stroke={C.purple} strokeWidth="2"><path d="M5 3l14 9-14 9V3z"/></svg><span style={{ fontSize:9,color:C.muted }}>Video</span></div>
                      : <div style={{ width:"100%",height:"100%",background:C.cardAlt,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4 }}><svg width="24" height="24" fill="none" stroke={C.red} strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg><span style={{ fontSize:9,color:C.muted }}>PDF</span></div>}
                    <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"rgba(0,0,0,.6)", padding:"3px 6px", fontSize:9, color:"#fff", textOverflow:"ellipsis", overflow:"hidden", whiteSpace:"nowrap" }}>{ar.nombre||"Archivo"}</div>
                  </div>
                ))}
              </div>
              {/* Add more button */}
              <button onClick={()=>{setPreviewRegId(null);setContractUpId(previewRegId);cRef.current?.click()}} style={{ marginTop:12, width:"100%", padding:"8px", borderRadius:8, border:`1px dashed ${C.border}`, background:"transparent", color:C.accent, cursor:"pointer", fontSize:12, fontWeight:600 }}>+ Subir mas fotos</button>
            </div>
          </div>
        )
      })()}

      {/* Fullscreen file viewer */}
      {viewFile && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.88)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }} onClick={()=>setViewFile(null)}>
          <div onClick={e=>e.stopPropagation()} style={{ maxWidth:"92vw", maxHeight:"92vh", position:"relative" }}>
            <button onClick={()=>setViewFile(null)} style={{ position:"absolute", top:-14, right:-14, background:C.danger, border:"none", borderRadius:"50%", color:"#fff", width:32, height:32, cursor:"pointer", fontSize:18, fontWeight:700, zIndex:1 }}>x</button>
            {(viewFile.tipo==="image"||viewFile.tipo?.startsWith("image")) && <img src={viewFile.url} alt="" style={{ maxWidth:"90vw", maxHeight:"85vh", borderRadius:10, objectFit:"contain" }} />}
            {(viewFile.tipo==="video"||viewFile.tipo?.startsWith("video")) && <video src={viewFile.url} controls autoPlay style={{ maxWidth:"90vw", maxHeight:"85vh", borderRadius:10 }} />}
            {viewFile.tipo==="pdf"||viewFile.tipo==="application/pdf" ? <embed src={viewFile.url} type="application/pdf" style={{ width:"85vw", height:"85vh", borderRadius:10 }} /> : null}
            <div style={{ textAlign:"center", marginTop:8, color:"#fff", fontSize:12 }}>{viewFile.nombre||"Archivo"}</div>
          </div>
        </div>
      )}

      <div style={{ overflowX:"auto", borderRadius:12, border:`1px solid ${C.border}` }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:1300, fontSize:13 }}>
          <thead>
            <tr style={{ background:C.cardAlt }}>
              {["#","Fecha","Empleado","Local","Hora Ingreso","Archivo","Canal","Sexo","Edad","Piraña","Estado","Observaciones","Ficha","Acciones"].map(h =>
                <th key={h} style={{ padding:"12px 10px", textAlign:"left", fontWeight:600, color:C.muted, fontSize:12, borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={14} style={{ padding:40, textAlign:"center", color:C.muted }}>No hay registros. Haz clic en "+ Agregar Registro".</td></tr>
            )}
            {rows.map((r, i) => {
              const isDel   = r.deleted
              const nonDelRows = rows.filter(x => !x.deleted)
              const nonDelIdx = isDel ? -1 : nonDelRows.indexOf(r)
              const isLast = !isDel && nonDelIdx === nonDelRows.length - 1
              const isSel = selectedRow === r.id
              const canEdit = !isDel && (adm || nonDelIdx >= total - 3)
              const lock    = !canEdit ? { opacity:.45, pointerEvents:"none" } : {}
              const cc = getBg(r.canal,  { W:C.teal, F:C.purple })
              const sc = getBg(r.sexo,   { H:C.blue, M:C.pink })
              const pc = getBg(r.pirana, { S:C.red, P:C.yellow, N:C.muted })
              const ei = tags.indexOf(r.estado)
              const ec = ei >= 0 ? estadoColors[ei%estadoColors.length] : C.border
              const rowBg = isDel ? C.red+"0a" : isSel ? C.accent+"12" : isLast ? C.accent+"08" : i%2 ? C.cardAlt+"44" : "transparent"

              return (
                <tr key={r.id} onClick={()=>setSelectedRow(isSel?null:r.id)} style={{ borderBottom:`1px solid ${C.border}`, background:rowBg, animation:"fadeIn .2s", cursor:"pointer", borderLeft:isLast?`3px solid ${C.accent}`:"3px solid transparent", transition:"background .15s" }}>
                  <td style={td}><span style={{ color:C.muted, ...(isDel?{textDecoration:"line-through"}:{}) }}>{i+1}</span></td>
                  <td style={{ ...td, ...(isDel?{opacity:.4}:{}) }}>{r.fecha}</td>
                  <td style={{ ...td, ...(isDel?{opacity:.5}:{}) }}>
                    {r.empleado}
                    {isDel && <div style={{ fontSize:9, color:C.red, fontWeight:600, marginTop:2 }}>Borrado por {r.deleted_by}</div>}
                  </td>
                  <td style={td}>
                    <Bdg c={r.local ? C.orange : C.border}>
                      <select value={r.local||""} onChange={e=>upd(r.id,"local",e.target.value)} style={sel}>
                        <option value="">--</option>
                        {locales.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </Bdg>
                  </td>
                  <td style={td}>
                    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                      <input value={r.hora} onChange={e=>upd(r.id,"hora",e.target.value)} style={{ ...mi, width:80 }} placeholder="--:--" />
                      <svg width="14" height="14" fill="none" stroke={C.muted} strokeWidth="2"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5V7l1.5 1.5"/></svg>
                    </div>
                  </td>
                  <td style={td}>{(() => {
                    const linked = clients.find(c => (c.reg_ids||[]).includes(r.id))
                    const archivos = linked ? (linked.contratos||[]).flatMap(ct => ct.contrato_archivos||[]) : []
                    const n = archivos.length
                    const isUp = contractUploading.has(r.id)
                    return (
                      <div style={{ display:"flex", alignItems:"center", gap:5, justifyContent:"center" }}>
                        {isUp
                          ? <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10, color:C.accent }}><span style={{ width:12,height:12,border:"2px solid currentColor",borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",display:"inline-block" }} />Subiendo...</span>
                          : canEdit && <button onClick={()=>{setContractUpId(r.id);cRef.current?.click()}} title="Subir foto" style={{ background:n?C.green+"15":C.accent+"12", border:`1px solid ${n?C.green+"44":C.accent+"33"}`, borderRadius:8, cursor:"pointer", padding:"3px 10px", display:"flex", alignItems:"center", gap:5, fontSize:11, fontWeight:600, color:n?C.green:C.accent }}>
                              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="10" height="10" rx="2"/><circle cx="5" cy="5" r="1"/><path d="M12 9l-2.5-2.5-6 6"/></svg>
                              Subir foto {n > 0 && <span style={{ background:C.green, color:"#fff", borderRadius:10, padding:"0 5px", fontSize:10, fontWeight:700, lineHeight:"16px" }}>{n}</span>}
                            </button>
                        }
                        {n > 0 && <button onClick={()=>setPreviewRegId(r.id)} title="Ver archivos" style={{ background:C.teal+"15", border:`1px solid ${C.teal}33`, borderRadius:8, cursor:"pointer", padding:"3px 6px", display:"flex", alignItems:"center" }}>
                          <svg width="14" height="14" fill="none" stroke={C.teal} strokeWidth="2"><path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z"/><circle cx="7" cy="7" r="1.5"/></svg>
                        </button>}
                      </div>
                    )
                  })()}</td>
                  <td style={td}><div style={lock}><Bdg c={cc}><select value={r.canal} onChange={e=>upd(r.id,"canal",e.target.value)} style={sel} disabled={!canEdit}><option value="">--</option><option value="W">WhatsApp</option><option value="F">Físico</option></select></Bdg></div></td>
                  <td style={td}><div style={lock}><Bdg c={sc}><select value={r.sexo}  onChange={e=>upd(r.id,"sexo",e.target.value)}  style={sel} disabled={!canEdit}><option value="">--</option><option value="H">H</option><option value="M">M</option></select></Bdg></div></td>
                  <td style={td}><div style={lock}><DInput type="number" value={r.edad} onCommit={v=>upd(r.id,"edad",v)} style={{ ...mi, width:60 }} placeholder="--" disabled={!canEdit}/></div></td>
                  <td style={td}><div style={lock}><Bdg c={pc}><select value={r.pirana} onChange={e=>upd(r.id,"pirana",e.target.value)} style={sel} disabled={!canEdit}><option value="">--</option><option value="S">SI</option><option value="N">NO</option><option value="P">P</option></select></Bdg></div></td>
                  <td style={td}><div style={lock}><Bdg c={ec}><select value={r.estado} onChange={e=>upd(r.id,"estado",e.target.value)} style={sel} disabled={!canEdit}><option value="">--</option>{tags.map(t=><option key={t} value={t}>{t}</option>)}</select></Bdg></div></td>
                  <td style={td}><div style={lock}><DInput value={r.observaciones} onCommit={v=>upd(r.id,"observaciones",v)} style={{ ...mi, width:120 }} placeholder="..." disabled={!canEdit}/></div></td>
                  {/* Ficha */}
                  <td style={td}>{(() => {
                    const linked = clients.find(c => (c.reg_ids||[]).includes(r.id))
                    return linked
                      ? <div style={{ display:"flex", gap:4, alignItems:"center", flexWrap:"wrap" }}>
                          <button onClick={()=>goToClient(linked.id)} style={{ background:C.green+"22", border:"none", borderRadius:6, color:C.green, cursor:"pointer", padding:"2px 8px", fontSize:11, fontWeight:700 }}>→ {linked.code||"Ver ficha"}</button>
                          {(() => { const lct=(linked.contratos||[]).slice(-1)[0]; return lct?.tipo?<span style={{ fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:4,background:lct.tipo==="contrato"?C.green+"22":C.yellow+"22",color:lct.tipo==="contrato"?C.green:C.yellow }}>{lct.tipo==="contrato"?"C":"P"}</span>:null })()}
                        </div>
                      : <button onClick={async()=>{
                          const nc = await onAddClient({ code:genCode(), reg_ids:[r.id], created_by:user.id, created_by_name:user.name, nombre:"", dni:"", phones:[], direccion:"", referencia:"" }, { reg_id:r.id })
                          goToClient(nc.id)
                        }} style={{ background:C.purple+"22", border:`1px solid ${C.purple}44`, borderRadius:6, color:C.purple, cursor:"pointer", padding:"2px 8px", fontSize:12, fontWeight:700 }}>+ Ficha</button>
                  })()}</td>
                  {/* Acciones */}
                  <td style={td}>
                    {isDel && adm ? (
                      <div style={{ display:"flex", gap:4 }}>
                        <button onClick={()=>restore(r.id)} title="Restaurar" style={{ background:C.green+"22", border:"none", borderRadius:4, color:C.green, cursor:"pointer", padding:"2px 6px", fontSize:10, fontWeight:700 }}>↩</button>
                        <button onClick={()=>hardDel(r.id)} title="Eliminar permanente" style={{ background:"none", border:"none", cursor:"pointer", color:C.danger, padding:2 }}>
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h10M12 6V14a1 1 0 01-1 1H5a1 1 0 01-1-1V6M6 6V4a1 1 0 011-1h2a1 1 0 011 1v2"/></svg>
                        </button>
                      </div>
                    ) : isDel ? (
                      <span style={{ fontSize:10, color:C.red }}>Borrado</span>
                    ) : (
                      <button onClick={()=>del(r.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.danger, padding:4 }}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h10M12 6V14a1 1 0 01-1 1H5a1 1 0 01-1-1V6M6 6V4a1 1 0 011-1h2a1 1 0 011 1v2"/></svg>
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!adm && total > 3 && (
        <div style={{ marginTop:10, fontSize:12, color:C.muted, display:"flex", alignItems:"center", gap:6 }}>
          <svg width="14" height="14" fill="none" stroke={C.yellow} strokeWidth="2"><circle cx="7" cy="7" r="5.5"/><path d="M7 5v3M7 10h.01"/></svg>
          Solo puedes editar los datos de las últimas 3 filas.
        </div>
      )}
    </div>
  )
}
