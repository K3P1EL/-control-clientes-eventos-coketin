import { useState, useEffect, useRef, memo } from "react"
import { C } from "../lib/colors"
import { today, fmtDate, canChangeTipo, genCode } from "../lib/helpers"
import { lbl, inp, mi, btn, td, ib, DInput, SafeImg, DatePicker } from "./shared"
import { parseOCRText } from "../services/ocr"
import { incrementOCRCount } from "../services/config"
import OCRPreviewModal from "./OCRPreviewModal"
import LinkPopup from "./LinkPopup"

const parseProds = (pi) => Array.isArray(pi) ? pi : (pi||"").split(",").map(s=>s.trim()).filter(Boolean)

// Determine ficha status color: erronea(red) > naranja(deleted regs) > anterior(blue, no regs) > normal(green)
function fichaStatus(c, regs) {
  if (c.erronea) return "erronea"
  const rids = c.reg_ids || []
  if (!rids.length) return "anterior"
  const allRegsDeleted = rids.length > 0 && rids.every(rid => { const r = regs.find(x=>x.id===rid); return !r || r.deleted })
  if (allRegsDeleted) return "naranja"
  return "normal"
}
const STATUS_COLORS = { normal: C.accent, anterior: C.blue, naranja: C.orange, erronea: C.red }

function fichaCanal(c, regs) {
  const rids = c.reg_ids || []
  if (!rids.length) return null
  // Show canal of the first (original) registro
  const first = regs.find(x => x.id === rids[0])
  return first?.canal || null
}

