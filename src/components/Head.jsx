import { signOut } from "../services/auth"
import { C } from "../lib/colors"

export default function Head({ user, menu, onToggleViewMode }) {
  return (
    <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 24px", borderBottom:`1px solid ${C.border}`, background:C.sidebar, flexWrap:"wrap", gap:8 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={menu} className="mob-btn" style={{ display:"none", background:"none", border:"none", color:C.text, cursor:"pointer", padding:4 }}>
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
        </button>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:28, height:28, background:C.accent, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth="2"><rect x="2" y="2" width="10" height="10" rx="2"/></svg>
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:C.accent }}>CONTROL DE CLIENTES Y CONTRATOS</div>
            <div style={{ fontSize:11, color:C.muted }}>Gestiona fichas, contratos, proformas y seguimiento de eventos</div>
          </div>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        {onToggleViewMode && (
          <div style={{ display:"inline-flex", borderRadius:14, background:C.bg, padding:2 }}>
            <button onClick={()=>onToggleViewMode("simple")} style={{ padding:"3px 10px", borderRadius:12, border:"none", cursor:"pointer", fontSize:10, fontWeight:600, background:(user?.view_mode||"completo")==="simple"?C.yellow:C.bg, color:(user?.view_mode||"completo")==="simple"?"#fff":C.muted, transition:"all .2s" }}>Simple</button>
            <button onClick={()=>onToggleViewMode("completo")} style={{ padding:"3px 10px", borderRadius:12, border:"none", cursor:"pointer", fontSize:10, fontWeight:600, background:(user?.view_mode||"completo")==="completo"?C.accent:C.bg, color:(user?.view_mode||"completo")==="completo"?"#fff":C.muted, transition:"all .2s" }}>Completo</button>
          </div>
        )}
        <span style={{ fontSize:13, color:C.muted }}>{user?.name}</span>
        <button onClick={() => signOut()} title="Cerrar sesión" style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", padding:4 }}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
        </button>
      </div>
    </header>
  )
}
