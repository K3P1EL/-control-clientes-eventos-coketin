import { useState, useEffect, useRef } from "react"
import { C } from "../lib/colors"
import { today, fmtDate, canChangeTipo } from "../lib/helpers"
import { lbl, inp, mi, btn, td, ib, DInput } from "./shared"
import { parseOCRText } from "../services/ocr"
import { incrementOCRCount } from "../services/config"
import OCRPreviewModal from "./OCRPreviewModal"
import LinkPopup from "./LinkPopup"

const parseProds = (pi) => Array.isArray(pi) ? pi : (pi||"").split(",").map(s=>s.trim()).filter(Boolean)

export default function Clientes({
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
      code: (() => { const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let c=""; for(let i=0;i<6;i++) c+=chars[Math.floor(Math.random()*chars.length)]; return "FIC-"+c })(),
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

    return (
      <div>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, flexWrap:"wrap" }}>
          <button onClick={()=>{
            setView(null);setActiveContrato(0)
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

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }}>
          {/* LEFT: Datos + Contrato */}
          <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:20 }}>
            <h3 style={{ fontSize:15, fontWeight:600, marginTop:0, marginBottom:16, color:C.accent }}>Datos del Cliente</h3>

            {/* OCR */}
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

            {/* ── Contrato ── */}
            {ct && (
              <div style={{ borderTop:`1px solid ${C.border}`, marginTop:14, paddingTop:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <h3 style={{ fontSize:15, fontWeight:600, margin:0, color:C.accent }}>
                    {ct.tipo==="contrato"?"Contrato":"Proforma"}{contratos.length>1?` #${activeContrato+1}`:""}
                  </h3>
                  <div style={{ display:"flex", gap:6 }}>
                    <div style={{ display:"inline-flex", borderRadius:20, background:C.bg, padding:2 }}>
                      <button onClick={()=>{if(ct.tipo!=="proforma"){if(!canChangeTipo()){alert("Limite de cambios alcanzado (3 por hora)");return}onUpdateContrato(c.id,ct.id,{tipo:"proforma"})}}} style={{ padding:"4px 14px", borderRadius:18, border:"none", cursor:"pointer", fontSize:11, fontWeight:700, background:ct.tipo!=="contrato"?C.yellow:C.bg, color:ct.tipo!=="contrato"?"#fff":C.muted, transition:"all .2s" }}>Proforma</button>
                      <button onClick={()=>{if(ct.tipo!=="contrato"){if(!canChangeTipo()){alert("Limite de cambios alcanzado (3 por hora)");return}onUpdateContrato(c.id,ct.id,{tipo:"contrato"})}}} style={{ padding:"4px 14px", borderRadius:18, border:"none", cursor:"pointer", fontSize:11, fontWeight:700, background:ct.tipo==="contrato"?C.green:C.bg, color:ct.tipo==="contrato"?"#fff":C.muted, transition:"all .2s" }}>Contrato</button>
                    </div>
                    <button onClick={()=>onUpdateContrato(c.id,ct.id,{estado:ct.estado==="finalizado"?"activo":"finalizado"})} style={{ padding:"4px 12px", borderRadius:20, border:"none", cursor:"pointer", fontSize:11, fontWeight:700, background:ct.estado==="finalizado"?C.blue+"33":C.border, color:ct.estado==="finalizado"?C.blue:C.muted }}>
                      {ct.estado==="finalizado"?"✓ Finalizado":"En curso"}
                    </button>
                  </div>
                </div>

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

                {/* Producto de interés */}
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

                {/* Archivos de contrato */}
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
                                ? <img src={item.url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
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
              </div>
            )}
            <div style={{ marginTop:12, fontSize:11, color:C.muted }}>Creado por {c.created_by_name} — {fmtDate(c.created_at)}</div>
          </div>

          {/* RIGHT: Pagos */}
          {ct && (adm||(user.permissions||[]).includes("pagos")) && (
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
            <div style={{ fontSize:12, color:C.muted }}>{clients.length} clientes</div>
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
          <button onClick={addNew} style={{ ...btn, background:C.blue }}>+ Registrar Anterior</button>
        </div>
      </div>

      {filteredClients.length===0 ? (
        <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:40, textAlign:"center", color:C.muted }}>
          No hay fichas de clientes.
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:14 }}>
          {filteredClients.map(c => {
            const cts = getContratos(c)
            const visits = cts.length
            const lastCt = cts[cts.length-1]
            const totalAdel2 = (lastCt?.adelantos||[]).filter(a=>!a.invalid).reduce((s,a)=>s+(Number(a.monto)||0),0)
            const resto2 = (Number(lastCt?.total)||0) - totalAdel2
            const paid = resto2<=0 && Number(lastCt?.total)>0
            return (
              <div key={c.id} onClick={()=>{if(selectedFichas.size>0){toggleSelect(c.id,{stopPropagation:()=>{}})}else{setView(c.id);setActiveContrato(cts.length-1)}}} style={{ background:C.card, border:`1px solid ${selectedFichas.has(c.id)?C.accent:c.erronea?C.red+"88":C.border}`, borderLeft:`3px solid ${c.erronea?C.red:!(c.reg_ids||[]).length?C.blue:C.accent}`, borderRadius:12, padding:"16px 18px", cursor:"pointer", textAlign:"left", transition:"all .2s", opacity:c.erronea?.7:1, position:"relative" }}>
                {adm && (
                  <div onClick={e=>toggleSelect(c.id,e)} style={{ position:"absolute", top:10, right:10, width:20, height:20, borderRadius:6, border:`2px solid ${selectedFichas.has(c.id)?C.accent:C.border}`, background:selectedFichas.has(c.id)?C.accent:"transparent", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", zIndex:1, transition:"all .15s" }}>
                    {selectedFichas.has(c.id) && <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="3"><path d="M2 6l3 3 5-5"/></svg>}
                  </div>
                )}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6, paddingRight:adm?28:0 }}>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:15, fontWeight:700, color:c.erronea?C.red:C.text }}>{c.nombre||"Sin nombre"}</span>
                      {c.code && <span style={{ fontSize:9, fontWeight:700, color:C.cyan, fontFamily:"monospace", background:C.cyan+"18", padding:"1px 5px", borderRadius:4 }}>{c.code}</span>}
                      {c.erronea && <span style={{ fontSize:9, fontWeight:700, color:C.red, background:C.red+"22", padding:"1px 6px", borderRadius:4 }}>Erronea</span>}
                    </div>
                    <div style={{ fontSize:12, color:C.muted }}>{(c.phones||[])[0]||"Sin número"}</div>
                  </div>
                  <div style={{ display:"flex", gap:4, flexDirection:"column", alignItems:"flex-end" }}>
                    <span style={{ padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700, background:lastCt?.tipo==="contrato"?C.green+"22":C.yellow+"22", color:lastCt?.tipo==="contrato"?C.green:C.yellow }}>
                      {lastCt?.tipo==="contrato"?"Contrato":"Proforma"}
                    </span>
                    {visits>1 && <span style={{ padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700, background:C.purple+"33", color:C.purple }}>{visits} visitas</span>}
                    {paid ? <span style={{ padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700, background:C.green+"33", color:C.green }}>PAGADO</span>
                      : Number(lastCt?.total)>0 ? <span style={{ padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700, background:C.yellow+"33", color:C.yellow }}>DEBE S/{resto2.toFixed(0)}</span>
                      : null}
                  </div>
                </div>
                {lastCt?.producto_interes && (Array.isArray(lastCt.producto_interes)?lastCt.producto_interes.length>0:lastCt.producto_interes) && (
                  <div style={{ fontSize:12, color:C.accent, marginBottom:4 }}>
                    {Array.isArray(lastCt.producto_interes)?lastCt.producto_interes.join(", "):lastCt.producto_interes}
                  </div>
                )}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:4 }}>
                  <span style={{ fontSize:11, color:C.muted }}>{c.created_by_name} — {fmtDate(c.created_at)}</span>
                  {adm && (
                    <span onClick={async e=>{e.stopPropagation();await onUpdateClient(c.id,"hidden",!c.hidden)}} style={{ padding:"2px 8px", borderRadius:8, fontSize:10, fontWeight:600, cursor:"pointer", background:c.hidden?C.red+"22":C.green+"22", color:c.hidden?C.red:C.green }}>
                      {c.hidden?"Oculto":"Visible"}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
