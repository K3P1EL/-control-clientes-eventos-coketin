import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { getOCRUsage } from "../services/config"
import { listStorageFiles, deleteStorageFile } from "../services/storage"
import { C } from "../lib/colors"
import { Stat, SafeImg } from "./shared"
import { today } from "../lib/helpers"
import { LIMITS } from "../lib/constants"
import { logError } from "../lib/logger"

const BUCKET_LIMIT = LIMITS.STORAGE_BUCKET_BYTES
const OCR_FREE = LIMITS.OCR_FREE_TIER

function StorageUsage() {
  const [usage, setUsage] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        let totalSize = 0
        for (const folder of ["registros", "contratos", "almacen"]) {
          const { data, error: listErr } = await supabase.storage.from("archivos").list(folder, { limit: 1000 })
          if (listErr) throw listErr
          if (data) totalSize += data.reduce((sum, f) => sum + (f.metadata?.size || 0), 0)
        }
        if (mounted) setUsage(totalSize)
      } catch (e) {
        logError("StorageUsage", e)
        if (mounted) setError(e.message)
      }
    })()
    return () => { mounted = false }
  }, [])

  if (error) return <div style={{ color: C.muted, fontSize: 12 }}>No se pudo obtener el uso de storage</div>
  if (usage === null) return <div style={{ color: C.muted, fontSize: 12 }}>Calculando storage...</div>

  const pct = Math.min((usage / BUCKET_LIMIT) * 100, 100)
  const barColor = pct >= 80 ? C.red : pct >= 50 ? C.yellow : C.green
  const fmtSize = (b) => b < 1024*1024 ? `${(b/1024).toFixed(0)}KB` : b < 1024*1024*1024 ? `${(b/(1024*1024)).toFixed(1)}MB` : `${(b/(1024*1024*1024)).toFixed(2)}GB`

  return (
    <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, marginTop: 24 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 12 }}>Storage</h3>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: barColor }}>{fmtSize(usage)}</span>
        <span style={{ fontSize: 14, color: C.muted, alignSelf: "flex-end" }}>/ {fmtSize(BUCKET_LIMIT)}</span>
      </div>
      <div style={{ height: 10, borderRadius: 5, background: C.border, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 5, transition: "width .5s, background .5s" }} />
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{pct.toFixed(1)}% usado</div>
    </div>
  )
}

