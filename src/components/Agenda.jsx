import { useState, useMemo } from "react"
import { C } from "../lib/colors"

const DAYS_HEADER = ["Lu","Ma","Mi","Ju","Vi","Sa","Do"]
const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

export default function Agenda({ clients, user, adm, goToClient, onUpdateContrato }) {
  const [filter, setFilter] = useState("pendiente")
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [selectedDay, setSelectedDay] = useState(null)

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`
  const maxDays = adm ? Infinity : (user.agenda_days ?? 30)
  const scope = adm ? "all" : (user.agenda_scope || "own")

  const allContratos = useMemo(() => {
    const result = []
    clients.filter(c => !c.erronea && !c.deleted_at).forEach(c => {
      ;(c.contratos || []).forEach(ct => {
        if (ct.fecha_evento || ct.fecha_armado) {
          result.push({
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
    return result
  }, [clients])

  const filtered = useMemo(() => allContratos.filter(ct => {
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
  }).sort((a,b) => (a.fecha_evento||"9999").localeCompare(b.fecha_evento||"9999")), [allContratos, filter, todayStr, adm, user, clients, scope, maxDays])

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
      {/* Calendar grid */}
      {(() => {
        const firstDay = new Date(calYear, calMonth, 1)
        const startDay = (firstDay.getDay() + 6) % 7
        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
        const today = new Date(); today.setHours(0,0,0,0)

        // Map dates to event counts
        const eventsByDay = {}
        allContratos.forEach(ct => {
          const ev = ct.fecha_evento || ""
          if (ev) {
            const d = new Date(ev + "T00:00:00")
            if (d.getMonth() === calMonth && d.getFullYear() === calYear) {
              const day = d.getDate()
              if (!eventsByDay[day]) eventsByDay[day] = []
              eventsByDay[day].push(ct)
            }
          }
          const arm = ct.fecha_armado || ""
          if (arm && arm !== ev) {
            const d = new Date(arm + "T00:00:00")
            if (d.getMonth() === calMonth && d.getFullYear() === calYear) {
              const day = d.getDate()
              if (!eventsByDay[day]) eventsByDay[day] = []
              eventsByDay[day].push(ct)
            }
          }
        })

        const cells = []
        for (let i = 0; i < startDay; i++) cells.push(null)
        for (let d = 1; d <= daysInMonth; d++) cells.push(d)

        const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1); setSelectedDay(null) }
        const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1); setSelectedDay(null) }

        return (
          <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:20, marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <button onClick={prevMonth} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:18, padding:"4px 8px" }}>‹</button>
              <span style={{ fontSize:15, fontWeight:700, color:C.text }}>{MONTH_NAMES[calMonth]} {calYear}</span>
              <button onClick={nextMonth} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:18, padding:"4px 8px" }}>›</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:4, textAlign:"center" }}>
              {DAYS_HEADER.map(d => <div key={d} style={{ fontSize:10, color:C.muted, fontWeight:700, padding:"6px 0" }}>{d}</div>)}
              {cells.map((day, i) => {
                if (!day) return <div key={"e"+i} />
                const dateObj = new Date(calYear, calMonth, day)
                const isPast = dateObj < today
                const isToday = dateObj.getTime() === today.getTime()
                const events = eventsByDay[day] || []
                const hasEvents = events.length > 0
                const isSel = selectedDay === day
                const hasContrato = events.some(e => e.tipo === "contrato")
                const hasProforma = events.some(e => e.tipo !== "contrato")

                return (
                  <button key={i} onClick={() => { if (hasEvents) setSelectedDay(isSel ? null : day) }}
                    style={{
                      padding:"6px 2px", borderRadius:8, border:"none", cursor:hasEvents?"pointer":"default",
                      background: isSel ? C.accent+"33" : isToday ? C.accent+"15" : "transparent",
                      opacity: isPast && !hasEvents ? 0.3 : 1,
                      transition:"all .15s", position:"relative",
                    }}
                    onMouseEnter={e=>{if(hasEvents)e.currentTarget.style.background=isSel?C.accent+"33":C.border}}
                    onMouseLeave={e=>{e.currentTarget.style.background=isSel?C.accent+"33":isToday?C.accent+"15":"transparent"}}
                  >
                    <div style={{ fontSize:13, fontWeight:isToday||isSel?700:400, color:isPast&&!hasEvents?C.muted:isToday?C.accent:C.text }}>{day}</div>
                    {hasEvents && (
                      <div style={{ display:"flex", gap:2, justifyContent:"center", marginTop:2 }}>
                        {hasContrato && <span style={{ width:5, height:5, borderRadius:"50%", background:C.green }} />}
                        {hasProforma && <span style={{ width:5, height:5, borderRadius:"50%", background:C.yellow }} />}
                        {events.length > 1 && <span style={{ fontSize:8, color:C.muted, fontWeight:700 }}>+{events.length-1}</span>}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            <div style={{ display:"flex", gap:12, marginTop:10, fontSize:10, color:C.muted }}>
              <span><span style={{ display:"inline-block", width:6, height:6, borderRadius:"50%", background:C.green, marginRight:4 }}/>Contrato</span>
              <span><span style={{ display:"inline-block", width:6, height:6, borderRadius:"50%", background:C.yellow, marginRight:4 }}/>Proforma</span>
            </div>
            {/* Selected day detail */}
            {selectedDay && eventsByDay[selectedDay] && (
              <div style={{ marginTop:12, borderTop:`1px solid ${C.border}`, paddingTop:12 }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.accent, marginBottom:8 }}>{selectedDay} de {MONTH_NAMES[calMonth]} — {eventsByDay[selectedDay].length} evento{eventsByDay[selectedDay].length>1?"s":""}</div>
                {eventsByDay[selectedDay].map(ct => (
                  <button key={ct.id} onClick={()=>goToClient(ct.clientId)} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", cursor:"pointer", textAlign:"left", marginBottom:4, borderLeft:`3px solid ${ct.tipo==="contrato"?C.green:C.yellow}` }}>
                    <div style={{ flex:1 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{ct.clientName}</span>
                      {ct.producto_interes && <span style={{ fontSize:10, color:C.accent, marginLeft:8 }}>{Array.isArray(ct.producto_interes)?ct.producto_interes.join(", "):ct.producto_interes}</span>}
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:8, background:ct.tipo==="contrato"?C.green+"22":C.yellow+"22", color:ct.tipo==="contrato"?C.green:C.yellow }}>{ct.tipo==="contrato"?"Contrato":"Proforma"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })()}

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
