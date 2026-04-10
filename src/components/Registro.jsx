import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react"
import * as XLSX from "xlsx"
import { C } from "../lib/colors"
import { today, nowTime, genCode } from "../lib/helpers"
import { LIMITS } from "../lib/constants"
import { getStr, setStr } from "../lib/storage"
import RegistroEmployeeGrid from "./registro/RegistroEmployeeGrid"
import RegistroToolbar from "./registro/RegistroToolbar"
import DeleteRegistroModal from "./registro/DeleteRegistroModal"
import ContractTipoModal from "./registro/ContractTipoModal"
import FilePreviewModal from "./registro/FilePreviewModal"
import FileViewerModal from "./registro/FileViewerModal"
import RegistroTable from "./registro/RegistroTable"

export default memo(function Registro({
  regs, user, adm, tags, photos, clients, locales, users,
  navRegId, navRegDate, clearNavReg,
  onAddReg, onUpdateReg, onUploadRegPhoto, onHardDeleteReg, onAddClient, onDeleteClient, onAddContratoArchivo, onDeleteContratoArchivo, onUpdateContrato, goToClient,
}) {
  const [date,      setDate]      = useState(today())
  // Admin defaults to null (employee grid). When localStorage has a saved
  // value (persisted via the returnToTab flow from the Ficha Volver button),
  // we restore that instead — so going Registro → +Ficha → Volver returns
  // to the exact same view.
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

  // Stable callbacks — required so RegistroRow's memo() actually skips
  // re-renders. Without useCallback every Registro re-render mints new
  // function refs and the memo comparison fails on every key.
  const upd = useCallback((id, field, val) => onUpdateReg(id, { [field]: val }), [onUpdateReg])

  const delCount = useRef({ day: "", count: 0 })
  const del = useCallback((id) => {
    if (!adm) {
      const d = today()
      if (delCount.current.day !== d) delCount.current = { day: d, count: 0 }
      if (delCount.current.count >= LIMITS.DELETES_PER_DAY) { alert(`Limite de borrados alcanzado (${LIMITS.DELETES_PER_DAY} por dia)`); return }
      delCount.current.count++
    }
    onUpdateReg(id, { deleted:true, deleted_by:user.name, deleted_at:new Date().toISOString() })
  }, [adm, user.name, onUpdateReg])

  const restoreCount = useRef({ day: "", count: 0 })
  const restore = useCallback((id) => {
    if (!adm) {
      const d = today()
      if (restoreCount.current.day !== d) restoreCount.current = { day: d, count: 0 }
      if (restoreCount.current.count >= LIMITS.RESTORES_PER_DAY) { alert(`Limite de restauraciones alcanzado (${LIMITS.RESTORES_PER_DAY} por dia)`); return }
      restoreCount.current.count++
    }
    onUpdateReg(id, { deleted:false, deleted_by:null, deleted_at:null })
  }, [adm, onUpdateReg])

  // hardDel must depend on `clients` because it looks up the linked ficha.
  // This callback ref will refresh when clients changes, which means rows
  // re-render after a client mutation — that's fine and expected.
  const hardDel = useCallback((id) => {
    const linked = clients.find(c => !c.deleted_at && (c.reg_ids||[]).includes(id))
    setDelConfirm({ regId: id, linked })
  }, [clients])

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
        // onAddClient creates the contrato in the background and returns
        // a promise we MUST await before uploading files — otherwise the
        // contratoId is undefined and the upload silently no-ops.
        const ct = await nc.contratoPromise
        contratoId = ct?.id
      }
      if (clientId && contratoId) {
        const results = await Promise.allSettled(files.map(f => onAddContratoArchivo(clientId, contratoId, f)))
        const failed = results.filter((r,i) => r.status === "rejected").map((r,i) => files[i]?.name || `archivo ${i+1}`)
        if (failed.length) alert(`Error subiendo: ${failed.join(", ")}`)
        onUpdateReg(regId, { foto: "SI" })
      } else {
        // No contrato → no upload happened. Don't lie by setting foto: "SI".
        alert("No se pudo crear el contrato — los archivos no se subieron.")
      }
      // Auto-set estado to match tipo if new ficha was created
      if (tipo) onUpdateReg(regId, { estado: tipo === "contrato" ? "Contrato" : "Proforma" })
    } catch (err) { alert("Error: " + err.message) }
    finally { setContractUploading(prev => { const s = new Set(prev); s.delete(regId); return s }) }
  }

  // Drag & drop on row — stable refs so row memo() can skip.
  // doUpload is NOT a useCallback (it reads too much state) so we stash
  // it in a ref to keep onRowDrop's identity stable across renders.
  const doUploadRef = useRef(doUpload)
  doUploadRef.current = doUpload

  const onRowDragOver = useCallback((e, regId) => { e.preventDefault(); e.stopPropagation(); setDragOverRow(regId) }, [])
  const onRowDragLeave = useCallback(() => setDragOverRow(null), [])
  const onRowDrop = useCallback((e, regId) => {
    e.preventDefault(); e.stopPropagation(); setDragOverRow(null)
    const files = Array.from(e.dataTransfer.files || []).filter(f => /^(image|video|application\/pdf)/.test(f.type))
    if (!files.length) return
    const linked = clients.find(c => !c.deleted_at && (c.reg_ids||[]).includes(regId))
    if (linked) {
      doUploadRef.current(regId, files, null, linked)
    } else {
      setContractFiles({ regId, files })
    }
  }, [clients])

  // ── Table view ────────────────────────────────────────────────────────────
  // Memoize BEFORE the early return for the employee grid. Hook order must
  // be identical on every render, and the grid branch exits early below.
  const rows = useMemo(() => {
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
    return adm
      ? (viewUser==="__all__" ? dateRegs : dateRegs.filter(r=>r.user_id===viewUser))
      : dateRegs.filter(r=>r.user_id===user.id)
  }, [regs, adm, dateRange, date, viewUser, user.id])

  const total = useMemo(() => rows.filter(r=>!r.deleted).length, [rows])

  // ── ADMIN: employee grid ──────────────────────────────────────────────────
  if (adm && viewUser === null) {
    return <RegistroEmployeeGrid regs={regs} setViewUser={setViewUser} />
  }
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

      <ContractTipoModal contractFiles={contractFiles} onCancel={()=>setContractFiles(null)} onPick={onContractTipo} />

      <FilePreviewModal
        previewRegId={previewRegId}
        clients={clients}
        errorFiles={errorFiles}
        setErrorFiles={setErrorFiles}
        adm={adm}
        onUpdateContrato={onUpdateContrato}
        onDeleteContratoArchivo={onDeleteContratoArchivo}
        setViewFile={setViewFile}
        onAddMore={()=>{setContractUpId(previewRegId);cRef.current?.click()}}
        onClose={()=>setPreviewRegId(null)}
      />

      <FileViewerModal viewFile={viewFile} onClose={()=>setViewFile(null)} />

      <DeleteRegistroModal
        delConfirm={delConfirm}
        setDelConfirm={setDelConfirm}
        onHardDeleteReg={onHardDeleteReg}
        onDeleteClient={onDeleteClient}
      />

      <RegistroTable
        rows={rows} total={total} showAll={showAll} adm={adm} user={user}
        clients={clients} tags={tags} locales={locales}
        selectedRow={selectedRow} setSelectedRow={setSelectedRow}
        dragOverRow={dragOverRow} contractUploading={contractUploading}
        cRef={cRef} setContractUpId={setContractUpId} setPreviewRegId={setPreviewRegId}
        upd={upd} del={del} restore={restore} hardDel={hardDel}
        goToClient={goToClient} onAddClient={onAddClient}
        onRowDragOver={onRowDragOver} onRowDragLeave={onRowDragLeave} onRowDrop={onRowDrop}
      />
    </div>
  )
})
