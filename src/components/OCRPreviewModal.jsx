import { useState, useMemo } from "react"
import { C } from "../lib/colors"

const FIELDS = [
  { key:"nombre",       label:"Nombre del cliente", section:"cliente" },
  { key:"dni",          label:"DNI",                 section:"cliente" },
  { key:"telefono",     label:"Telefono",            section:"cliente" },
  { key:"direccion",    label:"Direccion",           section:"cliente" },
  { key:"referencia",   label:"Referencia",          section:"cliente" },
  { key:"fecha_evento", label:"Fecha de evento",     section:"contrato", type:"date" },
  { key:"total",        label:"Total (S/)",          section:"contrato", type:"number" },
  { key:"adelanto",     label:"Adelanto/Yape (S/)",  section:"contrato", type:"number" },
  { key:"saldo",        label:"Saldo (S/)",          section:"contrato", type:"number" },
  { key:"garantia",     label:"Garantia",            section:"contrato" },
  { key:"numero_contrato", label:"N. Contrato",      section:"contrato" },
  { key:"tipo_documento",  label:"Tipo documento",   section:"contrato" },
  { key:"descripcion_servicios", label:"Descripcion / Observaciones", section:"contrato", multiline:true },
]

const confColor = (level) => level === "alto" ? C.green : level === "medio" ? C.yellow : level === "bajo" ? C.red : C.muted
const confLabel = (level) => level === "alto" ? "Detectado" : level === "medio" ? "Probable" : level === "bajo" ? "Revisar" : "No detectado"

export default function OCRPreviewModal({ parsed, rawText, onApply, onCancel }) {
  const [fields, setFields] = useState(() => {
    const init = {}
    FIELDS.forEach(f => { init[f.key] = parsed[f.key] || "" })
    return init
  })
  const [showRaw, setShowRaw] = useState(false)

  const detectedCount = useMemo(() =>
    FIELDS.filter(f => parsed[f.key]).length
  , [parsed])

  const set = (k, v) => setFields(prev => ({ ...prev, [k]: v }))

  const clientFields = FIELDS.filter(f => f.section === "cliente")
  const contratoFields = FIELDS.filter(f => f.section === "contrato")

  const inputStyle = (key) => ({
    width:"100%", padding:"9px 11px", borderRadius:8,
    border:`1px solid ${parsed.confianza?.[key] ? confColor(parsed.confianza[key])+"66" : C.border}`,
    background: C.inputBg, color:C.text, fontSize:13, outline:"none", boxSizing:"border-box",
    fontFamily:"inherit",
  })

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,.75)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onCancel}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.card, borderRadius:16, width:"100%", maxWidth:620, maxHeight:"92vh", display:"flex", flexDirection:"column", border:`1px solid ${C.border}` }}>

        {/* Header */}
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <div>
            <h3 style={{ color:C.text, margin:0, fontSize:17, fontWeight:700 }}>Campos detectados por OCR</h3>
            <p style={{ color:C.muted, margin:"4px 0 0", fontSize:12 }}>{detectedCount} campos detectados — revisa y corrige antes de aplicar</p>
          </div>
          <button onClick={()=>setShowRaw(!showRaw)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, borderRadius:8, padding:"5px 12px", cursor:"pointer", fontSize:11 }}>
            {showRaw ? "Ocultar texto" : "Ver texto OCR"}
          </button>
        </div>

        {/* Raw text */}
        {showRaw && (
          <div style={{ padding:"10px 22px", background:C.bg, maxHeight:140, overflowY:"auto", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
            <pre style={{ color:C.muted, fontSize:11, margin:0, whiteSpace:"pre-wrap", wordBreak:"break-word", fontFamily:"monospace", lineHeight:1.6 }}>{rawText}</pre>
          </div>
        )}

        {/* Fields */}
        <div style={{ padding:"16px 22px", overflowY:"auto", flex:1 }}>
          {/* Client section */}
          <div style={{ fontSize:11, fontWeight:700, color:C.purple, marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>Datos del cliente</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:18 }}>
            {clientFields.map(f => (
              <div key={f.key}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                  <label style={{ color:C.text, fontSize:12, fontWeight:500 }}>{f.label}</label>
                  <span style={{ fontSize:10, color:confColor(parsed.confianza?.[f.key]), fontWeight:500 }}>{confLabel(parsed.confianza?.[f.key])}</span>
                </div>
                <input value={fields[f.key]} onChange={e=>set(f.key,e.target.value)} style={inputStyle(f.key)} placeholder="No detectado" />
              </div>
            ))}
          </div>

          {/* Contract section */}
          <div style={{ fontSize:11, fontWeight:700, color:C.blue, marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>Datos del contrato</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {contratoFields.map(f => (
              <div key={f.key} style={f.multiline ? { gridColumn:"span 2" } : {}}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                  <label style={{ color:C.text, fontSize:12, fontWeight:500 }}>{f.label}</label>
                  <span style={{ fontSize:10, color:confColor(parsed.confianza?.[f.key]), fontWeight:500 }}>{confLabel(parsed.confianza?.[f.key])}</span>
                </div>
                {f.multiline ? (
                  <textarea value={fields[f.key]} onChange={e=>set(f.key,e.target.value)} rows={4}
                    style={{ ...inputStyle(f.key), resize:"vertical", minHeight:80 }} placeholder="No detectado" />
                ) : (
                  <input type={f.type==="number"?"number":f.type==="date"?"date":"text"} value={fields[f.key]} onChange={e=>set(f.key,e.target.value)}
                    style={inputStyle(f.key)} placeholder={f.type==="date"?"":"No detectado"} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 22px", borderTop:`1px solid ${C.border}`, display:"flex", gap:12, flexShrink:0 }}>
          <button onClick={onCancel} style={{ flex:1, padding:11, borderRadius:10, background:"transparent", border:`1px solid ${C.border}`, color:C.muted, cursor:"pointer", fontSize:13, fontWeight:600 }}>Cancelar</button>
          <button onClick={()=>onApply(fields)} style={{ flex:2, padding:11, borderRadius:10, background:C.green, border:"none", color:"#fff", cursor:"pointer", fontSize:13, fontWeight:700 }}>Aplicar campos</button>
        </div>
      </div>
    </div>
  )
}
