import { useState, useEffect, useRef, memo } from "react"
import * as XLSX from "xlsx"
import { C, estadoColors } from "../lib/colors"
import { today, nowTime, genCode, canChangeTipo } from "../lib/helpers"
import { LIMITS } from "../lib/constants"
import { Bdg, DInput, TagSelect, lbl, inp, mi, sel, btn, td, ib } from "./shared"

function getBg(val, map) { return map[val] || C.border }
const toD  = d => { const p=d.split("/"); return `${p[2]}-${p[1]}-${p[0]}` }
const fromD= d => { const p=d.split("-"); return `${p[2]}/${p[1]}/${p[0]}` }

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  const t = useRef(null)
  const copy = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopied(true)
    clearTimeout(t.current)
    t.current = setTimeout(() => setCopied(false), 1200)
  }
  useEffect(() => () => clearTimeout(t.current), [])
  return <button onClick={copy} title="Copiar codigo" style={{ background:C.cyan+"15", border:`1px solid ${C.cyan}33`, borderRadius:5, color:C.cyan, cursor:"pointer", padding:"1px 6px", fontSize:9, fontWeight:600, fontFamily:"monospace" }}>{copied?"Copiado!":text}</button>
}

function getTagColor(tag, tags) {
  if (tag === "Contrato") return C.green
  if (tag === "Proforma") return C.yellow
  const ci = tags.filter(x => x !== "Proforma" && x !== "Contrato").indexOf(tag)
  return ci >= 0 ? estadoColors[ci % estadoColors.length] : C.border
}

