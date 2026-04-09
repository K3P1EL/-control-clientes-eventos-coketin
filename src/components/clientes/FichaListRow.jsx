import { memo } from "react"
import { C } from "../../lib/colors"
import { fmtDate } from "../../lib/helpers"

// Lógica de estado/canal duplicada de Clientes.jsx para mantener
// una sola fuente. Si cambian las reglas, cambiar en ambos sitios.
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
  const first = regs.find(x => x.id === rids[0])
  return first?.canal || null
}

// Una fila de la lista de fichas + su panel expandible de contratos.
// Sin estado propio: todo viene por props desde Clientes.jsx.
export default memo(function FichaListRow({
  c, regs, adm,
  selected, expanded,
  onToggleSelect,
  onToggleExpand,
  onOpenFicha,        // (clientId, contratoIdx) => void
  onUpdateClient,     // (id, field, val) => void
}) {
  const cts = c.contratos || []
  const visits = cts.length
  const lastCt = cts[cts.length - 1]
  const totalAdel = (lastCt?.adelantos || []).filter(a => !a.invalid).reduce((s, a) => s + (Number(a.monto) || 0), 0)
  const resto = (Number(lastCt?.total) || 0) - totalAdel
  const paid = resto <= 0 && Number(lastCt?.total) > 0
  const status = fichaStatus(c, regs)
  const sc = STATUS_COLORS[status]
  const ch = fichaCanal(c, regs)

  return (
    <div style={{ borderRadius:10, overflow:"hidden", border:`1px solid ${selected?C.accent:expanded?C.accent+"66":C.border}`, transition:"all .2s" }}>
      <div onClick={onToggleExpand} style={{ background:C.card, borderLeft:`3px solid ${sc}`, padding:"10px 16px", cursor:"pointer", opacity:c.erronea?0.7:1, display:"flex", alignItems:"center", gap:12 }}>
        {adm && (
          <div onClick={e=>{e.stopPropagation();onToggleSelect(c.id)}} style={{ width:20, height:20, borderRadius:6, border:`2px solid ${selected?C.accent:C.border}`, background:selected?C.accent:"transparent", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0, transition:"all .15s" }}>
            {selected && <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="3"><path d="M2 6l3 3 5-5"/></svg>}
          </div>
        )}
        <div style={{ width:4, height:32, borderRadius:2, background:sc, flexShrink:0 }} />
        <div style={{ flex:"1 1 0", minWidth:0, display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
          <div style={{ minWidth:140, flex:"1 1 140px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:14, fontWeight:700, color:c.erronea?C.red:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.nombre||"Sin nombre"}</span>
              {c.code && <span style={{ fontSize:9, fontWeight:700, color:C.cyan, fontFamily:"monospace", background:C.cyan+"18", padding:"1px 5px", borderRadius:4 }}>{c.code}</span>}
              {c.erronea && <span style={{ fontSize:9, fontWeight:700, color:C.red, background:C.red+"22", padding:"1px 6px", borderRadius:4 }}>Erronea</span>}
              {ch === "W" ? <span style={{ fontSize:9, fontWeight:600, color:"#25D366", background:"#25D36618", padding:"1px 5px", borderRadius:4 }}>WA</span> : ch === "F" ? <span style={{ fontSize:9, fontWeight:600, color:C.purple, background:C.purple+"18", padding:"1px 5px", borderRadius:4 }}>Local</span> : null}
            </div>
            <div style={{ fontSize:11, color:C.muted }}>{(c.phones||[])[0]||"Sin número"}</div>
          </div>
          <div style={{ display:"flex", gap:4, alignItems:"center", flexShrink:0 }}>
            <span style={{ padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700, background:lastCt?.tipo==="contrato"?C.green+"22":C.yellow+"22", color:lastCt?.tipo==="contrato"?C.green:C.yellow }}>
              {lastCt?.tipo==="contrato"?"Contrato":"Proforma"}
            </span>
            {visits>1 && <span style={{ padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700, background:C.purple+"33", color:C.purple }}>{visits}x</span>}
            {paid ? <span style={{ padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700, background:C.green+"33", color:C.green }}>PAGADO</span>
              : Number(lastCt?.total)>0 ? <span style={{ padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700, background:C.yellow+"33", color:C.yellow }}>S/{resto.toFixed(0)}</span>
              : null}
          </div>
          <span style={{ fontSize:11, color:C.muted, flexShrink:0 }}>{c.created_by_name} — {fmtDate(c.created_at)}</span>
          {adm && (
            <span onClick={async e=>{e.stopPropagation();await onUpdateClient(c.id,"hidden",!c.hidden)}} style={{ padding:"2px 8px", borderRadius:8, fontSize:10, fontWeight:600, cursor:"pointer", background:c.hidden?C.red+"22":C.green+"22", color:c.hidden?C.red:C.green, flexShrink:0 }}>
              {c.hidden?"Oculto":"Visible"}
            </span>
          )}
          <svg width="14" height="14" fill="none" stroke={C.muted} strokeWidth="2" style={{ flexShrink:0, transition:"transform .2s", transform:expanded?"rotate(180deg)":"rotate(0)" }}><path d="M3 5l4 4 4-4"/></svg>
        </div>
      </div>
      {expanded && (
        <div style={{ background:C.cardAlt, borderTop:`1px solid ${C.border}`, padding:"12px 16px", animation:"fadeIn .15s" }}>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            {cts.map((ct, idx) => {
              const adel = (ct.adelantos||[]).filter(a=>!a.invalid).reduce((s,a)=>s+(Number(a.monto)||0),0)
              const r = (Number(ct.total)||0) - adel
              const p = r<=0 && Number(ct.total)>0
              return (
                <button key={ct.id} onClick={()=>onOpenFicha(c.id, idx)} style={{
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
            <button onClick={()=>onOpenFicha(c.id, cts.length-1)} style={{ background:C.accent+"15", border:`1px dashed ${C.accent}44`, borderRadius:10, padding:"10px 14px", cursor:"pointer", color:C.accent, fontSize:12, fontWeight:700, minWidth:100 }}>
              Abrir ficha completa
            </button>
          </div>
        </div>
      )}
    </div>
  )
})
