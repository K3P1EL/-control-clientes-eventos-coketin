import { memo } from "react"
import { C } from "../../lib/colors"
import { today } from "../../lib/helpers"

// Vista admin del Registro: cards de empleados con stats hoy/total.
// Se muestra cuando viewUser === null y el usuario es admin.
export default memo(function RegistroEmployeeGrid({ regs, setViewUser }) {
  const empMap = {}
  regs.forEach(r => {
    if (!empMap[r.user_id]) empMap[r.user_id] = { id:r.user_id, name:r.empleado, total:0, todayCount:0 }
    empMap[r.user_id].total++
    if (r.fecha === today()) empMap[r.user_id].todayCount++
  })
  const employees = Object.values(empMap)
  const todayTotal = regs.filter(r => r.fecha === today()).length

  return (
    <div>
      <h2 style={{ margin:"0 0 6px", fontSize:20, fontWeight:700 }}>Registro de Clientes</h2>
      <p style={{ color:C.muted, fontSize:13, margin:"0 0 24px" }}>Selecciona un empleado para ver sus registros.</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:16 }}>
        <button onClick={()=>setViewUser("__all__")} style={{ background:`linear-gradient(135deg,${C.accent}22,${C.accent}08)`, border:`2px solid ${C.accent}44`, borderRadius:16, padding:"24px 20px", cursor:"pointer", textAlign:"left", transition:"all .2s" }}
          onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent}
          onMouseLeave={e=>e.currentTarget.style.borderColor=C.accent+"44"}>
          <div style={{ width:44,height:44,background:C.accent+"33",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
          </div>
          <div style={{ fontSize:16,fontWeight:700,color:C.text,marginBottom:4 }}>General</div>
          <div style={{ fontSize:12,color:C.muted }}>Todos los empleados</div>
          <div style={{ display:"flex",gap:16,marginTop:12 }}>
            <div><div style={{ fontSize:20,fontWeight:700,color:C.accent }}>{todayTotal}</div><div style={{ fontSize:10,color:C.muted }}>Hoy</div></div>
            <div><div style={{ fontSize:20,fontWeight:700,color:C.muted }}>{regs.length}</div><div style={{ fontSize:10,color:C.muted }}>Total</div></div>
          </div>
        </button>
        {employees.map((emp,idx) => {
          const cc = [C.blue,C.teal,C.purple,C.pink,C.orange,C.cyan,C.yellow,C.green][idx%8]
          const ini = emp.name.split(" ").map(w=>w[0]?.toUpperCase()).join("").slice(0,2)
          return (
            <button key={emp.id} onClick={()=>setViewUser(emp.id)} style={{ background:C.card, border:`2px solid ${C.border}`, borderRadius:16, padding:"24px 20px", cursor:"pointer", textAlign:"left", transition:"all .2s" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=cc}
              onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
              <div style={{ width:44,height:44,background:cc+"33",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14,fontSize:16,fontWeight:700,color:cc }}>{ini}</div>
              <div style={{ fontSize:16,fontWeight:700,color:C.text,marginBottom:4 }}>{emp.name}</div>
              <div style={{ fontSize:12,color:C.muted }}>Empleado</div>
              <div style={{ display:"flex",gap:16,marginTop:12 }}>
                <div><div style={{ fontSize:20,fontWeight:700,color:cc }}>{emp.todayCount}</div><div style={{ fontSize:10,color:C.muted }}>Hoy</div></div>
                <div><div style={{ fontSize:20,fontWeight:700,color:C.muted }}>{emp.total}</div><div style={{ fontSize:10,color:C.muted }}>Total</div></div>
              </div>
            </button>
          )
        })}
        {!employees.length && <div style={{ gridColumn:"1/-1", background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:40, textAlign:"center", color:C.muted }}>No hay empleados con registros aún.</div>}
      </div>
    </div>
  )
})
