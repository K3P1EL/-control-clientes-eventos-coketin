import { C } from "../lib/colors"
import { Stat, td } from "./shared"
import { today } from "../lib/helpers"

export default function Audit({ regs, photos }) {
  const dr = regs.filter(r => r.fecha === today())
  const wp = dr.filter(r => r.foto === "SI").length
  const np = dr.filter(r => r.foto === "NO").length

  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:700, marginBottom:20 }}>Auditoría Nocturna</h2>
      <div style={{ display:"flex", gap:16, marginBottom:24, flexWrap:"wrap" }}>
        <Stat l="Total Registros" v={dr.length} c={C.accent}/>
        <Stat l="Con Foto"        v={wp}         c={C.green}/>
        <Stat l="Sin Foto"        v={np}         c={C.red}/>
        <Stat l="% Cumplimiento"  v={dr.length ? Math.round(wp/dr.length*100)+"%" : "0%"} c={C.blue}/>
      </div>
      <div style={{ overflowX:"auto", borderRadius:12, border:`1px solid ${C.border}` }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:C.cardAlt }}>
              {["#","Hora","Empleado","¿Foto?","Canal","Estado","Foto"].map(h =>
                <th key={h} style={{ padding:"12px 10px", textAlign:"left", fontWeight:600, color:C.muted, fontSize:12, borderBottom:`1px solid ${C.border}` }}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {dr.length === 0 && (
              <tr><td colSpan={7} style={{ padding:40, textAlign:"center", color:C.muted }}>No hay registros.</td></tr>
            )}
            {dr.map((r, i) => (
              <tr key={r.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                <td style={td}>{i+1}</td>
                <td style={td}>{r.hora||"--"}</td>
                <td style={td}>{r.empleado}</td>
                <td style={td}>
                  <span style={{ padding:"2px 10px", borderRadius:20, fontSize:12, fontWeight:600, background:r.foto==="SI"?C.green:C.red, color:"#fff" }}>
                    {r.foto||"--"}
                  </span>
                </td>
                <td style={td}>{r.canal||"--"}</td>
                <td style={td}>{r.estado||"--"}</td>
                <td style={td}>
                  {photos[r.id]?.length
                    ? <img src={photos[r.id][0]} alt="" style={{ width:48, height:48, objectFit:"cover", borderRadius:6, cursor:"pointer", border:`1px solid ${C.border}` }} onClick={()=>window.open(photos[r.id][0])} />
                    : <span style={{ color:C.muted }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
