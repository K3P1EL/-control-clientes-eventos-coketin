import { useMemo } from "react"
import { cDark, barColors } from "../../ui/darkStyles"
import DarkBadge from "../../ui/DarkBadge"
import { PERSONAS } from "../../../../lib/finanzas/constants"
import { formatMoney, calcContract } from "../../../../lib/finanzas/helpers"

// "Mi Plata" view: aggregates ALL outstanding "porRecibir" amounts
// from active contracts, grouped by person.
// "Yo" is excluded — the owner can't owe money to themselves. Only
// employees who collected payments but haven't turned them in appear.
export default function FullPlataView({ activeContracts }) {
  const plataData = useMemo(() => {
    const personas = {}
    PERSONAS.filter(p => p !== "Yo").forEach(p => { personas[p] = { total: 0, contratos: [] } })
    personas["Por cobrar"] = { total: 0, contratos: [] }
    activeContracts.forEach(c => {
      const calc = calcContract(c)
      if (calc.porRecibir <= 0) return
      const entries = []
      ;(c.adelantos || []).forEach(a => {
        if (a.noTrack || !a.monto || a.enCaja) return
        if (a.recibio && a.recibio !== "Yo") entries.push({ persona: a.recibio, monto: a.monto, tipo: "Adelanto", modal: a.modalidad, fecha: a.fecha })
      })
      ;(c.cobros || []).forEach(a => {
        if (a.noTrack || !a.monto || a.enCaja) return
        if (a.recibio && a.recibio !== "Yo") entries.push({ persona: a.recibio, monto: a.monto, tipo: "Cobro", modal: a.modalidad, fecha: a.fecha })
      })
      // Client-side pendiente goes to "Por cobrar". Use the latest cobro's fecha (if any)
      // or the contract's home date as the reference for when the debt started.
      if (calc.pendiente > 0) {
        const latestCobroFecha = (c.cobros || []).filter(a => a.fecha).slice(-1)[0]?.fecha
        const homeFecha = (c.adelantos || []).find(a => a.fecha)?.fecha
        entries.push({ persona: "Por cobrar", monto: calc.pendiente, tipo: "Pendiente", modal: "", fecha: latestCobroFecha || homeFecha || "" })
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
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "#38bdf8" }}>{ct.contractId}</span>
                      <DarkBadge color={ct.tipo === "Adelanto" ? "green" : ct.tipo === "Cobro" ? "blue" : "yellow"}>{ct.tipo}</DarkBadge>
                      {ct.modal && <span style={{ fontSize: 10, color: "#52525b" }}>{ct.modal}</span>}
                      {ct.fecha && <span style={{ fontSize: 9, color: "#52525b", fontFamily: "monospace" }}>{(() => { const p = ct.fecha.split("-"); return p.length === 3 ? `${p[2]}-${["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"][+p[1]-1] || p[1]}` : ct.fecha })()}</span>}
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
