import { memo } from "react"
import { C } from "../../lib/colors"
import { btn } from "../shared"

// Vista admin: grid de cards de empleados para filtrar clientes por dueño.
// Se muestra cuando viewEmp === null y el usuario es admin.
export default memo(function EmployeeGrid({ clients, addNew, setViewEmp }) {
  const empMap = {}
  clients.filter(c => !c.deleted_at).forEach(c => {
    if (!empMap[c.created_by]) empMap[c.created_by] = { id: c.created_by, name: c.created_by_name, count: 0 }
    empMap[c.created_by].count++
  })
  const employees = Object.values(empMap)
  const cardColors = [C.blue, C.teal, C.purple, C.pink, C.orange, C.cyan, C.yellow, C.green]

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
        <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>Clientes</h2>
        <button onClick={addNew} style={{ ...btn, background:C.blue }}>+ Registrar Anterior</button>
      </div>
      <p style={{ color:C.muted, fontSize:13, margin:"0 0 20px" }}>Selecciona un empleado para ver sus clientes.</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:14 }}>
        <button onClick={()=>setViewEmp("__all__")} style={{ background:`linear-gradient(135deg,${C.accent}22,${C.accent}08)`, border:`2px solid ${C.accent}44`, borderRadius:16, padding:"20px 18px", cursor:"pointer", textAlign:"left", transition:"all .2s" }}
          onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent}
          onMouseLeave={e=>e.currentTarget.style.borderColor=C.accent+"44"}>
          <div style={{ width:40,height:40,background:C.accent+"33",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12 }}>
            <svg width="20" height="20" fill="none" stroke={C.accent} strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
          </div>
          <div style={{ fontSize:16, fontWeight:700, color:C.text }}>Todos</div>
          <div style={{ fontSize:12, color:C.muted }}>{clients.filter(c=>!c.deleted_at).length} clientes</div>
        </button>
        {employees.map((emp,idx) => {
          const cc = cardColors[idx%8]
          const ini = emp.name.split(" ").map(w=>w[0]?.toUpperCase()).join("").slice(0,2)
          return (
            <button key={emp.id} onClick={()=>setViewEmp(emp.id)} style={{ background:C.card, border:`2px solid ${C.border}`, borderRadius:16, padding:"20px 18px", cursor:"pointer", textAlign:"left", transition:"all .2s" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=cc}
              onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
              <div style={{ width:40,height:40,background:cc+"33",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12,fontSize:15,fontWeight:700,color:cc }}>{ini}</div>
              <div style={{ fontSize:16,fontWeight:700,color:C.text }}>{emp.name}</div>
              <div style={{ fontSize:12,color:C.muted }}>{emp.count} clientes</div>
            </button>
          )
        })}
      </div>
    </div>
  )
})
