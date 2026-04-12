import { memo } from "react"
import { C } from "../../lib/colors"
import { today } from "../../lib/helpers"
import { DInput, mi, ib } from "../shared"

const inp = { background: C.inputBg, border: `1px solid ${C.border}`, color: C.text, padding: "10px 14px", borderRadius: 8, fontSize: 14, outline: "none", marginBottom: 12, width: "100%", boxSizing: "border-box" }

// Panel derecho de la ficha: total del contrato + adelantos/pagos.
// Solo se muestra a admin o usuarios con permiso "pagos".
export default memo(function PaymentsPanel({
  c, ct, adm, user,
  onUpdateContrato, onAddAdelanto, onUpdateAdelanto, onDeleteAdelanto,
}) {
  if (!ct) return null
  if (!adm && !((user.permissions || []).includes("pagos"))) return null

  const totalAdel = (ct.adelantos || []).filter(a => !a.invalid).reduce((s, a) => s + (Number(a.monto) || 0), 0)
  const resto = (Number(ct.total) || 0) - totalAdel

  return (
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
          <div style={{ fontSize:20, fontWeight:700, color:resto<0?C.red:resto<=0&&Number(ct.total)>0?C.green:C.yellow }}>S/ {resto.toFixed(2)}</div>
          {resto<=0&&Number(ct.total)>0 && resto>=0 && <div style={{ fontSize:10, color:C.green, fontWeight:600 }}>✓ PAGADO</div>}
          {resto<0 && <div style={{ fontSize:10, color:C.red, fontWeight:600 }}>⚠ Excede el total</div>}
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
            <input type="date" value={a.fecha?a.fecha.split("/").length===3?`${a.fecha.split("/")[2]}-${a.fecha.split("/")[1]}-${a.fecha.split("/")[0]}`:(a.fecha||""):(a.fecha||"")} onChange={e=>{const v=e.target.value;if(!v){onUpdateAdelanto(c.id,ct.id,a.id,{fecha:""});return}const p=v.split("-");onUpdateAdelanto(c.id,ct.id,a.id,{fecha:`${p[2]}/${p[1]}/${p[0]}`})}} style={{ ...mi, width:110, fontSize:11, ...((locked||inv)?{opacity:.5}:{}) }} disabled={locked||inv} />
            <div style={{ display:"flex", alignItems:"center", gap:2 }}>
              <span style={{ fontSize:11, color:C.muted, ...(inv?{textDecoration:"line-through"}:{}) }}>S/</span>
              <DInput type="number" value={a.monto||""} onCommit={v=>{
                // Validate: sum of all valid adelantos (with this one updated) must not exceed total.
                if (Number(ct.total) > 0) {
                  const otherSum = (ct.adelantos||[]).filter(x=>!x.invalid && x.id !== a.id).reduce((s,x)=>s+(Number(x.monto)||0),0)
                  if (otherSum + (Number(v)||0) > Number(ct.total)) {
                    alert(`El total de adelantos (S/${otherSum + (Number(v)||0)}) superaría el total del contrato (S/${ct.total}).`)
                    return
                  }
                }
                onUpdateAdelanto(c.id,ct.id,a.id,{monto:v})
              }} style={{ ...mi, width:65, fontWeight:600, ...((locked||inv)?{opacity:.5,textDecoration:inv?"line-through":"none"}:{}) }} placeholder="0" disabled={locked||inv} />
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
  )
})
