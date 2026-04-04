import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { getOCRUsage } from "../services/config"
import { listStorageFiles, deleteStorageFile } from "../services/storage"
import { C } from "../lib/colors"
import { Stat } from "./shared"
import { today } from "../lib/helpers"

const BUCKET_LIMIT = 1 * 1024 * 1024 * 1024 // 1GB free tier
const OCR_FREE = 1000

function StorageUsage() {
  const [usage, setUsage] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    (async () => {
      try {
        let totalSize = 0
        for (const folder of ["registros", "contratos", "almacen"]) {
          const { data, error: listErr } = await supabase.storage.from("archivos").list(folder, { limit: 1000 })
          if (listErr) throw listErr
          if (data) totalSize += data.reduce((sum, f) => sum + (f.metadata?.size || 0), 0)
        }
        setUsage(totalSize)
      } catch (e) {
        console.error("Storage usage error:", e)
        setError(e.message)
      }
    })()
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
  const [selected, setSelected] = useState(new Set())

  const load = async (f) => {
    setFolder(f); setLoading(true); setSelected(new Set())
    try { setFiles(await listStorageFiles(f)) } catch { setFiles([]) }
    setLoading(false)
  }

  useEffect(() => { load("registros") }, [])

  const deleteSelected = async () => {
    if (!window.confirm(`¿Eliminar ${selected.size} archivo${selected.size>1?"s":""} permanentemente del storage?`)) return
    for (const path of selected) {
      await deleteStorageFile(path).catch(() => {})
    }
    setSelected(new Set())
    load(folder)
  }

  const fmtSize = (b) => !b ? "—" : b < 1024 ? `${b}B` : b < 1024*1024 ? `${(b/1024).toFixed(0)}KB` : `${(b/(1024*1024)).toFixed(1)}MB`
  const totalSize = files.reduce((s,f) => s + (f.metadata?.size||0), 0)

  return (
    <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:20, marginTop:24 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <h3 style={{ fontSize:15, fontWeight:600, margin:0 }}>Archivos en Storage</h3>
        <span style={{ fontSize:12, color:C.muted }}>{files.length} archivos — {fmtSize(totalSize)}</span>
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:12 }}>
        {["registros","contratos","almacen"].map(f => (
          <button key={f} onClick={()=>load(f)} style={{ padding:"4px 14px", borderRadius:14, border:"none", cursor:"pointer", fontSize:11, fontWeight:600, background:folder===f?C.accent+"33":C.border, color:folder===f?C.accent:C.muted }}>{f}</button>
        ))}
        {selected.size > 0 && <button onClick={deleteSelected} style={{ marginLeft:"auto", padding:"4px 14px", borderRadius:14, border:"none", cursor:"pointer", fontSize:11, fontWeight:600, background:C.danger+"33", color:C.danger }}>Eliminar {selected.size}</button>}
      </div>
      {loading ? <div style={{ padding:20, textAlign:"center", color:C.muted }}>Cargando...</div> : (
        <div style={{ maxHeight:300, overflow:"auto" }}>
          {!files.length && <div style={{ padding:20, textAlign:"center", color:C.muted, fontSize:12 }}>Carpeta vacia</div>}
          {files.map(f => (
            <div key={f.name} onClick={()=>setSelected(prev=>{const s=new Set(prev);if(s.has(f.path))s.delete(f.path);else s.add(f.path);return s})} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 8px", borderRadius:6, cursor:"pointer", background:selected.has(f.path)?C.accent+"12":"transparent", borderBottom:`1px solid ${C.border}22` }}>
              <div style={{ width:16, height:16, borderRadius:4, border:`2px solid ${selected.has(f.path)?C.accent:C.border}`, background:selected.has(f.path)?C.accent:"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                {selected.has(f.path) && <svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="3"><path d="M1 5l3 3 5-5"/></svg>}
              </div>
              <span style={{ flex:1, fontSize:11, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.name}</span>
              <span style={{ fontSize:10, color:C.muted, flexShrink:0 }}>{fmtSize(f.metadata?.size)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function OcrUsage() {
  const [usage, setUsage] = useState(null)
  useEffect(() => { getOCRUsage().then(setUsage).catch(() => {}) }, [])

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
