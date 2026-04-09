import { memo } from "react"
import { C } from "../../lib/colors"
import { today } from "../../lib/helpers"

const toD   = d => { const p=d.split("/"); return `${p[2]}-${p[1]}-${p[0]}` }
const fromD = d => { const p=d.split("-"); return `${p[2]}/${p[1]}/${p[0]}` }

// Header + filtros del Registro: volver, título, rango temporal,
// navegación de fecha, selector local, toggle todo/últimos 5,
// botones + Local / + WhatsApp y export Excel (admin).
export default memo(function RegistroToolbar({
  adm, viewName, rowsCount,
  date, setDate, dateRange, setDateRange, shift,
  selLocal, setSelLocal, locales,
  showAll, setShowAll,
  setViewUser, addReg, exportExcel,
}) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        {adm && (
          <button onClick={()=>setViewUser(null)} style={{ background:C.inputBg, border:`1px solid ${C.border}`, color:C.accent, borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>Volver
          </button>
        )}
        <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>{viewName}</h2>
        {adm && <span style={{ fontSize:12, color:C.muted }}>{rowsCount} registros</span>}
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
  )
})
