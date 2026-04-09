import { useState, useEffect, useRef, memo } from "react"
import * as XLSX from "xlsx"
import { C, estadoColors } from "../lib/colors"
import { today, nowTime, genCode, canChangeTipo } from "../lib/helpers"
import { LIMITS } from "../lib/constants"
import { Bdg, DInput, TagSelect, lbl, inp, mi, sel, btn, td, ib } from "./shared"
import { getStr, setStr } from "../lib/storage"
import RegistroEmployeeGrid from "./registro/RegistroEmployeeGrid"
import RegistroToolbar from "./registro/RegistroToolbar"
import DeleteRegistroModal from "./registro/DeleteRegistroModal"

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
  const [viewUser,  setViewUser_] = useState(() => { if (!adm) return user.id; return getStr("reg_viewUser") })
  const setViewUser = (v) => { setViewUser_(v); setStr("reg_viewUser", v) }
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
      // Auto-set estado to match tipo if new ficha was created
      if (tipo) onUpdateReg(regId, { estado: tipo === "contrato" ? "Contrato" : "Proforma" })
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
    return <RegistroEmployeeGrid regs={regs} setViewUser={setViewUser} />
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
      <RegistroToolbar
        adm={adm}
        viewName={viewName}
        rowsCount={rows.length}
        date={date} setDate={setDate}
        dateRange={dateRange} setDateRange={setDateRange}
        shift={shift}
        selLocal={selLocal} setSelLocal={setSelLocal} locales={locales}
        showAll={showAll} setShowAll={setShowAll}
        setViewUser={setViewUser} addReg={addReg} exportExcel={exportExcel}
      />

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
      <DeleteRegistroModal
        delConfirm={delConfirm}
        setDelConfirm={setDelConfirm}
        onHardDeleteReg={onHardDeleteReg}
        onDeleteClient={onDeleteClient}
      />

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
                  <td style={td}><div style={lock}>{(() => {
                    const linked = clients.find(c=>!c.deleted_at&&(c.reg_ids||[]).includes(r.id))
                    const isErronea = linked?.erronea
                    const hasFicha = !!linked && !isErronea
                    const isContractState = r.estado==="Proforma"||r.estado==="Contrato"
                    const dis = isErronea ? ["Proforma","Contrato"] : isContractState && hasFicha ? tags.filter(t=>t!=="Proforma"&&t!=="Contrato") : ["Proforma","Contrato"]
                    return <TagSelect value={r.estado} onChange={v=>{
                      if ((v==="Proforma"||v==="Contrato") && v!==r.estado) {
                        if (!canChangeTipo()) { alert(`Limite de cambios alcanzado (${LIMITS.TIPO_CHANGES_PER_HOUR} por hora)`); return }
                      }
                      upd(r.id,"estado",v)
                    }} tags={tags} getColor={t=>getTagColor(t,tags)} disabled={!canEdit} disabledTags={dis} />
                  })()}</div></td>
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