function StorageBrowser() {
  const [files, setFiles] = useState([])
  const [folder, setFolder] = useState("registros")
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(new Set())
  const [selected, setSelected] = useState(new Set())

  const load = async (f) => {
    setFolder(f); setLoading(true); setSelected(new Set())
    try { setFiles(await listStorageFiles(f)) } catch { setFiles([]) }
    setLoading(false)
  }

  useEffect(() => { load("registros") }, [])

  const toggleSelect = (path) => {
    setSelected(prev => {
      const s = new Set(prev)
      s.has(path) ? s.delete(path) : s.add(path)
      return s
    })
  }

  const selectAll = () => {
    if (selected.size === files.length) setSelected(new Set())
    else setSelected(new Set(files.map(f => f.path)))
  }

  const deleteOne = async (path) => {
    setDeleting(prev => new Set(prev).add(path))
    try {
      await deleteStorageFile(path)
      setFiles(prev => prev.filter(f => f.path !== path))
      setSelected(prev => { const s = new Set(prev); s.delete(path); return s })
    } catch (e) {
      alert("Error al eliminar: " + e.message)
    }
    setDeleting(prev => { const s = new Set(prev); s.delete(path); return s })
  }

  const deleteSelected = async () => {
    if (!selected.size) return
    if (!window.confirm(`¿Eliminar ${selected.size} archivo(s) del storage?`)) return
    const paths = [...selected]
    paths.forEach(p => setDeleting(prev => new Set(prev).add(p)))
    const errors = []
    await Promise.all(paths.map(async p => {
      try { await deleteStorageFile(p) } catch (e) { errors.push(p + ": " + e.message) }
    }))
    if (errors.length) alert("Errores al eliminar:\n" + errors.join("\n"))
    // Recargar la lista real del storage en vez de confiar en el estado local
    try { setFiles(await listStorageFiles(folder)) } catch { }
    setSelected(new Set())
    setDeleting(new Set())
  }

  const fmtSize = (b) => !b ? "—" : b < 1024 ? `${b}B` : b < 1024*1024 ? `${(b/1024).toFixed(0)}KB` : `${(b/(1024*1024)).toFixed(1)}MB`
  const totalSize = files.reduce((s,f) => s + (f.metadata?.size||0), 0)
  const selectedSize = files.filter(f => selected.has(f.path)).reduce((s,f) => s + (f.metadata?.size||0), 0)
  const getUrl = (f) => { const { data } = supabase.storage.from("archivos").getPublicUrl(f.path); return data?.publicUrl }
  const isImage = (f) => f.metadata?.mimetype?.startsWith("image") || /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name)

  return (
    <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:20, marginTop:24 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <h3 style={{ fontSize:15, fontWeight:600, margin:0 }}>Archivos en Storage</h3>
        <span style={{ fontSize:12, color:C.muted }}>{files.length} archivos — {fmtSize(totalSize)}</span>
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
        {["registros","contratos","almacen"].map(f => (
          <button key={f} onClick={()=>load(f)} style={{ padding:"5px 16px", borderRadius:14, border:"none", cursor:"pointer", fontSize:12, fontWeight:600, background:folder===f?C.accent+"33":C.border, color:folder===f?C.accent:C.muted }}>{f}</button>
        ))}
        <button onClick={()=>load(folder)} style={{ marginLeft:"auto", background:"none", border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, cursor:"pointer", padding:"4px 10px", fontSize:11 }}>Recargar</button>
      </div>
      {files.length > 0 && (
        <div style={{ display:"flex", gap:8, marginBottom:10, alignItems:"center" }}>
          <button onClick={selectAll} style={{ padding:"4px 12px", borderRadius:8, border:`1px solid ${C.border}`, background:selected.size===files.length?C.accent+"33":"none", color:selected.size===files.length?C.accent:C.muted, cursor:"pointer", fontSize:11, fontWeight:600 }}>
            {selected.size===files.length ? "Deseleccionar todo" : "Seleccionar todo"}
          </button>
          {selected.size > 0 && (
            <>
              <span style={{ fontSize:11, color:C.accent, fontWeight:600 }}>{selected.size} seleccionado(s) — {fmtSize(selectedSize)}</span>
              <button onClick={deleteSelected} style={{ padding:"4px 14px", borderRadius:8, border:"none", background:C.danger, color:"#fff", cursor:"pointer", fontSize:11, fontWeight:700 }}>
                Eliminar {selected.size}
              </button>
            </>
          )}
        </div>
      )}
      {loading ? <div style={{ padding:30, textAlign:"center", color:C.muted }}>Cargando...</div> : (
        <>
          {!files.length && <div style={{ padding:30, textAlign:"center", color:C.muted, fontSize:13 }}>Carpeta vacia</div>}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(110px, 1fr))", gap:10, maxHeight:400, overflow:"auto" }}>
            {files.map(f => {
              const url = getUrl(f)
              const isDel = deleting.has(f.path)
              const isSel = selected.has(f.path)
              return (
                <div key={f.name} onClick={()=>toggleSelect(f.path)} style={{ borderRadius:10, border:`2px solid ${isSel?C.accent:C.border}`, opacity:isDel?0.3:1, transition:"opacity .2s, border-color .2s", cursor:"pointer", position:"relative" }}>
                  <div style={{ position:"absolute", top:6, left:6, zIndex:10, width:22, height:22, borderRadius:5, background:isSel?C.accent:"rgba(0,0,0,0.6)", border:`2px solid ${isSel?C.accent:"rgba(255,255,255,0.5)"}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", boxShadow:"0 1px 4px rgba(0,0,0,0.4)" }}>
                    {isSel && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7L6 10L11 4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <div onClick={e=>{e.stopPropagation();window.open(url,"_blank")}} style={{ aspectRatio:"1", cursor:"pointer", background:C.cardAlt, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:"8px 8px 0 0", overflow:"hidden" }}>
                    {isImage(f) ? <SafeImg src={url} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} />
                    : <div style={{ textAlign:"center" }}><svg width="24" height="24" fill="none" stroke={C.muted} strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg><div style={{ fontSize:9, color:C.muted, marginTop:2 }}>{f.name.split('.').pop()?.toUpperCase()}</div></div>}
                  </div>
                  <div style={{ padding:"5px 6px", background:C.cardAlt, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:8, color:C.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.name}</div>
                      <div style={{ fontSize:9, color:C.yellow, fontWeight:600 }}>{fmtSize(f.metadata?.size)}</div>
                    </div>
                    <button onClick={e=>{e.stopPropagation();if(window.confirm("¿Eliminar del storage?"))deleteOne(f.path)}} disabled={isDel} style={{ background:C.danger+"22", border:"none", borderRadius:4, color:C.danger, cursor:"pointer", padding:"2px 5px", fontSize:9, flexShrink:0 }}>x</button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function OcrUsage() {
  const [usage, setUsage] = useState(null)
  useEffect(() => {
    let mounted = true
    getOCRUsage().then(u => { if (mounted) setUsage(u) }).catch(() => {})
    return () => { mounted = false }
  }, [])

  const count = usage?.count || 0
  const pct = Math.min((count / OCR_FREE) * 100, 100)
  const barColor = pct >= 80 ? C.red : pct >= 50 ? C.yellow : C.green
  const monthLabel = new Date().toLocaleDateString("es", { month:"long", year:"numeric" })

  return (
    <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:20, marginTop:24 }}>
      <h3 style={{ fontSize:15, fontWeight:600, marginTop:0, marginBottom:12 }}>Escaneos OCR este mes</h3>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:8 }}>
        <span style={{ fontSize:28, fontWeight:700, color:barColor }}>{count}</span>
        <span style={{ fontSize:14, color:C.muted }}>/ {OCR_FREE} gratis</span>
      </div>
      <div style={{ height:8, borderRadius:4, background:C.border, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:barColor, borderRadius:4, transition:"width .5s" }} />
      </div>
      <div style={{ fontSize:11, color:C.muted, marginTop:6 }}>
        {monthLabel} — {pct >= 100 ? "Limite gratis alcanzado" : `${OCR_FREE - count} escaneos restantes`}
      </div>
      {pct >= 80 && <div style={{ fontSize:11, color:C.yellow, marginTop:4 }}>Estas cerca del limite gratuito de Google Vision</div>}
    </div>
  )
}

export default function Dash({ regs, adm }) {
  const r = regs.filter(x => x.fecha === today())
  const est = {}
  r.forEach(x => { if (x.estado) est[x.estado] = (est[x.estado]||0) + 1 })
  const ages = r.filter(x => x.edad).map(x => +x.edad)
  const avg = ages.length ? Math.round(ages.reduce((a,b)=>a+b,0)/ages.length) : 0

  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:700, marginBottom:20 }}>Dashboard — Hoy ({today()})</h2>
      <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:24 }}>
        <Stat l="Total Clientes" v={r.length}                             c={C.accent}/>
        <Stat l="WhatsApp"       v={r.filter(x=>x.canal==="W").length}    c={C.teal}/>
        <Stat l="Físico"         v={r.filter(x=>x.canal==="F").length}    c={C.purple}/>
        <Stat l="Edad Promedio"  v={avg||"—"}                             c={C.blue}/>
      </div>
      <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:24 }}>
        <Stat l="Hombres"        v={r.filter(x=>x.sexo==="H").length}     c={C.blue}/>
        <Stat l="Mujeres"        v={r.filter(x=>x.sexo==="M").length}     c={C.pink}/>
        <Stat l="Piraña SI"      v={r.filter(x=>x.pirana==="S").length}   c={C.red}/>
        <Stat l="Piraña Posible" v={r.filter(x=>x.pirana==="P").length}   c={C.yellow}/>
      </div>
      <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:20 }}>
        <h3 style={{ fontSize:15, fontWeight:600, marginTop:0, marginBottom:16 }}>Estado de Clientes</h3>
        {!Object.keys(est).length && <p style={{ color:C.muted }}>Sin datos aún.</p>}
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          {Object.entries(est).map(([k,v]) => (
            <div key={k} style={{ background:C.cardAlt, borderRadius:10, padding:"12px 20px", textAlign:"center", minWidth:120 }}>
              <div style={{ fontSize:24, fontWeight:700, color:C.accent }}>{v}</div>
              <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>{k}</div>
            </div>
          ))}
        </div>
      </div>
      {adm && <StorageUsage />}
      {adm && <OcrUsage />}
      {adm && <StorageBrowser />}
    </div>
  )
}
