import { useMemo } from "react"
import { cDark, barColors } from "../../ui/darkStyles"
import DarkBadge from "../../ui/DarkBadge"
import { PERSONAS } from "../../../../lib/finanzas/constants"
import { formatMoney, calcContract } from "../../../../lib/finanzas/helpers"

// "Mi Plata" view: aggregates ALL outstanding "porRecibir" amounts
// from active contracts, grouped by person.
export default function FullPlataView({ activeContracts }) {
  const plataData = useMemo(() => {
    const personas = {}
    PERSONAS.forEach(p => { personas[p] = { total: 0, contratos: [] } })
    activeContracts.forEach(c => {
      const calc = calcContract(c)
      if (calc.porRecibir <= 0) return
      const entries = []
      ;(c.adelantos || []).forEach(a => {
        if (a.noTrack || !a.monto || a.enCaja) return
        if (a.recibio) entries.push({ persona: a.recibio, monto: a.monto, tipo: "Adelanto", modal: a.modalidad })
      })
      ;(c.cobros || []).forEach(a => {
        if (a.noTrack || !a.monto || a.enCaja) return
        if (a.recibio) entries.push({ persona: a.recibio, monto: a.monto, tipo: "Cobro", modal: a.modalidad })
      })
      if (entries.length === 0 && calc.porRecibir > 0) {
        const recv = [...new Set([...(c.adelantos || []).map(a => a.recibio), ...(c.cobros || []).map(a => a.recibio)].filter(Boolean))]
        if (recv.length > 0) {
          const per = calc.porRecibir / recv.length
          recv.forEach(p => entries.push({ persona: p, monto: per, tipo: "Pendiente", modal: "" }))
        } else {
          entries.push({ persona: "Otro", monto: calc.porRecibir, tipo: "Pendiente", modal: "" })
        }
      }
      entries.forEach(e => {
        const key = e.persona in personas ? e.persona : "Otro"
        personas[key].total += e.monto
        personas[key].contratos.push({ ...e, contractId: c.id, cliente: c.cliente })
      })
    })
    return personas
  }, [activeContracts])

  const totalPorRecibir = Object.values(plataData).reduce((a, b) => a + b.total, 0)
  const personasConPlata = Object.entries(plataData).filter(([, v]) => v.total > 0).sort((a, b) => b[1].total - a[1].total)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: totalPorRecibir > 0 ? "linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)" : "linear-gradient(135deg, #065f46 0%, #064e3b 100%)", borderRadius: 16, padding: "24px 28px", color: "#fff" }}>
        <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.8, marginBottom: 4 }}>{totalPorRecibir > 0 ? "TOTAL POR RECIBIR" : "TODO EN CAJA ✅"}</div>
        <div style={{ fontSize: 36, fontWeight: 900 }}>{formatMoney(Math.round(totalPorRecibir))}</div>
        {personasConPlata.length > 0 && (
          <>
            <div style={{ marginTop: 12, display: "flex", gap: 4, height: 8, borderRadius: 4, overflow: "hidden", background: "rgba(255,255,255,0.1)" }}>
              {personasConPlata.map(([name, data]) => (
                <div key={name} style={{ width: `${(data.total / totalPorRecibir) * 100}%`, background: barColors[name] || "#71717a", borderRadius: 2, minWidth: 4 }} />
              ))}
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
              {personasConPlata.map(([name, data]) => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, opacity: 0.9 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: barColors[name] || "#71717a" }} />
                  {name}: {Math.round((data.total / totalPorRecibir) * 100)}%
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {personasConPlata.length === 0 ? (
        <div style={{ ...cDark.card, padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#34d399" }}>Nadie tiene tu plata</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {personasConPlata.map(([name, data]) => (
            <div key={name} style={cDark.card}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(63,63,70,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: barColors[name] || "#71717a", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14 }}>{name.charAt(0)}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#e4e4e7" }}>{name}</div>
                    <div style={{ fontSize: 11, color: "#52525b" }}>{data.contratos.length} movimiento{data.contratos.length !== 1 ? "s" : ""}</div>
                  </div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#f87171" }}>{formatMoney(Math.round(data.total))}</div>
              </div>
              <div style={{ padding: "4px 0" }}>
                {data.contratos.map((ct, i) => (
                  <div key={i} style={{ padding: "8px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: i < data.contratos.length - 1 ? "1px solid rgba(63,63,70,0.15)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "#38bdf8" }}>{ct.contractId}</span>
                      <DarkBadge color={ct.tipo === "Adelanto" ? "green" : ct.tipo === "Cobro" ? "blue" : "yellow"}>{ct.tipo}</DarkBadge>
                      {ct.modal && <span style={{ fontSize: 10, color: "#52525b" }}>{ct.modal}</span>}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#f87171" }}>{formatMoney(Math.round(ct.monto))}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
