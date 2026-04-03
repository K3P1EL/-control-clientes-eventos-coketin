import { C } from "../lib/colors"
import { Stat } from "./shared"
import { today } from "../lib/helpers"

export default function Dash({ regs }) {
  const r = regs.filter(x => x.fecha === today())
  const est = {}
  r.forEach(x => { if (x.estado) est[x.estado] = (est[x.estado]||0) + 1 })
  const ages = r.filter(x => x.edad).map(x => +x.edad)
  const avg = ages.length ? Math.round(ages.reduce((a,b)=>a+b,0)/ages.length) : 0

  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:700, marginBottom:20 }}>Dashboard — Hoy ({today()})</h2>
      <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:24 }}>
        <Stat l="Total Clientes" v={r.length}                             c={C.accent}/>
        <Stat l="WhatsApp"       v={r.filter(x=>x.canal==="W").length}    c={C.teal}/>
        <Stat l="Físico"         v={r.filter(x=>x.canal==="F").length}    c={C.purple}/>
        <Stat l="Edad Promedio"  v={avg||"—"}                             c={C.blue}/>
      </div>
      <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:24 }}>
        <Stat l="Hombres"        v={r.filter(x=>x.sexo==="H").length}     c={C.blue}/>
        <Stat l="Mujeres"        v={r.filter(x=>x.sexo==="M").length}     c={C.pink}/>
        <Stat l="Piraña SI"      v={r.filter(x=>x.pirana==="S").length}   c={C.red}/>
        <Stat l="Piraña Posible" v={r.filter(x=>x.pirana==="P").length}   c={C.yellow}/>
      </div>
      <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:20 }}>
        <h3 style={{ fontSize:15, fontWeight:600, marginTop:0, marginBottom:16 }}>Estado de Clientes</h3>
        {!Object.keys(est).length && <p style={{ color:C.muted }}>Sin datos aún.</p>}
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          {Object.entries(est).map(([k,v]) => (
            <div key={k} style={{ background:C.cardAlt, borderRadius:10, padding:"12px 20px", textAlign:"center", minWidth:120 }}>
              <div style={{ fontSize:24, fontWeight:700, color:C.accent }}>{v}</div>
              <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>{k}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