export default memo(function Clientes({
  clients, user, adm, regs, users, prodTags, visionKey, contactos,
  navClientId, clearNavClient, changeTab,
  goToReg, goToAlmacen,
  onAddClient, onUpdateClient, onDeleteClient,
  onAddContrato, onUpdateContrato,
  onAddAdelanto, onUpdateAdelanto, onDeleteAdelanto,
  onAddContratoArchivo, onDeleteContratoArchivo,
  onMergeClients, onAddContacto,
}) {
  const [view,           setView_]          = useState(() => { try { const v = localStorage.getItem("client_view"); return v || null } catch { return null } })
  const setView = (v) => { setView_(v || null); try { if (v) localStorage.setItem("client_view", v); else localStorage.removeItem("client_view") } catch {} }
  const [activeContrato, setActiveContrato] = useState(0)
  const [linking,        setLinking]        = useState(false)
  const [phoneInput,     setPhoneInput]     = useState("")
  const [viewEmp,        setViewEmp_]       = useState(() => {
    if (!adm) return "__mine__"
    try {
      const saved = localStorage.getItem("client_viewEmp")
      if (saved) return saved
      // If a client view is open, default to __all__ so it renders the ficha
      if (localStorage.getItem("client_view")) return "__all__"
      return null
    } catch { return null }
  })
  const setViewEmp = (v) => { setViewEmp_(v); try { if (v) localStorage.setItem("client_viewEmp", v); else localStorage.removeItem("client_viewEmp") } catch {} }
  const [ocrLoading,     setOcrLoading]     = useState(false)
  const [ocrParsed,      setOcrParsed]      = useState(null) // parseOCRText result
  const [ocrRawText,     setOcrRawText]     = useState("")
  const [ocrClientId,    setOcrClientId]    = useState(null)
  const [expandNotes,    setExpandNotes]    = useState(null)
  const [viewContratoImg,setViewContratoImg]= useState(null)
  const [uploadingContrato, setUploadingContrato] = useState(0)
  const [errorFiles, setErrorFiles] = useState(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [selectedFichas, setSelectedFichas] = useState(new Set())
  const [statusFilter, setStatusFilter] = useState(null) // null | "anterior" | "naranja" | "erronea"
  const [canalFilter, setCanalFilter] = useState(null) // null | "W" | "F"
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [expandedId, setExpandedId] = useState(null)
  const [browseMode, setBrowseMode] = useState(false)
  const [sortAsc, setSortAsc] = useState(false) // false = newest first
  const browseList = useRef([]) // ordered client IDs for browse navigation
  const toggleSelect = (id, e) => { e.stopPropagation(); setSelectedFichas(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s }) }
  const bulkDelete = () => { selectedFichas.forEach(id => onDeleteClient(id)); setSelectedFichas(new Set()) }
  const [contactSearch, setContactSearch] = useState("")
  const [showContactSearch, setShowContactSearch] = useState(false)
  const fRef   = useRef(null)
  const ocrRef = useRef(null)

  useEffect(() => { if (navClientId) { setView(navClientId); clearNavClient() } }, [navClientId, clearNavClient])

  // If we have a saved view but no viewEmp yet (admin refresh), auto-set viewEmp to show the client
  useEffect(() => {
    if (view && !viewEmp && adm) {
      const c = clients.find(x => x.id === view)
      if (c) setViewEmp(c.created_by || "__all__")
      else if (clients.length > 0) setViewEmp("__all__")
    }
  }, [view, viewEmp, clients])

  // Reset per-ficha state when view changes
  useEffect(() => { setErrorFiles(new Set()); setUploadingContrato(0); setContactSearch(""); setShowContactSearch(false) }, [view])

  // ── OCR ──────────────────────────────────────────────────────────────────
  const scanPhoto = async (clientId, file) => {
    setOcrLoading(true); setOcrParsed(null); setOcrRawText(""); setOcrClientId(clientId)
    try {
      if (!visionKey) throw new Error("API key de Google Vision no configurada. Ve a Admin > Configuracion del Sistema.")
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(r.result.split(",")[1])
        r.onerror = () => rej(new Error("Error leyendo archivo"))
        r.readAsDataURL(file)
      })
      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${visionKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests: [{ image: { content: base64 }, features: [{ type: "DOCUMENT_TEXT_DETECTION" }] }] }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error?.message || `Error ${response.status}`)
      }
      const data = await response.json()
      const rawText = data.responses?.[0]?.fullTextAnnotation?.text || ""
      if (!rawText.trim()) throw new Error("No se detecto texto en la imagen")
      setOcrRawText(rawText)
      setOcrParsed(parseOCRText(rawText))
      incrementOCRCount().catch(() => {})
    } catch (err) {
      alert(err.message || "Error en OCR")
      setOcrParsed(null)
    }
    setOcrLoading(false)
  }

  const closeOcr = () => { setOcrParsed(null); setOcrRawText(""); setOcrClientId(null) }

  const handleOCRApply = async (fields) => {
    const c = clients.find(x => x.id === ocrClientId)
    if (!c) { closeOcr(); return }
    // Client fields
    const updates = {}
    if (fields.nombre)    updates.nombre    = fields.nombre
    if (fields.dni)       updates.dni       = fields.dni
    if (fields.direccion) updates.direccion = fields.direccion
    if (fields.referencia)updates.referencia= fields.referencia
    let phones = [...(c.phones||[])]
    if (fields.telefono && !phones.includes(fields.telefono)) phones.push(fields.telefono)
    if (phones.length !== (c.phones||[]).length) updates.phones = phones
    if (Object.keys(updates).length) await onUpdateClient(ocrClientId, updates)
    // Contract fields — only if contrato exists
    const cts = c.contratos || []
    const ct = cts[activeContrato] || cts[0]
    if (ct) {
      const ctPatch = {}
      if (fields.total)        ctPatch.total       = Number(fields.total) || 0
      if (fields.fecha_evento) ctPatch.fecha_evento = fields.fecha_evento
      if (fields.tipo_documento && (fields.tipo_documento === "proforma" || fields.tipo_documento === "contrato")) ctPatch.tipo = fields.tipo_documento
      // Append descripcion to notas
      if (fields.descripcion_servicios) {
        const curr = ct.notas || ""
        const stamp = `--- OCR ${new Date().toLocaleDateString()} ---`
        ctPatch.notas = curr ? `${curr}\n\n${stamp}\n${fields.descripcion_servicios}` : fields.descripcion_servicios
      }
      if (Object.keys(ctPatch).length) await onUpdateContrato(ocrClientId, ct.id, ctPatch)
      if (fields.adelanto && Number(fields.adelanto) > 0) {
        await onAddAdelanto(ocrClientId, ct.id, { monto: Number(fields.adelanto), fecha: today(), nota: "OCR - Adelanto/Yape" })
      }
    }
    closeOcr()
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getContratos  = (c) => (c.contratos||[])
  const getRegIds     = (c) => c.reg_ids||[]

  const addNew = async () => {
    const nc = await onAddClient({
      code: genCode(clients.map(c=>c.code)),
      reg_ids: [], created_by: user.id, created_by_name: user.name,
      nombre:"", dni:"", phones:[], direccion:"", referencia:"",
    })
    setView(nc.id); setActiveContrato(0)
  }

  // ── Detail view ───────────────────────────────────────────────────────────
  if (view) {
    const c = clients.find(x=>x.id===view)
    if (!c) {
      if (clients.length > 0) { setView(null); return null }
      return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:60, color:C.muted }}><div style={{ textAlign:"center" }}><div style={{ width:28, height:28, border:`3px solid ${C.border}`, borderTop:`3px solid ${C.accent}`, borderRadius:"50%", animation:"spin 1s linear infinite", margin:"0 auto 12px" }} />Cargando cliente...</div></div>
    }
    const contratos = getContratos(c)
    const regIds    = getRegIds(c)
    const ct        = contratos[activeContrato] || contratos[0]
    const totalAdel = (ct?.adelantos||[]).filter(a=>!a.invalid).reduce((s,a)=>s+(Number(a.monto)||0),0)
    const resto     = (Number(ct?.total)||0) - totalAdel
    const isSimple  = (user.view_mode || "completo") === "simple"

    // Navigation via pre-built browse list
    const navIds = browseList.current
    const navIdx = browseMode ? navIds.indexOf(view) : -1
    const goPrev = () => { if (navIdx > 0) { setView(navIds[navIdx-1]); setActiveContrato(0) } }
    const goNext = () => { if (navIdx < navIds.length-1) { setView(navIds[navIdx+1]); setActiveContrato(0) } }

    return (
      <div>
        {/* Browse mode navigation bar */}
        {browseMode && navIds.length > 0 && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:10, padding:"8px 16px", marginBottom:14 }}>
            <button onClick={goPrev} disabled={navIdx<=0} style={{ background:navIdx>0?C.accent+"22":"transparent", border:`1px solid ${navIdx>0?C.accent+"44":C.border}`, borderRadius:8, color:navIdx>0?C.accent:C.muted, cursor:navIdx>0?"pointer":"default", padding:"6px 14px", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", gap:4, opacity:navIdx<=0?0.4:1 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 2L4 7l6 5"/></svg>Anterior
            </button>
            <span style={{ fontSize:12, color:C.muted, fontWeight:600 }}>Ficha {navIdx+1} de {navIds.length}</span>
            <button onClick={goNext} disabled={navIdx>=navIds.length-1} style={{ background:navIdx<navIds.length-1?C.accent+"22":"transparent", border:`1px solid ${navIdx<navIds.length-1?C.accent+"44":C.border}`, borderRadius:8, color:navIdx<navIds.length-1?C.accent:C.muted, cursor:navIdx<navIds.length-1?"pointer":"default", padding:"6px 14px", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", gap:4, opacity:navIdx>=navIds.length-1?0.4:1 }}>
              Siguiente<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 2l6 5-6 5"/></svg>
            </button>
          </div>
        )}
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, flexWrap:"wrap" }}>
          <button onClick={()=>{
            // Check if ficha is empty — if so, delete it and notify
            const archivos = (c.contratos||[]).flatMap(ct => ct.contrato_archivos||[])
            const isEmpty = !c.nombre && !c.dni && !(c.phones||[]).length && !archivos.length
            if (isEmpty) {
              onDeleteClient(c.id)
              alert("Ficha no creada: no tiene nombre, DNI, celular ni archivos.")
            }
            setView(null);setActiveContrato(0);setBrowseMode(false)
            try { const rt = localStorage.getItem("return_tab"); if (rt && rt !== "fichas") { localStorage.removeItem("return_tab"); changeTab(rt) } } catch {}
          }} style={{ background:C.inputBg, border:`1px solid ${C.border}`, color:C.accent, borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>Volver
          </button>
          <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:c.erronea?C.red:C.text }}>{c.nombre||"Ficha de Cliente"}</h2>
          {c.code && <span style={{ padding:"3px 10px", borderRadius:8, fontSize:11, fontWeight:700, fontFamily:"monospace", letterSpacing:1, ...(c.erronea ? { background:C.red+"22", color:C.red, textDecoration:"line-through" } : { background:C.cyan+"22", color:C.cyan }) }}>{c.code}</span>}
          {!c.erronea && <>
            {contratos.length>1 && <span style={{ padding:"3px 10px", borderRadius:10, fontSize:11, fontWeight:700, background:C.purple+"33", color:C.purple }}>{contratos.length} visitas</span>}
            <button onClick={()=>setLinking(true)} style={{ background:C.purple+"22", border:`1px solid ${C.purple}44`, borderRadius:8, color:C.purple, cursor:"pointer", padding:"6px 14px", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007-7l-1.5 1.5a3 3 0 01-4.5 4.5L10 13zM8 5a5 5 0 00-7 7l1.5-1.5a3 3 0 014.5-4.5L8 5z"/></svg>Vincular
            </button>
            {(adm||(user.permissions||[]).includes("almacen")) && (
              <button onClick={()=>goToAlmacen(c.id)} style={{ background:C.orange+"22", border:`1px solid ${C.orange}44`, borderRadius:8, color:C.orange, cursor:"pointer", padding:"6px 14px", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h4l2 3h6l2-3h4v12H3z"/></svg>Almacén
              </button>
            )}
            {c.code && (
              <button onClick={()=>{
                const url = `${window.location.origin}/almacen/${c.code}`
                const msg = `Salida de almacen para ${c.nombre||c.code}:\n${url}`
                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank")
              }} style={{ background:"#25D366"+"22", border:`1px solid #25D36644`, borderRadius:8, color:"#25D366", cursor:"pointer", padding:"6px 14px", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
                Enviar a Almacén
              </button>
            )}
          </>}
          <button onClick={()=>onUpdateClient(c.id,"erronea",!c.erronea)} style={{ background:c.erronea?C.yellow+"22":C.red+"18", border:`1px solid ${c.erronea?C.yellow:C.red}44`, borderRadius:8, color:c.erronea?C.yellow:C.red, cursor:"pointer", padding:"6px 14px", fontSize:12, fontWeight:600 }}>
            {c.erronea ? "Quitar marca" : "Ficha erronea"}
          </button>
          {adm && <button onClick={()=>setDeleteConfirm(c.id)} style={{ marginLeft:"auto", background:C.danger+"22", border:`1px solid ${C.danger}44`, borderRadius:8, color:C.danger, cursor:"pointer", padding:"6px 14px", fontSize:12, fontWeight:600 }}>Eliminar</button>}
        </div>
        {c.erronea && <div style={{ background:C.red+"15", border:`1px solid ${C.red}44`, borderRadius:10, padding:"10px 16px", marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
          <svg width="18" height="18" fill="none" stroke={C.red} strokeWidth="2"><circle cx="9" cy="9" r="7"/><path d="M9 6v4M9 12.5v.5"/></svg>
          <span style={{ color:C.red, fontSize:13, fontWeight:600 }}>Ficha marcada como erronea</span>
          <span style={{ color:C.muted, fontSize:11, marginLeft:"auto" }}>No se eliminara, solo queda marcada para revision</span>
        </div>}

        {/* Delete confirmation modal */}
        {deleteConfirm === c.id && (() => {
          const cts = c.contratos || []
          const totalArchivos = cts.reduce((s,ct) => s + (ct.contrato_archivos||[]).length, 0)
          const totalAdelantos = cts.reduce((s,ct) => s + (ct.adelantos||[]).length, 0)
          const regCount = (c.reg_ids||[]).length
          const hasData = cts.length > 0 || totalArchivos > 0 || totalAdelantos > 0 || regCount > 0
          return (
            <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.65)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={()=>setDeleteConfirm(null)}>
              <div onClick={e=>e.stopPropagation()} style={{ background:C.card, borderRadius:14, border:`1px solid ${C.red}44`, padding:24, maxWidth:420, width:"100%" }}>
                <h3 style={{ margin:"0 0 8px", fontSize:17, fontWeight:700, color:C.red }}>Eliminar ficha</h3>
                <p style={{ margin:"0 0 16px", fontSize:13, color:C.muted }}>Se movera a la papelera <strong style={{ color:C.text }}>{c.nombre||c.code||"esta ficha"}</strong> con sus datos vinculados:</p>
                {hasData ? (
                  <div style={{ background:C.cardAlt, borderRadius:10, padding:14, marginBottom:16, display:"flex", flexDirection:"column", gap:8 }}>
                    {cts.length > 0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                      <span style={{ color:C.text }}>Contratos</span>
                      <span style={{ color:C.yellow, fontWeight:700 }}>{cts.length}</span>
                    </div>}
                    {totalAdelantos > 0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                      <span style={{ color:C.text }}>Adelantos/Pagos</span>
                      <span style={{ color:C.yellow, fontWeight:700 }}>{totalAdelantos}</span>
                    </div>}
                    {totalArchivos > 0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                      <span style={{ color:C.text }}>Archivos subidos</span>
                      <span style={{ color:C.yellow, fontWeight:700 }}>{totalArchivos}</span>
                    </div>}
                    {regCount > 0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                      <span style={{ color:C.text }}>Registros vinculados</span>
                      <span style={{ color:C.muted, fontWeight:700 }}>{regCount} (no se borran)</span>
                    </div>}
                  </div>
                ) : (
                  <div style={{ background:C.cardAlt, borderRadius:10, padding:14, marginBottom:16, fontSize:13, color:C.muted, textAlign:"center" }}>Sin datos vinculados</div>
                )}
                <div style={{ fontSize:11, color:C.muted, marginBottom:16, background:C.accent+"11", padding:"8px 12px", borderRadius:6 }}>Se movera a la Papelera. Podras restaurarlo en los proximos 10 dias.</div>
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={()=>setDeleteConfirm(null)} style={{ flex:1, padding:10, borderRadius:10, background:"transparent", border:`1px solid ${C.border}`, color:C.muted, cursor:"pointer", fontSize:13, fontWeight:600 }}>Cancelar</button>
                  <button onClick={()=>{setDeleteConfirm(null);onDeleteClient(c.id);setView(null)}} style={{ flex:1, padding:10, borderRadius:10, background:C.danger, border:"none", color:"#fff", cursor:"pointer", fontSize:13, fontWeight:700 }}>Mover a papelera</button>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Lightbox */}
        {viewContratoImg && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={()=>setViewContratoImg(null)}>
            <div onClick={e=>e.stopPropagation()} style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center" }}>
              <button onClick={()=>setViewContratoImg(null)} style={{ position:"absolute", top:-14, right:-14, background:C.danger, border:"none", borderRadius:"50%", color:"#fff", width:30, height:30, cursor:"pointer", fontSize:18, fontWeight:700, zIndex:1 }}>×</button>
              {viewContratoImg.tipo==="image"
                ? <img src={viewContratoImg.url} alt="" style={{ maxWidth:"90vw", maxHeight:"85vh", borderRadius:8, objectFit:"contain" }} />
                : viewContratoImg.tipo==="video"
                ? <video src={viewContratoImg.url} controls autoPlay style={{ maxWidth:"90vw", maxHeight:"85vh", borderRadius:8 }} />
                : <embed src={viewContratoImg.url} type="application/pdf" style={{ width:"85vw", height:"85vh", borderRadius:8 }} />}
              {viewContratoImg.nombre && <div style={{ marginTop:8, color:"#fff", fontSize:12 }}>{viewContratoImg.nombre}</div>}
            </div>
          </div>
        )}

        {/* Link popup */}
        {linking && <LinkPopup c={c} clients={clients} onMergeClients={onMergeClients} setLinking={setLinking} setView={setView} setActiveContrato={setActiveContrato} />}

        {/* Linked registros */}
        {regIds.length>0 && (
          <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
            {regIds.map((rid,idx) => {
              const reg = regs.find(r=>r.id===rid)
              if (!reg) return null
              return (
                <div key={rid} style={{ background:C.cardAlt, borderRadius:8, border:`1px solid ${C.border}`, padding:"6px 12px", display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
                  <svg width="12" height="12" fill="none" stroke={C.accent} strokeWidth="2"><path d="M10 13a5 5 0 007-7l-1.5 1.5a3 3 0 01-4.5 4.5L10 13z"/></svg>
                  <span style={{ color:C.muted }}>Visita {idx+1}:</span>
                  <span style={{ color:C.text, fontWeight:600 }}>{reg.fecha} {reg.hora}</span>
                  <span style={{ color:C.muted }}>— {reg.empleado}</span>
                  <button onClick={()=>goToReg(reg.user_id, reg.fecha)} style={{ background:"none", border:"none", color:C.accent, cursor:"pointer", fontSize:11, fontWeight:600 }}>Ver →</button>
                </div>
              )
            })}
          </div>
        )}

        {/* Contract tabs */}
        {contratos.length>1 && (
          <div style={{ display:"flex", gap:4, marginBottom:16 }}>
            {contratos.map((ct2,idx) => (
              <button key={ct2.id} onClick={()=>setActiveContrato(idx)} style={{
                padding:"6px 16px", borderRadius:"8px 8px 0 0", border:`1px solid ${C.border}`,
                borderBottom:activeContrato===idx?`2px solid ${C.accent}`:`1px solid ${C.border}`,
                background:activeContrato===idx?C.card:C.cardAlt,
                color:activeContrato===idx?C.accent:C.muted, cursor:"pointer", fontSize:12, fontWeight:600,
              }}>{ct2.tipo==="contrato"?"Contrato":"Proforma"} {idx+1} — {ct2.fecha}</button>
            ))}
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:isSimple?"1fr":"1fr 1fr", gap:16, marginBottom:24 }}>
          {/* LEFT: Datos + Contrato */}
          <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:20 }}>
            {!isSimple && <h3 style={{ fontSize:15, fontWeight:600, marginTop:0, marginBottom:16, color:C.accent }}>Datos del Cliente</h3>}
            {isSimple && <h3 style={{ fontSize:15, fontWeight:600, marginTop:0, marginBottom:16, color:C.accent }}>Ficha rapida</h3>}

            {/* OCR + Client data — hidden in simple mode */}
            {!isSimple && <>
            <input ref={ocrRef} type="file" accept="image/*" style={{ display:"none" }} onChange={async e=>{const f=e.target.files?.[0];if(f) await scanPhoto(c.id,f);e.target.value=""}} />
            <div style={{ marginBottom:14 }}>
              <button onClick={()=>ocrRef.current?.click()} disabled={ocrLoading || !visionKey} style={{ background:`linear-gradient(135deg,${C.purple}22,${C.blue}22)`, border:`1px solid ${C.purple}44`, borderRadius:8, color:visionKey?C.purple:C.muted, cursor:ocrLoading?"wait":visionKey?"pointer":"not-allowed", padding:"8px 14px", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:6, width:"100%" }}>
                {ocrLoading
                  ? <><div style={{ width:14,height:14,border:`2px solid ${C.purple}44`,borderTop:`2px solid ${C.purple}`,borderRadius:"50%",animation:"spin 1s linear infinite" }}/> Analizando documento...</>
                  : <><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="12" height="12" rx="2"/><circle cx="8" cy="7" r="2"/><path d="M2 11l3-3 2 2 3-3 4 4"/></svg>{visionKey ? "Escanear DNI / Documento" : "OCR no configurado (Admin)"}</>}
              </button>
            </div>

            {/* Contact search + save */}
            <div style={{ display:"flex", gap:8, marginBottom:14 }}>
              {/* Search existing client */}
              <div style={{ flex:1, position:"relative" }}>
                <button onClick={()=>setShowContactSearch(!showContactSearch)} style={{ width:"100%", background:C.inputBg, border:`1px solid ${C.border}`, borderRadius:8, color:C.teal, cursor:"pointer", padding:"8px 14px", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="6" r="4"/><path d="M10 10l3 3"/></svg>
                  Buscar cliente existente
                </button>
                {showContactSearch && (
                  <div style={{ position:"absolute", top:"100%", left:0, right:0, marginTop:4, background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:10, zIndex:50, boxShadow:"0 8px 24px rgba(0,0,0,.4)" }}>
                    <input value={contactSearch} onChange={e=>setContactSearch(e.target.value)} placeholder="Nombre, DNI o celular..." style={{ ...inp, marginBottom:8, fontSize:12 }} autoFocus />
                    <div style={{ maxHeight:160, overflow:"auto" }}>
                      {contactSearch.trim() && (() => {
                        const q = contactSearch.toLowerCase()
                        const results = (contactos||[]).filter(ct => (ct.nombre||"").toLowerCase().includes(q) || (ct.dni||"").includes(q) || (ct.phones||[]).some(p=>p.includes(q)))
                        return !results.length
                          ? <div style={{ padding:8, fontSize:12, color:C.muted, textAlign:"center" }}>No encontrado</div>
                          : results.slice(0,5).map(ct => (
                            <button key={ct.id} onClick={()=>{
                              const updates = {}
                              if(ct.nombre) updates.nombre = ct.nombre
                              if(ct.dni) updates.dni = ct.dni
                              if(ct.direccion) updates.direccion = ct.direccion
                              if(ct.referencia) updates.referencia = ct.referencia
                              if(ct.phones?.length) updates.phones = [...new Set([...(c.phones||[]),...ct.phones])]
                              updates.contacto_id = ct.id
                              if(Object.keys(updates).length) onUpdateClient(c.id, updates)
                              setShowContactSearch(false); setContactSearch("")
                            }} style={{ width:"100%", padding:"8px 10px", border:`1px solid ${C.border}`, borderRadius:6, background:C.cardAlt, cursor:"pointer", textAlign:"left", color:C.text, fontSize:12, marginBottom:4, display:"block" }}>
                              <div style={{ fontWeight:600 }}>{ct.nombre||"Sin nombre"}</div>
                              <div style={{ fontSize:10, color:C.muted }}>{ct.dni ? `DNI: ${ct.dni}` : ""}{ct.phones?.[0] ? ` · ${ct.phones[0]}` : ""}</div>
                            </button>
                          ))
                      })()}
                      {!contactSearch.trim() && <div style={{ padding:8, fontSize:11, color:C.muted, textAlign:"center" }}>Escribe para buscar...</div>}
                    </div>
                  </div>
                )}
              </div>
              {/* Save as client */}
              {!c.contacto_id && (c.nombre || c.dni || (c.phones||[]).length > 0) && (
                <button onClick={async()=>{
                  const nc = await onAddContacto({ nombre:c.nombre||"", dni:c.dni||"", phones:c.phones||[], direccion:c.direccion||"", referencia:c.referencia||"", created_by:user.id, created_by_name:user.name })
                  onUpdateClient(c.id, { contacto_id: nc.id })
                }} style={{ background:C.green+"22", border:`1px solid ${C.green}44`, borderRadius:8, color:C.green, cursor:"pointer", padding:"8px 14px", fontSize:12, fontWeight:600, whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:6 }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 3a4 4 0 100 8 4 4 0 000-8zM19 8v6M22 11h-6"/></svg>
                  Guardar cliente
                </button>
              )}
              {c.contacto_id && <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:C.green, fontWeight:600, padding:"0 8px" }}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 6l3 3 5-5"/></svg>Cliente guardado
              </span>}
            </div>

            {/* OCR preview modal */}
            {ocrParsed && ocrClientId===c.id && (
              <OCRPreviewModal parsed={ocrParsed} rawText={ocrRawText} onApply={handleOCRApply} onCancel={closeOcr} />
            )}

            {/* Identidad */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
              <div><label style={lbl}>Nombre</label><DInput value={c.nombre} onCommit={v=>onUpdateClient(c.id,"nombre",v)} style={inp} placeholder="Nombre completo" /></div>
              <div><label style={lbl}>DNI</label><DInput value={c.dni||""} onCommit={v=>onUpdateClient(c.id,"dni",v)} style={inp} placeholder="Documento" maxLength={15} /></div>
            </div>

            {/* Celulares */}
            <label style={lbl}>Celulares</label>
            <div style={{ display:"flex", gap:6, marginBottom:6 }}>
              <input value={phoneInput} onChange={e=>setPhoneInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&phoneInput.trim()){const ph=[...(c.phones||[])];if(!ph.includes(phoneInput.trim())){ph.push(phoneInput.trim());onUpdateClient(c.id,"phones",ph)}setPhoneInput("")}}} style={{ ...inp, marginBottom:0, flex:1 }} placeholder="Ingresa número y pulsa ↵" />
              <button onClick={()=>{if(!phoneInput.trim())return;const ph=[...(c.phones||[])];if(!ph.includes(phoneInput.trim())){ph.push(phoneInput.trim());onUpdateClient(c.id,"phones",ph)}setPhoneInput("")}} style={{ background:C.green+"22", border:`1px solid ${C.green}44`, borderRadius:8, color:C.green, cursor:"pointer", padding:"8px 12px", fontSize:14, fontWeight:700 }}>✓</button>
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
              {(c.phones||[]).map((ph,idx)=>(
                <div key={idx} style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 10px", borderRadius:8, background:C.accent+"22", fontSize:12, fontWeight:600, color:C.accent }}>
                  {ph}
                  <button onClick={()=>onUpdateClient(c.id,"phones",(c.phones||[]).filter((_,i)=>i!==idx))} style={{ background:"none", border:"none", cursor:"pointer", color:C.accent, padding:0, lineHeight:1, fontSize:14 }}>×</button>
                </div>
              ))}
              {!(c.phones||[]).length && <span style={{ fontSize:12, color:C.muted }}>Sin números guardados</span>}
            </div>

            {/* Dirección */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
              <div><label style={lbl}>Dirección</label><DInput value={c.direccion} onCommit={v=>onUpdateClient(c.id,"direccion",v)} style={inp} placeholder="Dirección" /></div>
              <div><label style={lbl}>Referencia</label><DInput value={c.referencia} onCommit={v=>onUpdateClient(c.id,"referencia",v)} style={inp} placeholder="Cerca de..." /></div>
            </div>

            </>}

            {/* ── Contrato ── */}
            {ct && (
              <div style={{ borderTop:`1px solid ${C.border}`, marginTop:14, paddingTop:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <h3 style={{ fontSize:15, fontWeight:600, margin:0, color:C.accent }}>
                    {ct.tipo==="contrato"?"Contrato":"Proforma"}{contratos.length>1?` #${activeContrato+1}`:""}
                  </h3>
                  {!isSimple && <div style={{ display:"flex", gap:6 }}>
                    <div style={{ display:"inline-flex", borderRadius:20, background:C.bg, padding:2 }}>
                      <button onClick={()=>{if(ct.tipo!=="proforma"){if(!canChangeTipo()){alert("Limite de cambios alcanzado (3 por hora)");return}onUpdateContrato(c.id,ct.id,{tipo:"proforma"})}}} style={{ padding:"4px 14px", borderRadius:18, border:"none", cursor:"pointer", fontSize:11, fontWeight:700, background:ct.tipo!=="contrato"?C.yellow:C.bg, color:ct.tipo!=="contrato"?"#fff":C.muted, transition:"all .2s" }}>Proforma</button>
                      <button onClick={()=>{if(ct.tipo!=="contrato"){if(!canChangeTipo()){alert("Limite de cambios alcanzado (3 por hora)");return}onUpdateContrato(c.id,ct.id,{tipo:"contrato"})}}} style={{ padding:"4px 14px", borderRadius:18, border:"none", cursor:"pointer", fontSize:11, fontWeight:700, background:ct.tipo==="contrato"?C.green:C.bg, color:ct.tipo==="contrato"?"#fff":C.muted, transition:"all .2s" }}>Contrato</button>
                    </div>
                    <button onClick={()=>onUpdateContrato(c.id,ct.id,{estado:ct.estado==="finalizado"?"activo":"finalizado"})} style={{ padding:"4px 12px", borderRadius:20, border:"none", cursor:"pointer", fontSize:11, fontWeight:700, background:ct.estado==="finalizado"?C.blue+"33":C.border, color:ct.estado==="finalizado"?C.blue:C.muted }}>
                      {ct.estado==="finalizado"?"✓ Finalizado":"En curso"}
                    </button>
                  </div>}
                </div>

                {/* Archivos arriba en modo simple */}
                {isSimple && <div style={{ marginBottom:12 }}>
                  <label style={lbl}>Archivos del contrato</label>
                  <input ref={fRef} type="file" accept="image/jpeg,image/png,video/mp4,video/quicktime,application/pdf" multiple style={{ display:"none" }} onChange={async e=>{const files=Array.from(e.target.files||[]);e.target.value="";if(!files.length)return;setUploadingContrato(x=>x+files.length);await Promise.all(files.map(f=>onAddContratoArchivo(c.id,ct.id,f).catch(err=>alert("Error: "+err.message)))).finally(()=>setUploadingContrato(x=>Math.max(0,x-files.length)))}} />
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <button onClick={()=>fRef.current?.click()} style={{ background:C.inputBg, border:`1px solid ${C.border}`, borderRadius:8, color:C.accent, cursor:"pointer", padding:"8px 16px", fontSize:12, fontWeight:600 }}>+ Subir foto</button>
                    {uploadingContrato > 0 && <span style={{ fontSize:11, color:C.accent }}>{uploadingContrato} subiendo...</span>}
                    <span style={{ fontSize:11, color:C.muted }}>o arrastra aqui</span>
                  </div>
                  {(ct.contrato_archivos||[]).length > 0 && (
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(100px, 1fr))", gap:8 }}>
                      {(ct.contrato_archivos||[]).map((item,idx) => (
                        <div key={item.id||idx} style={{ borderRadius:10, overflow:"hidden", border:`2px solid ${errorFiles.has(item.id)?C.red:C.border}`, opacity:errorFiles.has(item.id)?.5:1 }}>
                          <div onClick={()=>setViewContratoImg(item)} style={{ cursor:"pointer", aspectRatio:"1" }}>
                            {item.tipo==="image" ? <SafeImg src={item.url} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} />
                            : item.tipo==="video" ? <div style={{ width:"100%",height:"100%",background:C.cardAlt,display:"flex",alignItems:"center",justifyContent:"center" }}><svg width="24" height="24" fill="none" stroke={C.purple} strokeWidth="2"><path d="M5 3l14 9-14 9V3z"/></svg></div>
                            : <div style={{ width:"100%",height:"100%",background:C.cardAlt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:C.yellow,fontWeight:700 }}>PDF</div>}
                          </div>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"4px 6px", background:C.cardAlt }}>
                            <span style={{ fontSize:8, color:errorFiles.has(item.id)?C.red:C.muted, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{errorFiles.has(item.id)?"Error":item.nombre||"Archivo"}</span>
                            <div style={{ display:"flex", gap:3 }}>
                              <button onClick={e=>{e.stopPropagation();setErrorFiles(prev=>{const s=new Set(prev);if(s.has(item.id))s.delete(item.id);else s.add(item.id);return s})}} style={{ background:errorFiles.has(item.id)?C.yellow+"22":C.red+"22", border:"none", borderRadius:3, cursor:"pointer", padding:"1px 4px", fontSize:8, fontWeight:700, color:errorFiles.has(item.id)?C.yellow:C.red }}>{errorFiles.has(item.id)?"↩":"!"}</button>
                              {adm && <button onClick={e=>{e.stopPropagation();if(window.confirm("¿Eliminar?"))onDeleteContratoArchivo(c.id,ct.id,item.id)}} style={{ background:C.danger+"22", border:"none", borderRadius:3, cursor:"pointer", padding:"1px 4px", fontSize:8, color:C.danger }}>x</button>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>}

                {/* Fechas */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
                  <div>
                    <label style={lbl}>Fecha de evento</label>
                    <input type="date" value={ct.fecha_evento||""} onChange={e=>{
                      const v = e.target.value
                      const shouldCopyArmado = !ct.fecha_armado || ct.fecha_armado===ct.fecha_evento
                      onUpdateContrato(c.id,ct.id,{ fecha_evento:v, ...(shouldCopyArmado?{fecha_armado:v}:{}) })
                    }} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Fecha de armado</label>
                    <input type="date" value={ct.fecha_armado||""} onChange={e=>onUpdateContrato(c.id,ct.id,{fecha_armado:e.target.value})} style={inp} />
                  </div>
                </div>

                {/* Ubicaciones / Google Maps (max 3) */}
                <div style={{ marginBottom:12 }}>
                  <label style={lbl}>Ubicaciones del evento</label>
                  {(ct.ubicaciones||[]).length < 3 && (
                    <input onKeyDown={e=>{if(e.key==="Enter"&&e.target.value.trim()){const v=e.target.value.trim();if(/^https?:\/\//.test(v)){onUpdateContrato(c.id,ct.id,{ubicaciones:[...(ct.ubicaciones||[]),v]});e.target.value=""}else{alert("Pega un link valido (https://...)")}}}} onPaste={e=>{setTimeout(()=>{const v=e.target.value.trim();if(v&&/^https?:\/\//.test(v)){onUpdateContrato(c.id,ct.id,{ubicaciones:[...(ct.ubicaciones||[]),v]});e.target.value=""}},100)}} style={{ ...inp, marginBottom:8, fontSize:12 }} placeholder={`Pega link de Google Maps y pulsa Enter... (${3-(ct.ubicaciones||[]).length} restantes)`} />
                  )}
                  {(ct.ubicaciones||[]).map((ub,idx) => (
                    <div key={idx} style={{ display:"flex", gap:6, alignItems:"center", marginBottom:6 }}>
                      <div style={{ flex:1, padding:"7px 12px", borderRadius:8, background:C.inputBg, border:`1px solid ${C.border}`, fontSize:12, color:C.accent, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", cursor:"pointer" }} onClick={()=>window.open(ub,"_blank")}>
                        {ub}
                      </div>
                      <button onClick={()=>window.open(ub,"_blank")} title="Abrir mapa" style={{ background:C.blue+"22", border:`1px solid ${C.blue}44`, borderRadius:8, color:C.blue, cursor:"pointer", padding:"6px 8px", display:"flex", alignItems:"center" }}>
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                      </button>
                      <button onClick={()=>{
                        const msg = `Ubicacion${c.nombre?" de "+c.nombre:""}:\n${ub}`
                        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank")
                      }} title="Compartir" style={{ background:"#25D366"+"22", border:`1px solid #25D36644`, borderRadius:8, color:"#25D366", cursor:"pointer", padding:"6px 8px", display:"flex", alignItems:"center" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
                      </button>
                      <button onClick={()=>{const u=[...(ct.ubicaciones||[])];u.splice(idx,1);onUpdateContrato(c.id,ct.id,{ubicaciones:u})}} title="Quitar" style={{ background:C.danger+"22", border:"none", borderRadius:8, color:C.danger, cursor:"pointer", padding:"6px 7px", display:"flex", alignItems:"center", fontSize:11 }}>x</button>
                    </div>
                  ))}
                  {(ct.ubicaciones||[]).length > 1 && (
                    <button onClick={()=>{
                      const ubis = (ct.ubicaciones||[]).map((u,i)=>`Ubicacion ${i+1}: ${u}`).join("\n")
                      const msg = `Ubicaciones del evento${c.nombre?" de "+c.nombre:""}:\n\n${ubis}`
                      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank")
                    }} style={{ marginTop:4, background:"#25D366"+"15", border:`1px solid #25D36633`, borderRadius:8, color:"#25D366", cursor:"pointer", padding:"6px 12px", fontSize:11, fontWeight:600, display:"flex", alignItems:"center", gap:5 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
                      Enviar todas por WhatsApp
                    </button>
                  )}
                </div>

                {/* Producto de interés — hidden in simple */}
                {!isSimple && <>
                <div>
                  <label style={lbl}>Producto de interés</label>
                  {prodTags.length>0 && (
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:6, maxHeight:60, overflow:"auto", padding:"2px 0" }}>
                      {prodTags.map(t => {
                        const prods = parseProds(ct.producto_interes)
                        const active = prods.includes(t)
                        return (
                          <button key={t} onClick={()=>{
                            const updated = active ? prods.filter(x=>x!==t) : [...prods,t]
                            onUpdateContrato(c.id,ct.id,{producto_interes:updated})
                          }} style={{ padding:"3px 10px", borderRadius:12, border:"none", cursor:"pointer", fontSize:11, fontWeight:600, background:active?C.accent+"33":C.border, color:active?C.accent:C.muted }}>{t}</button>
                        )
                      })}
                    </div>
                  )}
                  {(() => {
                    const prods = parseProds(ct.producto_interes)
                    const custom = prods.filter(p=>!prodTags.includes(p))
                    return <>
                      <div style={{ ...inp, marginBottom:6, opacity:.7, cursor:"not-allowed", minHeight:36, display:"flex", alignItems:"center", fontSize:13 }}>
                        {prods.length ? prods.join(", ") : <span style={{ color:C.muted }}>Selecciona los tags...</span>}
                      </div>
                      {custom.length>0 && (
                        <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:6 }}>
                          {custom.map(t => (
                            <div key={t} style={{ display:"flex", alignItems:"center", gap:3, padding:"2px 8px", borderRadius:10, background:C.teal+"22", fontSize:10, fontWeight:600, color:C.teal }}>
                              {t}
                              <button onClick={()=>onUpdateContrato(c.id,ct.id,{producto_interes:prods.filter(x=>x!==t)})} style={{ background:"none", border:"none", cursor:"pointer", color:C.teal, padding:0, fontSize:12, lineHeight:1 }}>×</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ display:"flex", gap:4 }}>
                        <input id={"cprod_"+ct.id} style={{ ...inp, marginBottom:0, flex:1, fontSize:12 }} placeholder="Agregar otro producto..." onKeyDown={e=>{if(e.key==="Enter"&&e.target.value.trim()){if(!prods.includes(e.target.value.trim()))onUpdateContrato(c.id,ct.id,{producto_interes:[...prods,e.target.value.trim()]});e.target.value=""}}} />
                        <button onClick={()=>{const el=document.getElementById("cprod_"+ct.id);if(!el||!el.value.trim())return;const p=Array.isArray(ct.producto_interes)?ct.producto_interes:(ct.producto_interes||"").split(",").map(s=>s.trim()).filter(Boolean);if(!p.includes(el.value.trim()))onUpdateContrato(c.id,ct.id,{producto_interes:[...p,el.value.trim()]});el.value=""}} style={{ background:C.accent+"22", border:`1px solid ${C.accent}44`, borderRadius:8, color:C.accent, cursor:"pointer", padding:"6px 10px", fontSize:12, fontWeight:700 }}>+</button>
                      </div>
                    </>
                  })()}
                </div>

                {/* Notas */}
                <div style={{ marginTop:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <label style={lbl}>Notas del contrato</label>
                    <button onClick={()=>setExpandNotes(expandNotes===ct.id?null:ct.id)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:10, display:"flex", alignItems:"center", gap:3 }}>
                      {expandNotes===ct.id?"Cerrar":"Expandir"}
                    </button>
                  </div>
                  <DInput tag="textarea" value={ct.notas||""} onCommit={v=>onUpdateContrato(c.id,ct.id,{notas:v})} style={{ ...inp, minHeight:80, resize:"vertical", fontFamily:"inherit" }} placeholder="Observaciones..." />
                </div>
                {expandNotes===ct.id && (
                  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={()=>setExpandNotes(null)}>
                    <div onClick={e=>e.stopPropagation()} style={{ background:C.card, borderRadius:16, border:`1px solid ${C.border}`, padding:24, width:"80vw", maxWidth:700, maxHeight:"80vh", display:"flex", flexDirection:"column" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                        <h3 style={{ margin:0, fontSize:16, fontWeight:600, color:C.accent }}>Notas — {c.nombre||c.code}</h3>
                        <button onClick={()=>setExpandNotes(null)} style={{ background:C.danger, border:"none", borderRadius:"50%", color:"#fff", width:28, height:28, cursor:"pointer", fontSize:16, fontWeight:700 }}>×</button>
                      </div>
                      <DInput tag="textarea" value={ct.notas||""} onCommit={v=>onUpdateContrato(c.id,ct.id,{notas:v})} style={{ ...inp, flex:1, minHeight:400, resize:"none", fontFamily:"inherit", fontSize:14, lineHeight:1.6 }} placeholder="Observaciones..." autoFocus />
                    </div>
                  </div>
                )}

                </>}
                {/* Archivos de contrato — hidden in simple (shown above instead) */}
                {!isSimple && <>
                <div style={{ marginTop:8 }}>
                  <label style={lbl}>Contrato (archivos)</label>
                  <input ref={fRef} type="file" accept="image/jpeg,image/png,video/mp4,video/quicktime,application/pdf" multiple style={{ display:"none" }} onChange={async e=>{const files=Array.from(e.target.files||[]);e.target.value="";if(!files.length)return;setUploadingContrato(x=>x+files.length);await Promise.all(files.map(f=>onAddContratoArchivo(c.id,ct.id,f).catch(err=>alert("Error: "+err.message)))).finally(()=>setUploadingContrato(x=>Math.max(0,x-files.length)))}} />
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}
                    onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor=C.accent}} onDragLeave={e=>{e.currentTarget.style.borderColor="transparent"}}
                    onDrop={async e=>{e.preventDefault();e.currentTarget.style.borderColor="transparent";const files=Array.from(e.dataTransfer.files||[]).filter(f=>/^(image|video|application\/pdf)/.test(f.type));if(!files.length)return;setUploadingContrato(x=>x+files.length);await Promise.all(files.map(f=>onAddContratoArchivo(c.id,ct.id,f).catch(err=>alert("Error: "+err.message)))).finally(()=>setUploadingContrato(x=>Math.max(0,x-files.length)))}}>
                    <button onClick={()=>fRef.current?.click()} style={{ background:C.inputBg, border:`1px solid ${C.border}`, borderRadius:8, color:C.accent, cursor:"pointer", padding:"6px 14px", fontSize:12, fontWeight:600 }}>+ Subir archivo</button>
                    {uploadingContrato > 0 && <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:C.accent }}><span style={{ display:"inline-block", width:12, height:12, border:"2px solid currentColor", borderTopColor:"transparent", borderRadius:"50%", animation:"spin .8s linear infinite" }} />{uploadingContrato} subiendo...</span>}
                    <span style={{ fontSize:11, color:C.muted }}>o arrastra aqui</span>
                  </div>
                  {(ct.contrato_archivos||[]).length>0 && (
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(120px, 1fr))", gap:10 }}>
                      {(ct.contrato_archivos||[]).map((item,idx)=>{
                        const isErr = errorFiles.has(item.id)
                        return (
                          <div key={item.id||idx} style={{ borderRadius:12, overflow:"hidden", border:`2px solid ${isErr?C.red:C.border}`, opacity:isErr?.5:1, transition:"opacity .2s" }}>
                            <div onClick={()=>setViewContratoImg(item)} style={{ cursor:"pointer", aspectRatio:"1" }}>
                              {item.tipo==="image"
                                ? <SafeImg src={item.url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                                : item.tipo==="video"
                                ? <div style={{ width:"100%",height:"100%",background:C.cardAlt,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4 }}><svg width="32" height="32" fill="none" stroke={C.purple} strokeWidth="2"><path d="M5 3l14 9-14 9V3z"/></svg><span style={{ fontSize:10,color:C.muted }}>Video</span></div>
                                : <div style={{ width:"100%",height:"100%",background:C.cardAlt,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4 }}><svg width="28" height="28" fill="none" stroke={C.red} strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg><span style={{ fontSize:10,color:C.muted }}>PDF</span></div>}
                            </div>
                            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"5px 8px", background:C.cardAlt }}>
                              <span style={{ fontSize:9, color:isErr?C.red:C.muted, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{isErr?"Error":item.nombre||"Archivo"}</span>
                              <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                                <button onClick={e=>{e.stopPropagation();setErrorFiles(prev=>{const s=new Set(prev);if(s.has(item.id))s.delete(item.id);else s.add(item.id);return s})}} style={{ background:isErr?C.yellow+"22":C.red+"22", border:"none", borderRadius:4, cursor:"pointer", padding:"2px 5px", fontSize:9, fontWeight:700, color:isErr?C.yellow:C.red }}>{isErr?"Restaurar":"Error"}</button>
                                {adm && <button onClick={e=>{e.stopPropagation();if(window.confirm("¿Eliminar este archivo?"))onDeleteContratoArchivo(c.id,ct.id,item.id)}} style={{ background:C.danger+"22", border:"none", borderRadius:4, cursor:"pointer", padding:"2px 5px", fontSize:9, color:C.danger }}>x</button>}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                </>}
              </div>
            )}
            <div style={{ marginTop:12, fontSize:11, color:C.muted }}>Creado por {c.created_by_name} — {fmtDate(c.created_at)}</div>
          </div>

          {/* RIGHT: Pagos — hidden in simple */}
          {!isSimple && ct && (adm||(user.permissions||[]).includes("pagos")) && (
            <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:20 }}>
              <h3 style={{ fontSize:15, fontWeight:600, marginTop:0, marginBottom:12, color:C.accent }}>Pagos y Adelantos</h3>
              <div style={{ background:C.cardAlt, borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
                <label style={{ fontSize:12, color:C.muted, display:"block", marginBottom:6 }}>Costo total del contrato</label>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:16, color:C.muted, fontWeight:600 }}>S/</span>
                  <DInput type="number" value={ct.total||""} onCommit={v=>onUpdateContrato(c.id,ct.id,{total:v})} style={{ ...inp, marginBottom:0, fontSize:20, fontWeight:700, flex:1 }} placeholder="Ej: 500" />
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
                <div style={{ background:C.cardAlt, borderRadius:10, padding:12, textAlign:"center" }}>
                  <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>Adelantado</div>
                  <div style={{ fontSize:20, fontWeight:700, color:C.green }}>S/ {totalAdel.toFixed(2)}</div>
                </div>
                <div style={{ background:C.cardAlt, borderRadius:10, padding:12, textAlign:"center" }}>
                  <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>Resta</div>
                  <div style={{ fontSize:20, fontWeight:700, color:resto<=0&&Number(ct.total)>0?C.green:C.yellow }}>S/ {resto.toFixed(2)}</div>
                  {resto<=0&&Number(ct.total)>0 && <div style={{ fontSize:10, color:C.green, fontWeight:600 }}>✓ PAGADO</div>}
                </div>
              </div>
              {Number(ct.total)>0 && (
                <div style={{ background:C.cardAlt, borderRadius:20, height:10, marginBottom:16, overflow:"hidden" }}>
                  <div style={{ width:`${Math.min(100,totalAdel/Number(ct.total)*100)}%`, height:"100%", background:resto<=0?C.green:C.accent, borderRadius:20, transition:"width .3s" }} />
                </div>
              )}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <span style={{ fontSize:14, fontWeight:600 }}>Historial de pagos</span>
                <button onClick={()=>onAddAdelanto(c.id,ct.id,{monto:0,fecha:today(),nota:""})} style={{ background:C.accent+"22", border:`1px solid ${C.accent}44`, borderRadius:6, color:C.accent, cursor:"pointer", padding:"4px 12px", fontSize:12, fontWeight:700 }}>+ Adelanto</button>
              </div>
              {!(ct.adelantos?.length) && <div style={{ padding:20, textAlign:"center", color:C.muted, fontSize:13, background:C.cardAlt, borderRadius:8 }}>Sin pagos. Haz clic en "+ Adelanto".</div>}
              {(ct.adelantos||[]).map((a,idx) => {
                const locked = a.locked, inv = a.invalid
                return (
                  <div key={a.id} style={{ display:"flex", gap:6, alignItems:"center", padding:"8px 10px", background:inv?C.red+"0a":(idx%2?C.cardAlt+"66":"transparent"), borderRadius:6, marginBottom:2 }}>
                    <span style={{ fontSize:11, color:inv?C.red:C.muted, width:18, ...(inv?{textDecoration:"line-through"}:{}) }}>{idx+1}</span>
                    <input type="date" value={a.fecha?a.fecha.split("/").length===3?`${a.fecha.split("/")[2]}-${a.fecha.split("/")[1]}-${a.fecha.split("/")[0]}`:(a.fecha||""):(a.fecha||"")} onChange={e=>{const p=e.target.value.split("-");onUpdateAdelanto(c.id,ct.id,a.id,{fecha:`${p[2]}/${p[1]}/${p[0]}`})}} style={{ ...mi, width:110, fontSize:11, ...((locked||inv)?{opacity:.5}:{}) }} disabled={locked||inv} />
                    <div style={{ display:"flex", alignItems:"center", gap:2 }}>
                      <span style={{ fontSize:11, color:C.muted, ...(inv?{textDecoration:"line-through"}:{}) }}>S/</span>
                      <DInput type="number" value={a.monto||""} onCommit={v=>onUpdateAdelanto(c.id,ct.id,a.id,{monto:v})} style={{ ...mi, width:65, fontWeight:600, ...((locked||inv)?{opacity:.5,textDecoration:inv?"line-through":"none"}:{}) }} placeholder="0" disabled={locked||inv} />
                    </div>
                    <DInput value={a.nota||""} onCommit={v=>onUpdateAdelanto(c.id,ct.id,a.id,{nota:v})} style={{ ...mi, flex:1 }} placeholder="Nota..." />
                    <div style={{ display:"flex", alignItems:"center", gap:3, flexShrink:0 }}>
                      {inv ? <>
                        <span style={{ padding:"2px 6px", borderRadius:4, fontSize:9, fontWeight:700, background:C.red+"33", color:C.red }}>INVÁLIDO</span>
                        {adm && <button onClick={()=>onUpdateAdelanto(c.id,ct.id,a.id,{invalid:false})} style={{ background:C.green+"22", border:"none", borderRadius:4, color:C.green, cursor:"pointer", padding:"2px 5px", fontSize:10, fontWeight:700 }}>↩</button>}
                        {adm && <button onClick={()=>{if(window.confirm("¿Eliminar este adelanto?"))onDeleteAdelanto(c.id,ct.id,a.id)}} style={{ ...ib, color:C.danger }}><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 4h8M9 4V10a1 1 0 01-1 1H4a1 1 0 01-1-1V4"/></svg></button>}
                      </> : !locked ? <>
                        <button onClick={()=>onUpdateAdelanto(c.id,ct.id,a.id,{locked:true})} style={{ background:C.green+"22", border:`1px solid ${C.green}44`, borderRadius:6, color:C.green, cursor:"pointer", padding:"3px 6px", fontSize:11, fontWeight:700 }}><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 6l3 3 5-5"/></svg></button>
                        <button onClick={()=>onUpdateAdelanto(c.id,ct.id,a.id,{invalid:true})} style={{ background:C.red+"15", border:"none", borderRadius:6, color:C.red, cursor:"pointer", padding:"3px 6px", fontSize:9, fontWeight:700 }}>✗</button>
                      </> : <>
                        <span style={{ padding:"2px 6px", borderRadius:4, fontSize:10, fontWeight:700, background:C.green+"33", color:C.green }}>✓</span>
                        <button onClick={()=>onUpdateAdelanto(c.id,ct.id,a.id,{invalid:true})} style={{ background:C.red+"15", border:"none", borderRadius:6, color:C.red, cursor:"pointer", padding:"3px 6px", fontSize:9, fontWeight:700 }}>✗</button>
                        {adm && <button onClick={()=>onUpdateAdelanto(c.id,ct.id,a.id,{locked:false})} style={{ ...ib, color:C.yellow }}><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="8" height="6" rx="1"/><path d="M4 5V3a2 2 0 014 0"/></svg></button>}
                        {adm && <button onClick={()=>{if(window.confirm("¿Eliminar este adelanto?"))onDeleteAdelanto(c.id,ct.id,a.id)}} style={{ ...ib, color:C.danger }}><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 4h8M9 4V10a1 1 0 01-1 1H4a1 1 0 01-1-1V4"/></svg></button>}
                      </>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── List view ─────────────────────────────────────────────────────────────

  // Admin: employee grid
  if (adm && viewEmp === null) {
    const empMap = {}
    clients.filter(c => !c.deleted_at).forEach(c => {
      if (!empMap[c.created_by]) empMap[c.created_by] = { id:c.created_by, name:c.created_by_name, count:0 }
      empMap[c.created_by].count++
    })
    const employees = Object.values(empMap)
    const cardColors = [C.blue,C.teal,C.purple,C.pink,C.orange,C.cyan,C.yellow,C.green]
    return (
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>Clientes</h2>
          <button onClick={addNew} style={{ ...btn, background:C.blue }}>+ Registrar Anterior</button>
        </div>
        <p style={{ color:C.muted, fontSize:13, margin:"0 0 20px" }}>Selecciona un empleado para ver sus clientes.</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:14 }}>
          <button onClick={()=>setViewEmp("__all__")} style={{ background:`linear-gradient(135deg,${C.accent}22,${C.accent}08)`, border:`2px solid ${C.accent}44`, borderRadius:16, padding:"20px 18px", cursor:"pointer", textAlign:"left", transition:"all .2s" }}
            onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent}
            onMouseLeave={e=>e.currentTarget.style.borderColor=C.accent+"44"}>
            <div style={{ width:40,height:40,background:C.accent+"33",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12 }}>
              <svg width="20" height="20" fill="none" stroke={C.accent} strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            </div>
            <div style={{ fontSize:16, fontWeight:700, color:C.text }}>Todos</div>
            <div style={{ fontSize:12, color:C.muted }}>{clients.filter(c=>!c.deleted_at).length} clientes</div>
          </button>
          {employees.map((emp,idx) => {
            const cc = cardColors[idx%8]
            const ini = emp.name.split(" ").map(w=>w[0]?.toUpperCase()).join("").slice(0,2)
            return (
              <button key={emp.id} onClick={()=>setViewEmp(emp.id)} style={{ background:C.card, border:`2px solid ${C.border}`, borderRadius:16, padding:"20px 18px", cursor:"pointer", textAlign:"left", transition:"all .2s" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=cc}
                onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                <div style={{ width:40,height:40,background:cc+"33",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12,fontSize:15,fontWeight:700,color:cc }}>{ini}</div>
                <div style={{ fontSize:16,fontWeight:700,color:C.text }}>{emp.name}</div>
                <div style={{ fontSize:12,color:C.muted }}>{emp.count} clientes</div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Filter
  const getMyClients = (userId, isAdmView) => {
    const myRegIds = regs.filter(r=>r.user_id===userId).map(r=>r.id)
    const usr = users.find(u=>u.id===userId)
    const vis = isAdmView ? "always" : (usr?.client_visibility||"always")
    if (vis==="none" && !isAdmView) return []
    const now = new Date()
    const maxAge = {today:1,"3days":3,week:7,month:30}[vis] || Infinity
    return clients.filter(c => {
      const owns = c.created_by===userId || (c.reg_ids||[]).some(rid=>myRegIds.includes(rid))
      if (!owns) return false
      if (c.hidden && !isAdmView) return false
      if (maxAge===Infinity) return true
      try { const d=new Date(c.created_at); return (now-d)/86400000 <= maxAge } catch { return true }
    })
  }
  const filteredClients = (adm
    ? (viewEmp==="__all__" ? clients : getMyClients(viewEmp, true))
    : getMyClients(user.id, false)
  ).filter(c => !c.deleted_at && (adm || !c.erronea))
  const viewEmpName = adm && viewEmp && viewEmp!=="__all__" && viewEmp!=="__mine__"
    ? (users.find(u=>u.id===viewEmp)?.name || "Empleado")
    : null

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {adm && (
            <button onClick={()=>setViewEmp(null)} style={{ background:C.inputBg, border:`1px solid ${C.border}`, color:C.accent, borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>Volver
            </button>
          )}
          <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>
            {viewEmpName ? `Clientes de ${viewEmpName}` : viewEmp==="__all__" ? "Todos los Clientes" : "Mis Clientes"}
          </h2>
          <span style={{ fontSize:13, color:C.muted }}>{filteredClients.length} fichas</span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {adm && selectedFichas.size > 0 && <>
            <button onClick={bulkDelete} style={{ background:C.danger+"22", border:`1px solid ${C.danger}44`, borderRadius:8, color:C.danger, cursor:"pointer", padding:"6px 14px", fontSize:12, fontWeight:600 }}>Papelera ({selectedFichas.size})</button>
            <button onClick={()=>setSelectedFichas(new Set())} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, cursor:"pointer", padding:"6px 10px", fontSize:12 }}>Deseleccionar</button>
          </>}
          {adm && filteredClients.length > 0 && selectedFichas.size === 0 && (
            <button onClick={()=>setSelectedFichas(new Set(filteredClients.map(c=>c.id)))} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, cursor:"pointer", padding:"6px 10px", fontSize:11 }}>Seleccionar</button>
          )}
          {adm && filteredClients.length > 0 && (
            <button onClick={()=>{const sorted=[...filteredClients].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));browseList.current=sorted.map(c=>c.id);setBrowseMode(true);setView(sorted[0].id);setActiveContrato(0)}} style={{ background:C.accent+"18", border:`1px solid ${C.accent}44`, borderRadius:8, color:C.accent, cursor:"pointer", padding:"6px 14px", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="10" height="8" rx="1"/><path d="M5 3V1M9 3V1"/></svg>Ver contratos
            </button>
          )}
          <button onClick={addNew} style={{ ...btn, background:C.blue }}>+ Registrar Anterior</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:14, alignItems:"center", flexWrap:"wrap" }}>
        <button onClick={()=>setSortAsc(!sortAsc)} style={{ background:C.inputBg, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:"5px 10px", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
          <svg width="12" height="12" fill="none" stroke={C.accent} strokeWidth="2"><path d={sortAsc?"M2 8l4 4 4-4":"M2 4l4-4 4 4"}/><path d={sortAsc?"M6 2v10":"M6 10V0"}/></svg>
          {sortAsc?"Mas antiguo":"Mas reciente"}
        </button>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <span style={{ fontSize:11, color:C.muted }}>Desde</span>
          <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="Inicio" />
          <span style={{ fontSize:11, color:C.muted }}>Hasta</span>
          <DatePicker value={dateTo} onChange={setDateTo} placeholder="Fin" />
        </div>
        <select value={statusFilter||""} onChange={e=>setStatusFilter(e.target.value||null)} style={{ background:C.inputBg, border:`1px solid ${C.border}`, borderRadius:8, color:statusFilter?STATUS_COLORS[statusFilter]:C.text, padding:"5px 10px", fontSize:11, cursor:"pointer" }}>
          <option value="">Todos los estados</option>
          <option value="normal" style={{color:C.accent}}>Con registro</option>
          <option value="anterior" style={{color:C.blue}}>Registrado antes</option>
          <option value="naranja" style={{color:C.orange}}>Reg. eliminado</option>
          {adm && <option value="erronea" style={{color:C.red}}>Erronea</option>}
        </select>
        <select value={canalFilter||""} onChange={e=>setCanalFilter(e.target.value||null)} style={{ background:C.inputBg, border:`1px solid ${C.border}`, borderRadius:8, color:canalFilter==="F"?C.purple:canalFilter==="W"?"#25D366":C.text, padding:"5px 10px", fontSize:11, cursor:"pointer" }}>
          <option value="">Todos los canales</option>
          <option value="F" style={{color:C.purple}}>Local</option>
          <option value="W" style={{color:"#25D366"}}>WhatsApp</option>
        </select>
        {(statusFilter || canalFilter || dateFrom || dateTo) && (
          <button onClick={()=>{setStatusFilter(null);setCanalFilter(null);setDateFrom("");setDateTo("")}} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:11, textDecoration:"underline" }}>Limpiar</button>
        )}
      </div>

      {(() => {
        const filtered = filteredClients.filter(c => {
          if (statusFilter && fichaStatus(c,regs)!==statusFilter) return false
          if (canalFilter && fichaCanal(c,regs)!==canalFilter) return false
          if (dateFrom || dateTo) {
            if (!c.created_at) return false
            const dt = new Date(c.created_at)
            const d = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`
            if (dateFrom && d < dateFrom) return false
            if (dateTo && d > dateTo) return false
          }
          return true
        }).sort((a,b) => sortAsc ? new Date(a.created_at||0)-new Date(b.created_at||0) : new Date(b.created_at||0)-new Date(a.created_at||0))
        return filtered.length===0 ? (
          <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:40, textAlign:"center", color:C.muted }}>
            No hay fichas de clientes.
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {filtered.map(c => {
            const cts = getContratos(c)
            const visits = cts.length
            const lastCt = cts[cts.length-1]
            const totalAdel2 = (lastCt?.adelantos||[]).filter(a=>!a.invalid).reduce((s,a)=>s+(Number(a.monto)||0),0)
            const resto2 = (Number(lastCt?.total)||0) - totalAdel2
            const paid = resto2<=0 && Number(lastCt?.total)>0
            const status = fichaStatus(c, regs)
            const sc = STATUS_COLORS[status]
            return (
              <div key={c.id} style={{ borderRadius:10, overflow:"hidden", border:`1px solid ${selectedFichas.has(c.id)?C.accent:expandedId===c.id?C.accent+"66":C.border}`, transition:"all .2s" }}>
                <div onClick={()=>{if(selectedFichas.size>0){toggleSelect(c.id,{stopPropagation:()=>{}})}else{setExpandedId(expandedId===c.id?null:c.id)}}} style={{ background:C.card, borderLeft:`3px solid ${sc}`, padding:"10px 16px", cursor:"pointer", opacity:c.erronea?0.7:1, display:"flex", alignItems:"center", gap:12 }}>
                {adm && (
                  <div onClick={e=>toggleSelect(c.id,e)} style={{ width:20, height:20, borderRadius:6, border:`2px solid ${selectedFichas.has(c.id)?C.accent:C.border}`, background:selectedFichas.has(c.id)?C.accent:"transparent", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0, transition:"all .15s" }}>
                    {selectedFichas.has(c.id) && <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="3"><path d="M2 6l3 3 5-5"/></svg>}
                  </div>
                )}
                <div style={{ width:4, height:32, borderRadius:2, background:sc, flexShrink:0 }} />
                <div style={{ flex:"1 1 0", minWidth:0, display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
                  <div style={{ minWidth:140, flex:"1 1 140px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:14, fontWeight:700, color:c.erronea?C.red:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.nombre||"Sin nombre"}</span>
                      {c.code && <span style={{ fontSize:9, fontWeight:700, color:C.cyan, fontFamily:"monospace", background:C.cyan+"18", padding:"1px 5px", borderRadius:4 }}>{c.code}</span>}
                      {c.erronea && <span style={{ fontSize:9, fontWeight:700, color:C.red, background:C.red+"22", padding:"1px 6px", borderRadius:4 }}>Erronea</span>}
                      {(() => { const ch = fichaCanal(c, regs); return ch === "W" ? <span style={{ fontSize:9, fontWeight:600, color:"#25D366", background:"#25D36618", padding:"1px 5px", borderRadius:4 }}>WA</span> : ch === "F" ? <span style={{ fontSize:9, fontWeight:600, color:C.purple, background:C.purple+"18", padding:"1px 5px", borderRadius:4 }}>Local</span> : null })()}
                    </div>
                    <div style={{ fontSize:11, color:C.muted }}>{(c.phones||[])[0]||"Sin número"}</div>
                  </div>
                  <div style={{ display:"flex", gap:4, alignItems:"center", flexShrink:0 }}>
                    <span style={{ padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700, background:lastCt?.tipo==="contrato"?C.green+"22":C.yellow+"22", color:lastCt?.tipo==="contrato"?C.green:C.yellow }}>
                      {lastCt?.tipo==="contrato"?"Contrato":"Proforma"}
                    </span>
                    {visits>1 && <span style={{ padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700, background:C.purple+"33", color:C.purple }}>{visits}x</span>}
                    {paid ? <span style={{ padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700, background:C.green+"33", color:C.green }}>PAGADO</span>
                      : Number(lastCt?.total)>0 ? <span style={{ padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700, background:C.yellow+"33", color:C.yellow }}>S/{resto2.toFixed(0)}</span>
                      : null}
                  </div>
                  <span style={{ fontSize:11, color:C.muted, flexShrink:0 }}>{c.created_by_name} — {fmtDate(c.created_at)}</span>
                  {adm && (
                    <span onClick={async e=>{e.stopPropagation();await onUpdateClient(c.id,"hidden",!c.hidden)}} style={{ padding:"2px 8px", borderRadius:8, fontSize:10, fontWeight:600, cursor:"pointer", background:c.hidden?C.red+"22":C.green+"22", color:c.hidden?C.red:C.green, flexShrink:0 }}>
                      {c.hidden?"Oculto":"Visible"}
                    </span>
                  )}
                  <svg width="14" height="14" fill="none" stroke={C.muted} strokeWidth="2" style={{ flexShrink:0, transition:"transform .2s", transform:expandedId===c.id?"rotate(180deg)":"rotate(0)" }}><path d="M3 5l4 4 4-4"/></svg>
                </div>
                </div>
                {/* Expanded contracts panel */}
                {expandedId===c.id && (
                  <div style={{ background:C.cardAlt, borderTop:`1px solid ${C.border}`, padding:"12px 16px", animation:"fadeIn .15s" }}>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                      {cts.map((ct, idx) => {
                        const adel = (ct.adelantos||[]).filter(a=>!a.invalid).reduce((s,a)=>s+(Number(a.monto)||0),0)
                        const r = (Number(ct.total)||0) - adel
                        const p = r<=0 && Number(ct.total)>0
                        return (
                          <button key={ct.id} onClick={()=>{setView(c.id);setActiveContrato(idx)}} style={{
                            background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", cursor:"pointer",
                            textAlign:"left", transition:"border-color .15s", minWidth:160, flex:"0 1 auto",
                          }}
                          onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent}
                          onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                              <span style={{ fontSize:11, fontWeight:700, color:ct.tipo==="contrato"?C.green:C.yellow }}>
                                {ct.tipo==="contrato"?"Contrato":"Proforma"} #{idx+1}
                              </span>
                              {p && <span style={{ fontSize:9, fontWeight:700, color:C.green, background:C.green+"22", padding:"1px 6px", borderRadius:4 }}>PAGADO</span>}
                              {!p && Number(ct.total)>0 && <span style={{ fontSize:9, fontWeight:700, color:C.yellow, background:C.yellow+"22", padding:"1px 6px", borderRadius:4 }}>S/{r.toFixed(0)}</span>}
                            </div>
                            <div style={{ fontSize:10, color:C.muted }}>{ct.fecha || "Sin fecha"}</div>
                            {ct.producto_interes && (
                              <div style={{ fontSize:10, color:C.accent, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:180 }}>
                                {Array.isArray(ct.producto_interes)?ct.producto_interes.join(", "):ct.producto_interes}
                              </div>
                            )}
                          </button>
                        )
                      })}
                      <button onClick={()=>{setView(c.id);setActiveContrato(cts.length-1)}} style={{ background:C.accent+"15", border:`1px dashed ${C.accent}44`, borderRadius:10, padding:"10px 14px", cursor:"pointer", color:C.accent, fontSize:12, fontWeight:700, minWidth:100 }}>
                        Abrir ficha completa
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )})()}
    </div>
  )
})
