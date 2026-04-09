import { memo } from "react"
import { C } from "../../lib/colors"
import { DatePicker } from "../shared"

const STATUS_COLORS = { normal: C.accent, anterior: C.blue, naranja: C.orange, erronea: C.red }

// Barra de filtros para la lista de fichas: orden, rango de fechas,
// estado y canal. Sin estado propio — todo viene por props.
export default memo(function FichaFilters({
  adm,
  sortAsc, setSortAsc,
  dateFrom, setDateFrom,
  dateTo, setDateTo,
  statusFilter, setStatusFilter,
  canalFilter, setCanalFilter,
}) {
  const hasAny = statusFilter || canalFilter || dateFrom || dateTo
  return (
    <div style={{ display:"flex", gap:10, marginBottom:14, alignItems:"center", flexWrap:"wrap" }}>
      <button onClick={()=>setSortAsc(!sortAsc)} style={{ background:C.inputBg, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:"5px 10px", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
        <svg width="12" height="12" fill="none" stroke={C.accent} strokeWidth="2"><path d={sortAsc?"M2 8l4 4 4-4":"M2 4l4-4 4 4"}/><path d={sortAsc?"M6 2v10":"M6 10V0"}/></svg>
        {sortAsc?"Mas antiguo":"Mas reciente"}
      </button>
      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
        <span style={{ fontSize:11, color:C.muted }}>Desde</span>
        <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="Inicio" />
        <span style={{ fontSize:11, color:C.muted }}>Hasta</span>
        <DatePicker value={dateTo} onChange={setDateTo} placeholder="Fin" />
      </div>
      <select value={statusFilter||""} onChange={e=>setStatusFilter(e.target.value||null)} style={{ background:C.inputBg, border:`1px solid ${C.border}`, borderRadius:8, color:statusFilter?STATUS_COLORS[statusFilter]:C.text, padding:"5px 10px", fontSize:11, cursor:"pointer" }}>
        <option value="">Todos los estados</option>
        <option value="normal" style={{color:C.accent}}>Con registro</option>
        <option value="anterior" style={{color:C.blue}}>Registrado antes</option>
        <option value="naranja" style={{color:C.orange}}>Reg. eliminado</option>
        {adm && <option value="erronea" style={{color:C.red}}>Erronea</option>}
      </select>
      <select value={canalFilter||""} onChange={e=>setCanalFilter(e.target.value||null)} style={{ background:C.inputBg, border:`1px solid ${C.border}`, borderRadius:8, color:canalFilter==="F"?C.purple:canalFilter==="W"?"#25D366":C.text, padding:"5px 10px", fontSize:11, cursor:"pointer" }}>
        <option value="">Todos los canales</option>
        <option value="F" style={{color:C.purple}}>Local</option>
        <option value="W" style={{color:"#25D366"}}>WhatsApp</option>
      </select>
      {hasAny && (
        <button onClick={()=>{setStatusFilter(null);setCanalFilter(null);setDateFrom("");setDateTo("")}} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:11, textDecoration:"underline" }}>Limpiar</button>
      )}
    </div>
  )
})
