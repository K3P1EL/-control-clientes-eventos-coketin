import { useState } from "react"
import { C } from "../lib/colors"

export default function Agenda({ clients, user, adm, goToClient, onUpdateContrato }) {
  const [filter, setFilter] = useState("pendiente")

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`
  const maxDays = adm ? Infinity : (user.agenda_days ?? 30)
  const scope = adm ? "all" : (user.agenda_scope || "own")

  const allContratos = []
  clients.filter(c => !c.erronea).forEach(c => {
    ;(c.contratos || []).forEach(ct => {
      if (ct.fecha_evento || ct.fecha_armado) {
        allContratos.push({
          ...ct,
          clientId:      c.id,
          clientName:    c.nombre || "Sin nombre",
          clientCode:    c.code,
          clientPhone:   (c.phones||[])[0] || "",
          createdByName: c.created_by_name,
        })
      }
    })
  })

  const filtered = allContratos.filter(ct => {
    // Hidden by admin
    if (!adm && ct.hidden_agenda) return false
    // Scope filter for non-admins
    if (!adm) {
      const owner = clients.find(c=>c.id===ct.clientId)
      if (scope === "own" && owner?.created_by !== user.id) return false
      if (scope === "local" && ct.local && ct.local !== user.local) {
        // fallback: check if owner was created by same user
        if (owner?.created_by !== user.id) return false
      }
    }
    // Days limit for non-admins
    if (!adm && maxDays !== Infinity) {
      const ev = ct.fecha_evento || ""
      if (!ev) return false
      const diff = Math.floor((new Date(ev+"T00:00:00") - new Date(todayStr+"T00:00:00")) / 86400000)
      if (diff < 0 || diff > maxDays) return false
    }
    const evDate = ct.fecha_evento || ""
    const done   = ct.estado === "finalizado"
    if (filter === "finalizado") return done
    if (done) return false
    if (filter === "todo") return true
    if (filter === "hoy") return evDate === todayStr
    if (filter === "semana") {
      if (!evDate) return true
      const d = new Date(evDate + "T00:00:00")
      const diff = Math.floor((d - new Date(todayStr + "T00:00:00")) / 86400000)
      return diff >= 0 && diff <= 7
    }
    if (!evDate) return true
    return evDate >= todayStr
  }).sort((a,b) => (a.fecha_evento||"9999").localeCompare(b.fecha_evento||"9999"))

  const fmtD = d => { if(!d) return "Sin fecha"; const p=d.split("-"); return `${p[2]}/${p[1]}/${p[0]}` }
  const isOverdue = d => d && d < todayStr
  const estColors = { proforma:C.yellow, contrato:C.green }

  const filterBtns = [["pendiente","Pendientes"],["hoy","Hoy"],["semana","Semana"],["todo","Todos"],["finalizado","Finalizados"]]

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>Agenda de Contratos</h2>
        <div style={{ display:"flex", gap:0 }}>
          {filterBtns.map(([v,l],i) => (
            <button key={v} onClick={()=>setFilter(v)} style={{
              padding:"6px 12px", border:`1px solid ${C.border}`,
              background:filter===v?C.accent+"22":C.inputBg,
              color:filter===v?C.accent:C.muted,
              cursor:"pointer", fontSize:11, fontWeight:600,
              borderRadius: i===0?"8px 0 0 8px":i===filterBtns.length-1?"0 8px 8px 0":"0",
              borderLeft: i===0 ? undefined : "none",
            }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ fontSize:13, color:C.muted, marginBottom:16 }}>{filtered.length} contratos</div>

      {filtered.length === 0 ? (
        <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:40, textAlign:"center", color:C.muted }}>
          No hay contratos en este filtro.
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {filtered.map(ct => {
            const overdue = isOverdue(ct.fecha_evento)
            const prods = Array.isArray(ct.producto_interes) ? ct.producto_interes.join(", ") : (ct.producto_interes||"")
            const totalAdel = (ct.adelantos||[]).filter(a=>!a.invalid).reduce((s,a)=>s+(Number(a.monto)||0),0)
            const resto = (Number(ct.total)||0) - totalAdel
            return (
              <button key={ct.id} onClick={()=>goToClient(ct.clientId)} style={{
                background:C.card, border:`1px solid ${overdue?C.red+"66":C.border}`, borderRadius:12,
                padding:"14px 18px", cursor:"pointer", textAlign:"left", transition:"all .15s",
                display:"flex", gap:16, alignItems:"center",
                borderLeft:`4px solid ${overdue?C.red:(ct.tipo==="contrato"?C.green:C.yellow)}`,
              }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent}
              onMouseLeave={e=>e.currentTarget.style.borderColor=overdue?C.red+"66":C.border}
              >
                <div style={{ minWidth:80, textAlign:"center" }}>
                  <div style={{ fontSize:13, fontWeight:700, color:overdue?C.red:C.text }}>{fmtD(ct.fecha_evento)}</div>
                  <div style={{ fontSize:10, color:C.muted }}>Evento</div>
                  {ct.fecha_armado && ct.fecha_armado !== ct.fecha_evento && <>
                    <div style={{ fontSize:11, fontWeight:600, color:C.blue, marginTop:4 }}>{fmtD(ct.fecha_armado)}</div>
                    <div style={{ fontSize:10, color:C.muted }}>Armado</div>
                  </>}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                    <span style={{ fontSize:15, fontWeight:700, color:C.text }}>{ct.clientName}</span>
                    {ct.clientCode && <span style={{ fontSize:9, fontWeight:700, color:C.cyan, fontFamily:"monospace", background:C.cyan+"18", padding:"1px 5px", borderRadius:4 }}>{ct.clientCode}</span>}
                  </div>
                  {prods && <div style={{ fontSize:12, color:C.accent, marginBottom:2 }}>{prods}</div>}
                  <div style={{ fontSize:11, color:C.muted }}>{ct.createdByName}{ct.clientPhone ? ` · ${ct.clientPhone}` : ""}</div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:4, alignItems:"flex-end", flexShrink:0 }}>
                  <span style={{ padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700, background:(estColors[ct.tipo]||C.yellow)+"33", color:estColors[ct.tipo]||C.yellow }}>
                    {ct.tipo==="contrato"?"Contrato":"Proforma"}
                  </span>
                  {Number(ct.total)>0 && (
                    <span style={{ padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700, background:resto<=0?C.green+"33":C.yellow+"33", color:resto<=0?C.green:C.yellow }}>
                      {resto<=0?"Pagado":`Debe S/${resto.toFixed(0)}`}
                    </span>
                  )}
                  {overdue && <span style={{ padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700, background:C.red+"33", color:C.red }}>Vencido</span>}
                  {ct.estado==="finalizado" && <span style={{ padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700, background:C.green+"33", color:C.green }}>Finalizado</span>}
                  {adm && <button onClick={e=>{e.stopPropagation();onUpdateContrato(ct.clientId,ct.id,{hidden_agenda:!ct.hidden_agenda})}} style={{ padding:"2px 8px", borderRadius:10, fontSize:9, fontWeight:600, border:"none", cursor:"pointer", background:ct.hidden_agenda?C.yellow+"33":C.border, color:ct.hidden_agenda?C.yellow:C.muted, marginTop:2 }}>
                    {ct.hidden_agenda?"Oculto":"Ocultar"}
                  </button>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