export default memo(function Registro({
  regs, user, adm, tags, photos, clients, locales, users,
  navRegId, navRegDate, clearNavReg,
  onAddReg, onUpdateReg, onUploadRegPhoto, onHardDeleteReg, onAddClient, onDeleteClient, onAddContratoArchivo, onDeleteContratoArchivo, onUpdateContrato, goToClient,
}) {
  const [date,      setDate]      = useState(today())
  const [viewUser,  setViewUser_] = useState(() => { if (!adm) return user.id; try { return localStorage.getItem("reg_viewUser") || null } catch { return null } })
  const setViewUser = (v) => { setViewUser_(v); try { if (v) localStorage.setItem("reg_viewUser", v); else localStorage.removeItem("reg_viewUser") } catch {} }
  const [selLocal,  setSelLocal]  = useState(locales[0] || "")
  const [dateRange, setDateRange] = useState("dia")
  const [showAll,   setShowAll]   = useState(true) // true=todo el dia, false=ultimos 3
  const [contractUpId, setContractUpId] = useState(null)
  const [contractFiles, setContractFiles] = useState(null) // { regId, files[] }
  const [contractUploading, setContractUploading] = useState(new Set())
  const [previewRegId, setPreviewRegId] = useState(null)
  const [viewFile, setViewFile] = useState(null)
  const [selectedRow, setSelectedRow] = useState(null)
  const [dragOverRow, setDragOverRow] = useState(null)
  const [errorFiles, setErrorFiles] = useState(new Set())
  const [delConfirm, setDelConfirm] = useState(null) // { regId, linked }
  const cRef = useRef(null)

  useEffect(() => {
    if (navRegId) {
      setViewUser(navRegId)
      if (navRegDate) setDate(navRegDate)
      clearNavReg()
    }
  }, [navRegId, clearNavReg])

  useEffect(() => {
    if (locales.length && !locales.includes(selLocal)) setSelLocal(locales[0])
  }, [locales])

  const shift= n => { const p=date.split("/"); const d=new Date(+p[2],+p[1]-1,+p[0]); d.setDate(d.getDate()+n); setDate(`${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`) }

  const addReg = async (canal) => {
    await onAddReg({ fecha:today(), user_id:user.id, empleado:user.name, local:selLocal, hora:nowTime(), foto:"", canal, sexo:"", edad:"", pirana:"", estado:"", observaciones:"" })
    if (adm && date !== today()) setDate(today())
  }

  const upd = (id, field, val) => onUpdateReg(id, { [field]: val })

  const delCount = useRef({ day: "", count: 0 })
  const del = (id) => {
    if (!adm) {
      const d = today()
      if (delCount.current.day !== d) delCount.current = { day: d, count: 0 }
      if (delCount.current.count >= LIMITS.DELETES_PER_DAY) { alert(`Limite de borrados alcanzado (${LIMITS.DELETES_PER_DAY} por dia)`); return }
      delCount.current.count++
    }
    onUpdateReg(id, { deleted:true, deleted_by:user.name, deleted_at:new Date().toISOString() })
  }
  const restoreCount = useRef({ day: "", count: 0 })
  const restore = (id) => {
    if (!adm) {
      const d = today()
      if (restoreCount.current.day !== d) restoreCount.current = { day: d, count: 0 }
      if (restoreCount.current.count >= LIMITS.RESTORES_PER_DAY) { alert(`Limite de restauraciones alcanzado (${LIMITS.RESTORES_PER_DAY} por dia)`); return }
      restoreCount.current.count++
    }
    onUpdateReg(id, { deleted:false, deleted_by:null, deleted_at:null })
  }
  const hardDel = (id) => {
    const linked = clients.find(c => !c.deleted_at && (c.reg_ids||[]).includes(id))
    setDelConfirm({ regId: id, linked })
  }

  // Files picked — if ficha exists, upload directly. If not, ask tipo first.
  const onContractFile = (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ""
    if (!files.length || !contractUpId) return
    const regId = contractUpId
    setContractUpId(null)
    const linked = clients.find(c => !c.deleted_at && (c.reg_ids||[]).includes(regId))
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
          { code: genCode(clients.map(c=>c.code)), reg_ids: [regId], created_by: user.id, created_by_name: user.name, nombre: "", dni: "", phones: [], direccion: "", referencia: "" },
          { tipo, estado: "activo" }
        )
        clientId = nc.id
        contratoId = nc.contratos?.[0]?.id
      }
      if (clientId && contratoId) {
        const results = await Promise.allSettled(files.map(f => onAddContratoArchivo(clientId, contratoId, f)))
        const failed = results.filter((r,i) => r.status === "rejected").map((r,i) => files[i]?.name || `archivo ${i+1}`)
        if (failed.length) alert(`Error subiendo: ${failed.join(", ")}`)
      }
      onUpdateReg(regId, { foto: "SI" })
    } catch (err) { alert("Error: " + err.message) }
    finally { setContractUploading(prev => { const s = new Set(prev); s.delete(regId); return s }) }
  }

  // Drag & drop on row
  const onRowDragOver = (e, regId) => { e.preventDefault(); e.stopPropagation(); setDragOverRow(regId) }
  const onRowDragLeave = () => setDragOverRow(null)
  const onRowDrop = (e, regId) => {
    e.preventDefault(); e.stopPropagation(); setDragOverRow(null)
    const files = Array.from(e.dataTransfer.files || []).filter(f => /^(image|video|application\/pdf)/.test(f.type))
    if (!files.length) return
    const linked = clients.find(c => !c.deleted_at && (c.reg_ids||[]).includes(regId))
    if (linked) {
      doUpload(regId, files, null, linked)
    } else {
      setContractFiles({ regId, files })
    }
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
    : dateRegs.filter(r=>r.user_id===user.id)
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
          <div style={{ display:"inline-flex", borderRadius:8, background:C.bg, padding:2, border:`1px solid ${C.border}` }}>
            <button onClick={()=>setShowAll(true)} style={{ padding:"5px 12px", borderRadius:6, border:"none", cursor:"pointer", fontSize:11, fontWeight:600, background:showAll?C.accent:C.bg, color:showAll?"#fff":C.muted, transition:"all .2s" }}>Todo el dia</button>
            <button onClick={()=>setShowAll(false)} style={{ padding:"5px 12px", borderRadius:6, border:"none", cursor:"pointer", fontSize:11, fontWeight:600, background:!showAll?C.accent:C.bg, color:!showAll?"#fff":C.muted, transition:"all .2s" }}>Ultimos 5</button>
          </div>
          <div style={{ display:"inline-flex", borderRadius:10, overflow:"hidden", border:`1px solid ${C.accent}44` }}>
            <button onClick={()=>addReg("F")} style={{ padding:"8px 16px", border:"none", cursor:"pointer", fontSize:13, fontWeight:700, background:C.accent, color:"#fff", display:"flex", alignItems:"center", gap:6 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l2-7h6l2 7M3 9h12M3 9l1 4h10l1-4"/></svg>
              + Local
            </button>
            <button onClick={()=>addReg("W")} style={{ padding:"8px 16px", border:"none", borderLeft:`1px solid rgba(255,255,255,.2)`, cursor:"pointer", fontSize:13, fontWeight:700, background:"#25D366", color:"#fff", display:"flex", alignItems:"center", gap:6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
              + WhatsApp
            </button>
          </div>
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
        const linked = clients.find(c => !c.deleted_at && (c.reg_ids||[]).includes(previewRegId))
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
        const errCount = archivos.filter(a => errorFiles.has(a.id)).length
        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.65)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={()=>setPreviewRegId(null)}>
            <div onClick={e=>e.stopPropagation()} style={{ background:C.card, borderRadius:16, border:`1px solid ${C.border}`, padding:28, maxWidth:580, width:"100%", maxHeight:"85vh", display:"flex", flexDirection:"column" }}>
              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexShrink:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                  <h3 style={{ margin:0, fontSize:17, fontWeight:700, color:C.text }}>{archivos.length} archivo{archivos.length>1?"s":""}</h3>
                  {errCount > 0 && <span style={{ fontSize:11, color:C.red, fontWeight:600 }}>{errCount} con error</span>}
                  <div style={{ display:"inline-flex", borderRadius:20, background:C.bg, padding:2 }}>
                    <button onClick={()=>toggleTipo("proforma")} style={{ padding:"5px 14px", borderRadius:18, border:"none", cursor:"pointer", fontSize:11, fontWeight:700, background:tipo!=="contrato"?C.yellow:C.bg, color:tipo!=="contrato"?"#fff":C.muted, transition:"all .2s" }}>Proforma</button>
                    <button onClick={()=>toggleTipo("contrato")} style={{ padding:"5px 14px", borderRadius:18, border:"none", cursor:"pointer", fontSize:11, fontWeight:700, background:tipo==="contrato"?C.green:C.bg, color:tipo==="contrato"?"#fff":C.muted, transition:"all .2s" }}>Contrato</button>
                  </div>
                </div>
                <button onClick={()=>setPreviewRegId(null)} style={{ background:C.danger, border:"none", borderRadius:"50%", color:"#fff", width:28, height:28, cursor:"pointer", fontSize:15, fontWeight:700, flexShrink:0 }}>x</button>
              </div>
              {/* File grid */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(120px, 1fr))", gap:12, overflowY:"auto", flex:1 }}>
                {archivos.map(ar => {
                  const isErr = errorFiles.has(ar.id)
                  return (
                    <div key={ar.id} style={{ borderRadius:12, overflow:"hidden", border:`2px solid ${isErr?C.red:C.border}`, position:"relative", opacity:isErr?.5:1, transition:"opacity .2s" }}>
                      {/* Thumbnail */}
                      <div onClick={()=>{setViewFile(ar)}} style={{ cursor:"pointer", aspectRatio:"1" }}>
                        {ar.tipo==="image" || ar.tipo?.startsWith("image")
                          ? <img src={ar.url} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} />
                          : ar.tipo==="video" || ar.tipo?.startsWith("video")
                          ? <div style={{ width:"100%",height:"100%",background:C.cardAlt,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4 }}><svg width="32" height="32" fill="none" stroke={C.purple} strokeWidth="2"><path d="M5 3l14 9-14 9V3z"/></svg><span style={{ fontSize:10,color:C.muted }}>Video</span></div>
                          : <div style={{ width:"100%",height:"100%",background:C.cardAlt,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4 }}><svg width="28" height="28" fill="none" stroke={C.red} strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg><span style={{ fontSize:10,color:C.muted }}>PDF</span></div>}
                      </div>
                      {/* Bottom bar: name + actions */}
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
              {/* Add more */}
              <button onClick={()=>{setContractUpId(previewRegId);cRef.current?.click()}} style={{ marginTop:14, width:"100%", padding:"10px", borderRadius:10, border:`1px dashed ${C.border}`, background:"transparent", color:C.accent, cursor:"pointer", fontSize:13, fontWeight:600, flexShrink:0 }}>+ Subir mas fotos</button>
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

      {/* Delete confirmation modal */}
      {delConfirm && (() => {
        const { regId, linked } = delConfirm
        const cts = linked ? (linked.contratos||[]) : []
        const totalArch = cts.reduce((s,ct) => s + (ct.contrato_archivos||[]).length, 0)
        const totalAdel = cts.reduce((s,ct) => s + (ct.adelantos||[]).length, 0)
        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.65)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={()=>setDelConfirm(null)}>
            <div onClick={e=>e.stopPropagation()} style={{ background:C.card, borderRadius:14, border:`1px solid ${C.red}44`, padding:24, maxWidth:400, width:"100%" }}>
              <h3 style={{ margin:"0 0 8px", fontSize:17, fontWeight:700, color:C.red }}>Eliminar registro</h3>
              {linked ? <>
                <p style={{ margin:"0 0 12px", fontSize:13, color:C.muted }}>Este registro tiene una ficha vinculada:</p>
                <div style={{ background:C.cardAlt, borderRadius:10, padding:14, marginBottom:16 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:6 }}>{linked.nombre||"Sin nombre"} <span style={{ fontSize:11, color:C.cyan, fontFamily:"monospace" }}>{linked.code}</span></div>
                  {cts.length > 0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}><span style={{ color:C.muted }}>Contratos</span><span style={{ color:C.yellow, fontWeight:600 }}>{cts.length}</span></div>}
                  {totalAdel > 0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}><span style={{ color:C.muted }}>Adelantos</span><span style={{ color:C.yellow, fontWeight:600 }}>{totalAdel}</span></div>}
                  {totalArch > 0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:12 }}><span style={{ color:C.muted }}>Archivos</span><span style={{ color:C.yellow, fontWeight:600 }}>{totalArch}</span></div>}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  <button onClick={()=>{setDelConfirm(null);onHardDeleteReg(regId)}} style={{ padding:10, borderRadius:10, border:`1px solid ${C.border}`, background:C.cardAlt, color:C.text, cursor:"pointer", fontSize:13, fontWeight:600, textAlign:"left" }}>Solo borrar el registro <span style={{ fontSize:11, color:C.muted, display:"block" }}>La ficha y sus datos se mantienen</span></button>
                  <button onClick={()=>{setDelConfirm(null);onHardDeleteReg(regId);onDeleteClient(linked.id)}} style={{ padding:10, borderRadius:10, border:`1px solid ${C.red}44`, background:C.red+"15", color:C.red, cursor:"pointer", fontSize:13, fontWeight:700, textAlign:"left" }}>Borrar registro + ficha <span style={{ fontSize:11, color:C.red+"aa", display:"block" }}>Se eliminan contratos, adelantos y archivos</span></button>
                  <button onClick={()=>setDelConfirm(null)} style={{ padding:8, background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:12, textAlign:"center" }}>Cancelar</button>
                </div>
              </> : <>
                <p style={{ margin:"0 0 16px", fontSize:13, color:C.muted }}>Este registro no tiene ficha vinculada. Se eliminara permanentemente.</p>
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={()=>setDelConfirm(null)} style={{ flex:1, padding:10, borderRadius:10, background:"transparent", border:`1px solid ${C.border}`, color:C.muted, cursor:"pointer", fontSize:13, fontWeight:600 }}>Cancelar</button>
                  <button onClick={()=>{setDelConfirm(null);onHardDeleteReg(regId)}} style={{ flex:1, padding:10, borderRadius:10, background:C.danger, border:"none", color:"#fff", cursor:"pointer", fontSize:13, fontWeight:700 }}>Eliminar</button>
                </div>
              </>}
            </div>
          </div>
        )
      })()}

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
            {(() => {
              const nonDelRows = rows.filter(x => !x.deleted)
              const nonDelIdSet = new Map(nonDelRows.map((r,i) => [r.id, i]))
              const visibleRows = showAll ? rows : (nonDelRows.length > 5 ? nonDelRows.slice(-5) : nonDelRows)
              return visibleRows.map((r, i) => {
              const isDel   = r.deleted
              const nonDelIdx = isDel ? -1 : (nonDelIdSet.get(r.id) ?? -1)
              const isSel = selectedRow === r.id
              const canEdit = !isDel && (adm || nonDelIdx >= total - 3)
              const lock    = !canEdit ? { opacity:.45, pointerEvents:"none" } : {}
              const cc = getBg(r.canal,  { W:C.teal, F:C.purple })
              const sc = getBg(r.sexo,   { H:C.blue, M:C.pink })
              const pc = getBg(r.pirana, { S:C.red, P:C.yellow, N:C.muted })
              const ec = getTagColor(r.estado, tags)
              const isDrag = dragOverRow === r.id
              const rowBg = isDrag ? C.accent+"22" : isDel ? C.red+"0a" : isSel ? C.accent+"15" : i%2 ? C.cardAlt+"44" : "transparent"

              return (
                <tr key={r.id} onClick={()=>setSelectedRow(isSel?null:r.id)}
                  onDragOver={canEdit ? e=>onRowDragOver(e,r.id) : undefined}
                  onDragLeave={canEdit ? onRowDragLeave : undefined}
                  onDrop={canEdit ? e=>onRowDrop(e,r.id) : undefined}
                  style={{ borderBottom:`1px solid ${isDrag?C.accent:C.border}`, background:rowBg, animation:"fadeIn .2s", cursor:"pointer", transition:"background .15s, border .15s" }}>
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
                    const linked = clients.find(c => !c.deleted_at && (c.reg_ids||[]).includes(r.id))
                    if (linked?.erronea) return <span style={{ fontSize:10, color:C.red }}>--</span>
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
                  <td style={td}><div style={lock}><TagSelect value={r.estado} onChange={v=>upd(r.id,"estado",v)} tags={tags} getColor={t=>getTagColor(t,tags)} disabled={!canEdit} /></div></td>
                  <td style={td}><div style={lock}><DInput value={r.observaciones} onCommit={v=>upd(r.id,"observaciones",v)} style={{ ...mi, width:120 }} placeholder="..." disabled={!canEdit}/></div></td>
                  {/* Ficha */}
                  <td style={{ ...td, pointerEvents:"auto", opacity:1 }}>{(() => {
                    const linked = clients.find(c => !c.deleted_at && (c.reg_ids||[]).includes(r.id))
                    return isDel
                      ? linked
                        ? <button onClick={()=>goToClient(linked.id)} style={{ fontSize:10, fontWeight:700, color:C.orange, background:C.orange+"15", padding:"2px 8px", borderRadius:6, border:"none", cursor:"pointer" }}>Ver ficha</button>
                        : <span style={{ fontSize:10, fontWeight:600, color:C.muted }}>—</span>
                      : linked
                      ? linked.erronea
                        ? <button onClick={()=>goToClient(linked.id)} style={{ fontSize:10, fontWeight:700, color:C.red, background:C.red+"15", padding:"2px 8px", borderRadius:6, border:"none", cursor:"pointer" }}>Ficha erronea</button>
                        : <div style={{ display:"flex", gap:4, alignItems:"center", flexWrap:"wrap" }}>
                          <button onClick={()=>goToClient(linked.id)} style={{ background:C.green+"22", border:"none", borderRadius:6, color:C.green, cursor:"pointer", padding:"2px 8px", fontSize:11, fontWeight:700 }}>→ Ver ficha</button>
                          {(() => { const lct=(linked.contratos||[]).slice(-1)[0]; return lct?.tipo?<span style={{ fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:4,background:lct.tipo==="contrato"?C.green+"22":C.yellow+"22",color:lct.tipo==="contrato"?C.green:C.yellow }}>{lct.tipo==="contrato"?"C":"P"}</span>:null })()}
                          {linked.code && <CopyBtn text={linked.code} />}
                        </div>
                      : <button onClick={async()=>{
                          const nc = await onAddClient({ code:genCode(), reg_ids:[r.id], created_by:user.id, created_by_name:user.name, nombre:"", dni:"", phones:[], direccion:"", referencia:"" }, { reg_id:r.id })
                          goToClient(nc.id)
                        }} style={{ background:C.purple+"22", border:`1px solid ${C.purple}44`, borderRadius:6, color:C.purple, cursor:"pointer", padding:"2px 8px", fontSize:12, fontWeight:700 }}>+ Ficha</button>
                  })()}</td>
                  {/* Acciones */}
                  <td style={td}>
                    {isDel ? (
                      <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                        <button onClick={()=>restore(r.id)} title="Restaurar" style={{ background:C.green+"22", border:"none", borderRadius:4, color:C.green, cursor:"pointer", padding:"2px 6px", fontSize:10, fontWeight:700 }}>↩</button>
                        {adm && <button onClick={()=>hardDel(r.id)} title="Eliminar permanente" style={{ background:"none", border:"none", cursor:"pointer", color:C.danger, padding:2 }}>
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h10M12 6V14a1 1 0 01-1 1H5a1 1 0 01-1-1V6M6 6V4a1 1 0 011-1h2a1 1 0 011 1v2"/></svg>
                        </button>}
                      </div>
                    ) : (
                      <button onClick={()=>del(r.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.danger, padding:4 }}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h10M12 6V14a1 1 0 01-1 1H5a1 1 0 01-1-1V6M6 6V4a1 1 0 011-1h2a1 1 0 011 1v2"/></svg>
                      </button>
                    )}
                  </td>
                </tr>
              )
            })})()}
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
})
