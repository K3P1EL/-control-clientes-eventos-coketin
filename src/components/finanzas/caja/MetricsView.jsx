import { cDark } from "../ui/darkStyles"
import { formatMoney } from "../../../lib/finanzas/helpers"

const thS = { padding: "10px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#a1a1aa", textAlign: "left", whiteSpace: "nowrap", background: "rgba(39,39,42,0.9)", borderBottom: "2px solid rgba(63,63,70,0.8)" }

const StatBox = ({ label, value, color, sub }) => (
  <div style={{ background: "rgba(24,24,27,0.6)", borderRadius: 12, padding: "14px 16px", border: `1px solid ${color}22`, flex: "1 1 140px", minWidth: 140 }}>
    <div style={{ fontSize: 10, color: "#71717a", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 900, fontFamily: "monospace", color, marginTop: 4 }}>{formatMoney(value)}</div>
    {sub && <div style={{ fontSize: 10, color: "#52525b", marginTop: 2 }}>{sub}</div>}
  </div>
)

export default function MetricsView({ desglose, totalIngresos, totalEgresos, balance }) {
  const gananciaReal = desglose.negIn - desglose.negOut
  const gastosOp = desglose.sueldoOut + desglose.servicioOut
  const libreDeGastos = gananciaReal - gastosOp
  const hasAjeno = desglose.gastoAjenoIn > 0 || desglose.gastoAjenoOut > 0

  const rows = [
    { label: "💵 Efectivo — 🏪 Negocio", isHead: true },
    { label: "📋 Del contrato", inVal: desglose.contEfecIn, outVal: desglose.contEfecOut, indent: true },
    { label: "🔸 Fuera del contrato", inVal: desglose.efecNegIn - desglose.contEfecIn, outVal: desglose.efecNegOut - desglose.contEfecOut, indent: true },
    { label: "💵 Efectivo Negocio — Subtotal", inVal: desglose.efecNegIn, outVal: desglose.efecNegOut, bold: true, border: true },
    { label: "💵 Efectivo — 👤 Externo", inVal: desglose.efecExtIn, outVal: desglose.efecExtOut, externo: true, border: true },
    { label: "", spacer: true },
    { label: "📱 Yape — 🏪 Negocio", isHead: true },
    { label: "📋 Del contrato", inVal: desglose.contYapeIn, outVal: desglose.contYapeOut, indent: true },
    { label: "🔸 Fuera del contrato", inVal: desglose.yapeNegIn - desglose.contYapeIn, outVal: desglose.yapeNegOut - desglose.contYapeOut, indent: true },
    { label: "📱 Yape Negocio — Subtotal", inVal: desglose.yapeNegIn, outVal: desglose.yapeNegOut, bold: true, border: true },
    { label: "📱 Yape — 👤 Externo", inVal: desglose.yapeExtIn, outVal: desglose.yapeExtOut, externo: true, border: true },
    ...(hasAjeno ? [
      { label: "", spacer: true },
      { label: "💰 Gasto ajeno (no es del negocio)", inVal: desglose.gastoAjenoIn, outVal: desglose.gastoAjenoOut, bold: true, externo: true, border: true },
    ] : []),
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── RESUMEN EJECUTIVO ── */}
      <div style={cDark.card}>
        <div style={{ padding: "16px 16px 8px", fontSize: 13, fontWeight: 800, color: "#e4e4e7" }}>📊 Resumen ejecutivo</div>
        <div style={{ padding: "8px 16px 16px", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatBox label="Ingreso negocio" value={desglose.negIn} color="#34d399" sub="Todo lo que entró del negocio" />
          <StatBox label="Egreso negocio" value={desglose.negOut} color="#f87171" sub="Todo lo que salió del negocio" />
          <StatBox label="Ganancia neta" value={gananciaReal} color={gananciaReal >= 0 ? "#4ade80" : "#f87171"} sub="Ingreso - Egreso negocio" />
          {gastosOp > 0 && <StatBox label="Gastos operativos" value={gastosOp} color="#fbbf24" sub={`Sueldos${desglose.servicioOut > 0 ? " + Servicios" : ""}`} />}
          {gastosOp > 0 && <StatBox label="Libre después de gastos" value={libreDeGastos} color={libreDeGastos >= 0 ? "#22d3ee" : "#f87171"} sub="Ganancia - Sueldos - Servicios" />}
        </div>
        {/* Bolsillos */}
        <div style={{ padding: "0 16px 16px", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatBox label="💵 En efectivo" value={desglose.efecBal} color={desglose.efecBal >= 0 ? "#4ade80" : "#f87171"} sub="Incluye traspasos" />
          <StatBox label="📱 En Yape" value={desglose.yapeBal} color={desglose.yapeBal >= 0 ? "#a78bfa" : "#f87171"} sub="Incluye traspasos" />
          {desglose.extBal !== 0 && <StatBox label="👤 Externo" value={desglose.extBal} color="#fbbf24" sub="Plata de otras personas" />}
          {hasAjeno && <StatBox label="💰 Ajeno" value={desglose.gastoAjenoBal} color="#f59e0b" sub="Salió pero no es del negocio" />}
        </div>
      </div>

      {/* ── DESGLOSE DETALLADO ── */}
      <div style={cDark.card}>
        <div style={{ padding: "16px 16px 0", fontSize: 13, fontWeight: 800, color: "#e4e4e7" }}>📐 Desglose detallado</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...thS, minWidth: 200 }}></th>
                <th style={{ ...thS, textAlign: "right", color: "#34d399" }}>📥 Ingresos</th>
                <th style={{ ...thS, textAlign: "right", color: "#f87171" }}>📤 Egresos</th>
                <th style={{ ...thS, textAlign: "right", color: "#e4e4e7" }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                if (row.spacer) return <tr key={i}><td colSpan={4} style={{ padding: 6 }}></td></tr>
                if (row.isHead) return (
                  <tr key={i} style={{ background: "rgba(39,39,42,0.5)" }}>
                    <td colSpan={4} style={{ padding: "10px 16px", fontSize: 12, fontWeight: 700, color: "#a1a1aa" }}>{row.label}</td>
                  </tr>
                )
                const bal = (row.inVal || 0) - (row.outVal || 0)
                return (
                  <tr key={i} style={{ borderBottom: row.border ? "2px solid rgba(63,63,70,0.5)" : "1px solid rgba(63,63,70,0.15)" }}>
                    <td style={{ padding: row.indent ? "8px 16px 8px 36px" : "10px 16px", fontSize: 12, fontWeight: row.bold ? 700 : 400, color: row.externo ? "#fbbf24" : "#d4d4d8" }}>{row.label}</td>
                    <td style={{ padding: "8px 16px", textAlign: "right", fontFamily: "monospace", fontSize: row.bold ? 14 : 13, fontWeight: row.bold ? 800 : 500, color: "#34d399" }}>{formatMoney(row.inVal || 0)}</td>
                    <td style={{ padding: "8px 16px", textAlign: "right", fontFamily: "monospace", fontSize: row.bold ? 14 : 13, fontWeight: row.bold ? 800 : 500, color: "#f87171" }}>{formatMoney(row.outVal || 0)}</td>
                    <td style={{ padding: "8px 16px", textAlign: "right", fontFamily: "monospace", fontSize: row.bold ? 14 : 13, fontWeight: row.bold ? 800 : 500, color: bal >= 0 ? "#34d399" : "#f87171" }}>{formatMoney(bal)}</td>
                  </tr>
                )
              })}
              <tr style={{ background: "rgba(74,222,128,0.06)" }}>
                <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 800, color: "#4ade80" }}>💵 TOTAL EFECTIVO</td>
                <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "monospace", fontSize: 16, fontWeight: 900, color: "#34d399" }}>{formatMoney(desglose.efecIn)}</td>
                <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "monospace", fontSize: 16, fontWeight: 900, color: "#f87171" }}>{formatMoney(desglose.efecOut)}</td>
                <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "monospace", fontSize: 16, fontWeight: 900, color: desglose.efecBal >= 0 ? "#4ade80" : "#f87171" }}>{formatMoney(desglose.efecBal)}</td>
              </tr>
              <tr style={{ background: "rgba(139,92,246,0.06)" }}>
                <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 800, color: "#a78bfa" }}>📱 TOTAL YAPE</td>
                <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "monospace", fontSize: 16, fontWeight: 900, color: "#34d399" }}>{formatMoney(desglose.yapeIn)}</td>
                <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "monospace", fontSize: 16, fontWeight: 900, color: "#f87171" }}>{formatMoney(desglose.yapeOut)}</td>
                <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "monospace", fontSize: 16, fontWeight: 900, color: desglose.yapeBal >= 0 ? "#a78bfa" : "#f87171" }}>{formatMoney(desglose.yapeBal)}</td>
              </tr>
              <tr style={{ background: "rgba(14,165,233,0.08)" }}>
                <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 900, color: "#38bdf8" }}>TOTAL GENERAL</td>
                <td style={{ padding: "14px 16px", textAlign: "right", fontFamily: "monospace", fontSize: 18, fontWeight: 900, color: "#34d399" }}>{formatMoney(totalIngresos)}</td>
                <td style={{ padding: "14px 16px", textAlign: "right", fontFamily: "monospace", fontSize: 18, fontWeight: 900, color: "#f87171" }}>{formatMoney(totalEgresos)}</td>
                <td style={{ padding: "14px 16px", textAlign: "right", fontFamily: "monospace", fontSize: 18, fontWeight: 900, color: balance >= 0 ? "#34d399" : "#f87171" }}>{formatMoney(balance)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {(desglose.traspYaEf > 0 || desglose.traspEfYa > 0) && (
          <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(63,63,70,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24" }}>🔄 Traspasos (aplicados en totales)</span>
            <div style={{ display: "flex", gap: 16, fontSize: 12, fontFamily: "monospace" }}>
              {desglose.traspYaEf > 0 && <span>📱→💵 {formatMoney(desglose.traspYaEf)}</span>}
              {desglose.traspEfYa > 0 && <span>💵→📱 {formatMoney(desglose.traspEfYa)}</span>}
            </div>
          </div>
        )}
      </div>

      {/* ── CONCILIACION ── */}
      {(desglose.sueldoOut > 0 || desglose.servicioOut > 0 || desglose.hormigaOut > 0) && (
        <div style={cDark.card}>
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#e4e4e7", marginBottom: 12 }}>🔗 Conciliación con Contratos</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, fontFamily: "monospace" }}>
              {desglose.sueldoOut > 0 && (
                <div style={{ background: "rgba(245,158,11,0.06)", borderRadius: 10, padding: "10px 14px", border: "1px solid rgba(245,158,11,0.15)" }}>
                  <div style={{ fontSize: 10, color: "#fbbf24", fontWeight: 700 }}>💰 Sueldos pagados</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#fbbf24", marginTop: 2 }}>{formatMoney(desglose.sueldoOut)}</div>
                </div>
              )}
              {desglose.servicioOut > 0 && (
                <div style={{ background: "rgba(56,189,248,0.06)", borderRadius: 10, padding: "10px 14px", border: "1px solid rgba(56,189,248,0.15)" }}>
                  <div style={{ fontSize: 10, color: "#38bdf8", fontWeight: 700 }}>🏢 Servicios pagados</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#38bdf8", marginTop: 2 }}>{formatMoney(desglose.servicioOut)}</div>
                </div>
              )}
              {desglose.hormigaOut > 0 && (
                <div style={{ background: "rgba(244,114,182,0.06)", borderRadius: 10, padding: "10px 14px", border: "1px solid rgba(244,114,182,0.15)" }}>
                  <div style={{ fontSize: 10, color: "#f472b6", fontWeight: 700 }}>🐜 Gastos hormiga</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#f472b6", marginTop: 2 }}>{formatMoney(desglose.hormigaOut)}</div>
                </div>
              )}
              <div style={{ background: "rgba(16,185,129,0.06)", borderRadius: 10, padding: "10px 14px", border: "1px solid rgba(16,185,129,0.15)" }}>
                <div style={{ fontSize: 10, color: "#34d399", fontWeight: 700 }}>Balance negocio + Sueldos{desglose.servicioOut > 0 ? " + Servicios" : ""}{desglose.hormigaOut > 0 ? " + Hormiga" : ""}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#34d399", marginTop: 2 }}>{formatMoney(desglose.negBal + desglose.sueldoOut + desglose.servicioOut + desglose.hormigaOut)}</div>
                <div style={{ fontSize: 9, color: "#52525b", marginTop: 2 }}>≈ debería coincidir con Contratos "En Caja"</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
