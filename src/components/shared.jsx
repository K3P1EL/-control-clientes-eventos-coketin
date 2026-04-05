import { useState, useEffect, useRef } from 'react'
import { C } from '../lib/colors'

// ─── Shared styles ────────────────────────────────────────────────────────────
export const lbl = { display:"block", fontSize:12, fontWeight:600, color:C.muted, marginBottom:4, marginTop:12 }
export const inp = { width:"100%", padding:"10px 12px", borderRadius:8, border:`1px solid ${C.border}`, background:C.inputBg, color:C.text, fontSize:14, outline:"none", boxSizing:"border-box", marginBottom:4 }
export const mi  = { padding:"4px 8px", borderRadius:6, border:`1px solid ${C.border}`, background:C.inputBg, color:C.text, fontSize:13, outline:"none", boxSizing:"border-box" }
export const sel = { background:"transparent", border:"none", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", outline:"none", padding:"4px 8px", width:"100%", textAlign:"center" }
export const btn = { padding:"10px 20px", borderRadius:8, border:"none", background:C.accent, color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer" }
export const btnD= { padding:"10px 20px", borderRadius:8, border:"none", background:C.danger, color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer" }
export const td  = { padding:10, verticalAlign:"middle" }
export const ib  = { background:"none", border:"none", cursor:"pointer", padding:2 }

export const CSS = `
  select option { background:#1e3045; color:#e0e6ed; padding:6px 10px }
  select option:checked { background:#00d4aa; color:#fff }
  input[type="date"]::-webkit-calendar-picker-indicator { filter:invert(0.7) }
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
  @media(max-width:768px){.desk-side{display:none !important}.mob-side{display:flex !important}.mob-btn{display:block !important}}
`

// ─── Small components ─────────────────────────────────────────────────────────
export function Loader() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:C.bg, color:C.accent, fontFamily:"sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:40, height:40, border:`3px solid ${C.border}`, borderTop:`3px solid ${C.accent}`, borderRadius:"50%", animation:"spin 1s linear infinite", margin:"0 auto 16px" }} />
        Cargando...
      </div>
    </div>
  )
}

export function Bdg({ c, children }) {
  return (
    <div style={{ display:"inline-flex", alignItems:"center", borderRadius:20, background:c, minWidth:44, justifyContent:"center" }}>
      {children}
    </div>
  )
}

export function Stat({ l, v, c }) {
  return (
    <div style={{ background:C.card, borderRadius:12, padding:"16px 24px", flex:"1 1 140px", minWidth:140, border:`1px solid ${C.border}`, borderLeft:`4px solid ${c}` }}>
      <div style={{ fontSize:28, fontWeight:700, color:c }}>{v}</div>
      <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>{l}</div>
    </div>
  )
}

// Debounced input: edits locally, commits to DB after 400ms of no typing
export function DInput({ value, onCommit, tag = "input", ...props }) {
  const [local, setLocal] = useState(value ?? "")
  const timer = useRef(null)
  const mounted = useRef(true)

  useEffect(() => { setLocal(value ?? "") }, [value])
  useEffect(() => () => { mounted.current = false; clearTimeout(timer.current) }, [])

  const handleChange = (e) => {
    const v = e.target.value
    setLocal(v)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { if (mounted.current && onCommit) onCommit(v) }, 400)
  }

  const handleBlur = () => {
    clearTimeout(timer.current)
    if (local !== (value ?? "") && onCommit) onCommit(local)
  }

  const Tag = tag
  return <Tag {...props} value={local} onChange={handleChange} onBlur={handleBlur} />
}

// ─── Safe image with fallback ─────────────────────────────────────────────────
export function SafeImg({ src, alt = "", style, ...props }) {
  const [err, setErr] = useState(false)
  if (err || !src) return (
    <div style={{ ...style, background: C.cardAlt, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="24" height="24" fill="none" stroke={C.muted} strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
    </div>
  )
  return <img src={src} alt={alt} style={style} onError={() => setErr(true)} {...props} />
}

// ─── Toast notifications ──────────────────────────────────────────────────────
let _toastListener = null
const _toastQueue = []

export function toast(msg, type = "error") {
  const t = { id: Date.now(), msg, type }
  _toastQueue.push(t)
  _toastListener?.([..._toastQueue])
  setTimeout(() => {
    const idx = _toastQueue.findIndex(x => x.id === t.id)
    if (idx >= 0) _toastQueue.splice(idx, 1)
    _toastListener?.([..._toastQueue])
  }, 4000)
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])
  useEffect(() => { _toastListener = setToasts; return () => { _toastListener = null } }, [])
  if (!toasts.length) return null
  return (
    <div style={{ position:"fixed", top:16, right:16, zIndex:9999, display:"flex", flexDirection:"column", gap:8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background:t.type==="error"?C.danger:t.type==="success"?C.green:C.yellow, color:"#fff", padding:"10px 18px", borderRadius:10, fontSize:13, fontWeight:600, boxShadow:"0 4px 12px rgba(0,0,0,.3)", animation:"fadeIn .2s", maxWidth:360 }}>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

export function AuthWrap({ title, sub, icon, iconBg, children }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:C.bg, fontFamily:"'Segoe UI',sans-serif" }}>
      <div style={{ background:C.card, borderRadius:16, padding:"40px 36px", width:380, border:`1px solid ${C.border}` }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ width:48, height:48, background:iconBg||C.accent, borderRadius:12, display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>{icon}</div>
          <h1 style={{ color:C.text, fontSize:22, margin:"0 0 4px", fontWeight:700 }}>{title}</h1>
          {sub && <p style={{ color:C.muted, fontSize:14, margin:0 }}>{sub}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}
