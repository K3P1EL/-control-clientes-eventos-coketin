import { memo } from "react"
import { C, estadoColors } from "../../lib/colors"
import { genCode, consumeChangeTipo } from "../../lib/helpers"
import { LIMITS } from "../../lib/constants"
import { Bdg, DInput, TagSelect, mi, sel, td } from "../shared"

function getBg(val, map) { return map[val] || C.border }

function getTagColor(tag, tags) {
  if (tag === "Contrato") return C.green
  if (tag === "Proforma") return C.yellow
  const ci = tags.filter(x => x !== "Proforma" && x !== "Contrato").indexOf(tag)
  return ci >= 0 ? estadoColors[ci % estadoColors.length] : C.border
}

function CopyBtn({ text }) {
  return (
    <button onClick={(e)=>{e.stopPropagation();navigator.clipboard.writeText(text)}} title="Copiar codigo" style={{ background:C.cyan+"15", border:`1px solid ${C.cyan}33`, borderRadius:5, color:C.cyan, cursor:"pointer", padding:"1px 6px", fontSize:9, fontWeight:600, fontFamily:"monospace" }}>{text}</button>
  )
}

// One row of the Registro table. Wrapped in memo with a custom comparator
// so editing field X of row 5 doesn't repaint rows 1-4 and 6-N.
//
// Important: the parent (RegistroTable) passes a per-row precomputed
// `linked` (the matching client) instead of the entire `clients` array,
// so the comparator can cheaply detect when this specific row's linked
// client changes without inspecting hundreds of unrelated entries.
function RegistroRow({
  r, i, linked, isSel, isDrag, canEdit, isUploading,
  adm, locales, tags,
  upd, del, restore, hardDel,
  setSelectedRow, setContractUpId, setPreviewRegId, cRef,
  goToClient, onAddClient, user,
  onRowDragOver, onRowDragLeave, onRowDrop,
}) {
  const isDel = r.deleted
  const lock = !canEdit ? { opacity:.45, pointerEvents:"none" } : {}
  const cc = getBg(r.canal,  { W:C.teal, F:C.purple })
  const sc = getBg(r.sexo,   { H:C.blue, M:C.pink })
  const pc = getBg(r.pirana, { S:C.red, P:C.yellow, N:C.muted })
  const rowBg = isDrag ? C.accent+"22" : isDel ? C.red+"0a" : isSel ? C.accent+"15" : i%2 ? C.cardAlt+"44" : "transparent"

  // Archivo column data — uses precomputed `linked` instead of clients.find
  const linkedErronea = linked?.erronea
  const archivos = linked ? (linked.contratos||[]).flatMap(ct => ct.contrato_archivos||[]) : []
  const n = archivos.length

  // Estado column — disabled list calculation
  const isErronea = linkedErronea
  const hasFicha = !!linked && !isErronea
  const isContractState = r.estado==="Proforma"||r.estado==="Contrato"
  const dis = isErronea ? ["Proforma","Contrato"] : isContractState && hasFicha ? tags.filter(t=>t!=="Proforma"&&t!=="Contrato") : ["Proforma","Contrato"]

  return (
    <tr onClick={()=>setSelectedRow(isSel?null:r.id)}
      onDragOver={canEdit ? e=>onRowDragOver(e,r.id) : undefined}
      onDragLeave={canEdit ? onRowDragLeave : undefined}
      onDrop={canEdit ? e=>onRowDrop(e,r.id) : undefined}
      style={{ borderBottom:`1px solid ${isDrag?C.accent:C.border}`, background:rowBg, animation:"fadeIn .2s", cursor:"pointer", transition:"background .15s, border .15s" }}>
      <td style={td}><span style={{ color:C.muted, ...(isDel?{textDecoration:"line-through"}:{}) }}>{i+1}</span></td>
      <td style={{ ...td, ...(isDel?{opacity:.4}:{}) }}>{r.fecha}</td>
      <td style={{ ...td, ...(isDel?{opacity:.5}:{}) }}>
        {r.empleado}
        {isDel && <div style={{ fontSize:9, color:C.red, fontWeight:600, marginTop:2 }}>Borrado por {r.deleted_by}</div>}
      </td>
      <td style={td}>
        <Bdg c={r.local ? C.orange : C.border}>
          <select value={r.local||""} onChange={e=>upd(r.id,"local",e.target.value)} style={sel}>
            <option value="">--</option>
            {locales.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </Bdg>
      </td>
      <td style={td}>
        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          <input value={r.hora} onChange={e=>upd(r.id,"hora",e.target.value)} style={{ ...mi, width:80 }} placeholder="--:--" />
          <svg width="14" height="14" fill="none" stroke={C.muted} strokeWidth="2"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5V7l1.5 1.5"/></svg>
        </div>
      </td>
      <td style={td}>
        {linkedErronea
          ? <span style={{ fontSize:10, color:C.red }}>--</span>
          : (
            <div style={{ display:"flex", alignItems:"center", gap:5, justifyContent:"center" }}>
              {isUploading
                ? <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10, color:C.accent }}><span style={{ width:12,height:12,border:"2px solid currentColor",borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",display:"inline-block" }} />Subiendo...</span>
                : canEdit && <button onClick={()=>{setContractUpId(r.id);cRef.current?.click()}} title="Subir foto" style={{ background:n?C.green+"15":C.accent+"12", border:`1px solid ${n?C.green+"44":C.accent+"33"}`, borderRadius:8, cursor:"pointer", padding:"3px 10px", display:"flex", alignItems:"center", gap:5, fontSize:11, fontWeight:600, color:n?C.green:C.accent }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="10" height="10" rx="2"/><circle cx="5" cy="5" r="1"/><path d="M12 9l-2.5-2.5-6 6"/></svg>
                    Subir foto {n > 0 && <span style={{ background:C.green, color:"#fff", borderRadius:10, padding:"0 5px", fontSize:10, fontWeight:700, lineHeight:"16px" }}>{n}</span>}
                  </button>
              }
              {n > 0 && <button onClick={()=>setPreviewRegId(r.id)} title="Ver archivos" style={{ background:C.teal+"15", border:`1px solid ${C.teal}33`, borderRadius:8, cursor:"pointer", padding:"3px 6px", display:"flex", alignItems:"center" }}>
                <svg width="14" height="14" fill="none" stroke={C.teal} strokeWidth="2"><path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z"/><circle cx="7" cy="7" r="1.5"/></svg>
              </button>}
            </div>
          )}
      </td>
      <td style={td}><div style={lock}><Bdg c={cc}><select value={r.canal} onChange={e=>upd(r.id,"canal",e.target.value)} style={sel} disabled={!canEdit}><option value="">--</option><option value="W">WhatsApp</option><option value="F">Físico</option></select></Bdg></div></td>
      <td style={td}><div style={lock}><Bdg c={sc}><select value={r.sexo}  onChange={e=>upd(r.id,"sexo",e.target.value)}  style={sel} disabled={!canEdit}><option value="">--</option><option value="H">H</option><option value="M">M</option></select></Bdg></div></td>
      <td style={td}><div style={lock}><DInput type="number" value={r.edad} onCommit={v=>upd(r.id,"edad",v)} style={{ ...mi, width:60 }} placeholder="--" disabled={!canEdit}/></div></td>
      <td style={td}><div style={lock}><Bdg c={pc}><select value={r.pirana} onChange={e=>upd(r.id,"pirana",e.target.value)} style={sel} disabled={!canEdit}><option value="">--</option><option value="S">SI</option><option value="N">NO</option><option value="P">P</option></select></Bdg></div></td>
      <td style={td}><div style={lock}>
        <TagSelect value={r.estado} onChange={v=>{
          if ((v==="Proforma"||v==="Contrato") && v!==r.estado) {
            if (!consumeChangeTipo()) { alert(`Limite de cambios alcanzado (${LIMITS.TIPO_CHANGES_PER_HOUR} por hora)`); return }
          }
          upd(r.id,"estado",v)
        }} tags={tags} getColor={t=>getTagColor(t,tags)} disabled={!canEdit} disabledTags={dis} allowClear={!hasFicha} />
      </div></td>
      <td style={td}><div style={lock}><DInput value={r.observaciones} onCommit={v=>upd(r.id,"observaciones",v)} style={{ ...mi, width:120 }} placeholder="..." disabled={!canEdit}/></div></td>
      <td style={{ ...td, pointerEvents:"auto", opacity:1 }}>
        {isDel
          ? linked
            ? <button onClick={()=>goToClient(linked.id)} style={{ fontSize:10, fontWeight:700, color:C.orange, background:C.orange+"15", padding:"2px 8px", borderRadius:6, border:"none", cursor:"pointer" }}>Ver ficha</button>
            : <span style={{ fontSize:10, fontWeight:600, color:C.muted }}>—</span>
          : linked
          ? linked.erronea
            ? <button onClick={()=>goToClient(linked.id)} style={{ fontSize:10, fontWeight:700, color:C.red, background:C.red+"15", padding:"2px 8px", borderRadius:6, border:"none", cursor:"pointer" }}>Ficha erronea</button>
            : <div style={{ display:"flex", gap:4, alignItems:"center", flexWrap:"wrap" }}>
              <button onClick={()=>goToClient(linked.id)} style={{ background:C.green+"22", border:"none", borderRadius:6, color:C.green, cursor:"pointer", padding:"2px 8px", fontSize:11, fontWeight:700 }}>→ Ver ficha</button>
              {(() => { const lct=(linked.contratos||[]).slice(-1)[0]; return lct?.tipo?<span style={{ fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:4,background:lct.tipo==="contrato"?C.green+"22":C.yellow+"22",color:lct.tipo==="contrato"?C.green:C.yellow }}>{lct.tipo==="contrato"?"C":"P"}</span>:null })()}
              {linked.code && <CopyBtn text={linked.code} />}
            </div>
          : <button onClick={async()=>{
              const tipo = r.estado === "Contrato" ? "contrato" : "proforma"
              const nc = await onAddClient({ code:genCode(), reg_ids:[r.id], created_by:user.id, created_by_name:user.name, nombre:"", dni:"", phones:[], direccion:"", referencia:"" }, { tipo, estado:"activo" })
              goToClient(nc.id)
            }} style={{ background:C.purple+"22", border:`1px solid ${C.purple}44`, borderRadius:6, color:C.purple, cursor:"pointer", padding:"2px 8px", fontSize:12, fontWeight:700 }}>+ Ficha</button>
        }
      </td>
      <td style={td}>
        {isDel ? (
          <div style={{ display:"flex", gap:4, alignItems:"center" }}>
            <button onClick={()=>restore(r.id)} title="Restaurar" style={{ background:C.green+"22", border:"none", borderRadius:4, color:C.green, cursor:"pointer", padding:"2px 6px", fontSize:10, fontWeight:700 }}>↩</button>
            {adm && <button onClick={()=>hardDel(r.id)} title="Eliminar permanente" style={{ background:"none", border:"none", cursor:"pointer", color:C.danger, padding:2 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h10M12 6V14a1 1 0 01-1 1H5a1 1 0 01-1-1V6M6 6V4a1 1 0 011-1h2a1 1 0 011 1v2"/></svg>
            </button>}
          </div>
        ) : (
          <div style={{ display:"flex", gap:4, alignItems:"center" }}>
            <button onClick={()=>del(r.id)} title="Mover a papelera" style={{ background:"none", border:"none", cursor:"pointer", color:C.danger, padding:4 }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h10M12 6V14a1 1 0 01-1 1H5a1 1 0 01-1-1V6M6 6V4a1 1 0 011-1h2a1 1 0 011 1v2"/></svg>
            </button>
            {adm && (
              <button onClick={()=>hardDel(r.id)} title="Eliminar permanente (sin pasar por papelera)" style={{ background:C.danger+"15", border:`1px solid ${C.danger}55`, borderRadius:4, cursor:"pointer", color:C.danger, padding:"2px 5px", display:"flex", alignItems:"center", gap:2 }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h10M12 6V14a1 1 0 01-1 1H5a1 1 0 01-1-1V6M6 6V4a1 1 0 011-1h2a1 1 0 011 1v2"/></svg>
                <span style={{ fontSize:9, fontWeight:700 }}>×</span>
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}

// Custom comparator: skip a re-render unless something this specific row
// actually depends on changed. Reference equality on `r` and `linked` is
// enough because the parent only mints new objects when their data changes.
// Extra fields (canEdit, isSel, isDrag, isUploading, i, total) flip when
// the user interacts so we must include them.
function areEqual(prev, next) {
  return (
    prev.r === next.r &&
    prev.linked === next.linked &&
    prev.i === next.i &&
    prev.total === next.total &&
    prev.canEdit === next.canEdit &&
    prev.isSel === next.isSel &&
    prev.isDrag === next.isDrag &&
    prev.isUploading === next.isUploading &&
    prev.adm === next.adm &&
    prev.locales === next.locales &&
    prev.tags === next.tags &&
    prev.upd === next.upd &&
    prev.del === next.del &&
    prev.restore === next.restore &&
    prev.hardDel === next.hardDel &&
    prev.setSelectedRow === next.setSelectedRow &&
    prev.setContractUpId === next.setContractUpId &&
    prev.setPreviewRegId === next.setPreviewRegId &&
    prev.goToClient === next.goToClient &&
    prev.onAddClient === next.onAddClient &&
    prev.onRowDragOver === next.onRowDragOver &&
    prev.onRowDragLeave === next.onRowDragLeave &&
    prev.onRowDrop === next.onRowDrop &&
    prev.user === next.user &&
    prev.cRef === next.cRef
  )
}

export default memo(RegistroRow, areEqual)
