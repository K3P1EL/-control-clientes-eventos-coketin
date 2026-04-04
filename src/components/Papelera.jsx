import { useState } from "react"
import { C } from "../lib/colors"

function daysLeft(deletedAt, maxDays) {
  if (!deletedAt) return maxDays
  const diff = maxDays - Math.floor((Date.now() - new Date(deletedAt).getTime()) / 86400000)
  return Math.max(0, diff)
}

function timeAgo(ts) {
  if (!ts) return ""
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (mins < 60) return `hace ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `hace ${days} dia${days>1?"s":""}`
}

export default function Papelera({
  clients, contactos, regs,
  onRestoreClient, onPermanentDeleteClient,
  onRestoreContacto, onPermanentDeleteContacto,
  adm, trashDays = 10,
}) {
  const [selected, setSelected] = useState(new Set())

  const deletedClients = clients.filter(c => c.deleted_at)
  const deletedContactos = contactos.filter(c => c.deleted_at)

  // Build unified list
  const items = [
    ...deletedClients.map(c => {
      const cts = c.contratos || []
      const totalAdel = cts.reduce((s,ct) => s + (ct.adelantos||[]).length, 0)
      const totalArch = cts.reduce((s,ct) => s + (ct.contrato_archivos||[]).length, 0)
      const regCount = (c.reg_ids||[]).length
      return {
        id: c.id, type: "ficha", deletedAt: c.deleted_at,
        title: c.nombre || "Sin nombre", code: c.code,
        sub: [
          cts.length > 0 && `${cts.length} contrato${cts.length>1?"s":""}`,
          totalAdel > 0 && `${totalAdel} adelanto${totalAdel>1?"s":""}`,
          totalArch > 0 && `${totalArch} archivo${totalArch>1?"s":""}`,
        ].filter(Boolean).join(", "),
        linked: regCount > 0 ? `Vinculado a ${regCount} registro${regCount>1?"s":""}` : null,
      }
    }),
    ...deletedContactos.map(c => ({
      id: c.id, type: "cliente", deletedAt: c.deleted_at,
      title: c.nombre || "Sin nombre", code: null,
      sub: [c.dni && `DNI: ${c.dni}`, (c.phones||[])[0]].filter(Boolean).join(" · "),
      linked: null,
    })),
  ].sort((a,b) => new Date(b.deletedAt) - new Date(a.deletedAt))

  const toggle = (id) => setSelected(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s })
  const selectAll = () => setSelected(new Set(items.map(i => i.id)))

  const restoreSelected = () => {
    selected.forEach(id => {
      const item = items.find(i => i.id === id)
      if (!item) return
      if (item.type === "ficha") onRestoreClient(id)
      else onRestoreContacto(id)
    })
    setSelected(new Set())
  }

  const deleteSelected = () => {
    if (!window.confirm(`¿Eliminar ${selected.size} elemento${selected.size>1?"s":""} permanentemente? No se puede deshacer.`)) return
    selected.forEach(id => {
      const item = items.find(i => i.id === id)
      if (!item) return
      if (item.type === "ficha") onPermanentDeleteClient(id)
      else onPermanentDeleteContacto(id)
    })
    setSelected(new Set())
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>Papelera</h2>
          <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>Los elementos se eliminan permanentemente despues de {trashDays} dias</div>
        </div>
        {items.length > 0 && (
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={selectAll} style={{ background:C.inputBg, border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, cursor:"pointer", padding:"6px 14px", fontSize:12 }}>Seleccionar todo</button>
            {selected.size > 0 && <>
              <button onClick={restoreSelected} style={{ background:C.green+"22", border:`1px solid ${C.green}44`, borderRadius:8, color:C.green, cursor:"pointer", padding:"6px 14px", fontSize:12, fontWeight:600 }}>Restaurar ({selected.size})</button>
              {adm && <button onClick={deleteSelected} style={{ background:C.danger+"22", border:`1px solid ${C.danger}44`, borderRadius:8, color:C.danger, cursor:"pointer", padding:"6px 14px", fontSize:12, fontWeight:600 }}>Eliminar permanente ({selected.size})</button>}
            </>}
          </div>
        )}
      </div>

      {!items.length ? (
        <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:60, textAlign:"center", color:C.muted }}>
          <svg width="40" height="40" fill="none" stroke={C.muted} strokeWidth="1.5" style={{ marginBottom:12 }}><path d="M3 6h34M14 6V4a2 2 0 012-2h8a2 2 0 012 2v2M8 6v28a2 2 0 002 2h20a2 2 0 002-2V6M16 12v16M24 12v16"/></svg>
          <div style={{ fontSize:14 }}>La papelera esta vacia</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {items.map(item => {
            const days = daysLeft(item.deletedAt, trashDays)
            const urgent = days <= 3
            const isSel = selected.has(item.id)
            return (
              <div key={item.id} onClick={()=>toggle(item.id)} style={{
                background:C.card, borderRadius:12, border:`1px solid ${isSel?C.accent:C.border}`,
                padding:"14px 18px", cursor:"pointer", display:"flex", gap:14, alignItems:"center",
                transition:"border .15s", opacity: days <= 0 ? 0.4 : 1,
              }}>
                {/* Checkbox */}
                <div style={{ width:20, height:20, borderRadius:6, border:`2px solid ${isSel?C.accent:C.border}`, background:isSel?C.accent:"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .15s" }}>
                  {isSel && <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="3"><path d="M2 6l3 3 5-5"/></svg>}
                </div>

                {/* Type badge */}
                <span style={{ fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:10, flexShrink:0,
                  background: item.type==="ficha" ? C.purple+"22" : C.teal+"22",
                  color: item.type==="ficha" ? C.purple : C.teal,
                }}>{item.type==="ficha" ? "Ficha" : "Cliente"}</span>

                {/* Content */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                    <span style={{ fontSize:14, fontWeight:700, color:C.text }}>{item.title}</span>
                    {item.code && <span style={{ fontSize:10, fontWeight:600, color:C.cyan, fontFamily:"monospace", background:C.cyan+"18", padding:"1px 6px", borderRadius:4 }}>{item.code}</span>}
                  </div>
                  {item.sub && <div style={{ fontSize:12, color:C.muted }}>{item.sub}</div>}
                  {item.linked && <div style={{ fontSize:11, color:C.yellow, marginTop:2 }}>{item.linked}</div>}
                </div>

                {/* Time + days left */}
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:11, color:C.muted }}>{timeAgo(item.deletedAt)}</div>
                  <div style={{ fontSize:11, fontWeight:600, color:urgent?C.red:C.muted, marginTop:2 }}>
                    {days <= 0 ? "Expiro" : `${days} dia${days>1?"s":""}`}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
