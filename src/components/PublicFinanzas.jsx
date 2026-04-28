import { useState, useEffect } from "react"
import { fetchPublicContratos, fetchPublicCaja } from "../services/shareTokens"
import { peruNow, getWeekNumberISO } from "../lib/finanzas/helpers"
import { MESES_CORTO } from "../lib/finanzas/constants"
import ContratosModule from "./finanzas/contratos/ContratosModule"
import CajaModule from "./finanzas/caja/CajaModule"

const MODULES = [
  { id: "contratos", label: "Contratos", icon: "💼" },
  { id: "caja", label: "Caja", icon: "💰" },
]

// Vista pública read-only de Finanzas. Se accede vía /vista/:token.
// Fetch de data pasa por las RPC public_get_contratos / public_get_caja
// que solo devuelven algo si el token existe y no está revocado.
export default function PublicFinanzas({ token }) {
  const [activeModule, setActiveModule] = useState("contratos")
  const [contratos, setContratos] = useState(null)
  const [caja, setCaja] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filtro de período compartido (igual que Finanzas.jsx)
  const now = peruNow()
  const currentWeekNum = getWeekNumberISO(now)
  const currentMonthNum = now.getMonth() + 1
  const [filterSem, setFilterSem] = useState(String(currentWeekNum))
  const [filterMes, setFilterMes] = useState("")
  const setQuickAll = () => { setFilterSem(""); setFilterMes("") }
  const setQuickWeek = (w) => { setFilterMes(""); setFilterSem(String(w)) }
  const setQuickMonth = (m) => { setFilterSem(""); setFilterMes(String(m)) }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [c, j] = await Promise.all([
          fetchPublicContratos(token),
          fetchPublicCaja(token),
        ])
        if (cancelled) return
        // La RPC devuelve null cuando token inválido/revocado/no existe.
        if (c === null && j === null) {
          setError("Link inválido o revocado")
          setLoading(false)
          return
        }
        setContratos(Array.isArray(c) ? c : [])
        setCaja(Array.isArray(j) ? j : [])
        setLoading(false)
      } catch (e) {
        if (cancelled) return
        setError(e.message || "Error cargando datos")
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [token])

  const bgStyle = { minHeight: "100vh", background: "#09090b", color: "#e4e4e7", padding: "20px" }

  if (loading) return (
    <div style={{ ...bgStyle, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #3f3f46", borderTopColor: "#38bdf8", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ color: "#71717a", fontSize: 13 }}>Cargando finanzas...</div>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ ...bgStyle, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ background: "#18181b", borderRadius: 16, border: "1px solid #3f3f46", padding: 40, maxWidth: 400, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#e4e4e7", marginBottom: 8 }}>{error}</div>
        <div style={{ fontSize: 12, color: "#71717a" }}>Pedí un link nuevo al dueño</div>
      </div>
    </div>
  )

  return (
    <div style={bgStyle}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      <div className="finanzas-root" style={{ fontFamily: "'DM Sans',system-ui,sans-serif", maxWidth: 1280, margin: "0 auto" }}>
        <header style={{ borderBottom: "1px solid rgba(63,63,70,0.8)", paddingBottom: 16, marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, background: "linear-gradient(to right, #38bdf8, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 }}>Finanza Coketín · Vista</h1>
            <p style={{ fontSize: 11, color: "#71717a", margin: "2px 0 0" }}>Solo lectura · {MESES_CORTO[currentMonthNum]} {now.getFullYear()} · Semana {currentWeekNum}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(39,39,42,0.8)", borderRadius: 12, padding: 4, border: "1px solid #3f3f46" }}>
            {MODULES.map(m => (
              <button key={m.id} onClick={() => setActiveModule(m.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                  borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  whiteSpace: "nowrap", transition: "all .15s",
                  background: activeModule === m.id ? "rgba(14,165,233,0.25)" : "transparent",
                  color: activeModule === m.id ? "#7dd3fc" : "#71717a",
                  border: activeModule === m.id ? "1px solid rgba(56,189,248,0.6)" : "1px solid transparent",
                }}>
                <span>{m.icon}</span>{m.label}
              </button>
            ))}
          </div>
        </header>

        {activeModule === "contratos" && (
          <ContratosModule
            filterSem={filterSem} filterMes={filterMes}
            setQuickAll={setQuickAll} setQuickWeek={setQuickWeek} setQuickMonth={setQuickMonth}
            readOnly preloadedData={contratos}
          />
        )}
        {activeModule === "caja" && (
          <CajaModule
            filterSem={filterSem} filterMes={filterMes}
            setQuickAll={setQuickAll} setQuickWeek={setQuickWeek} setQuickMonth={setQuickMonth}
            readOnly preloadedData={caja}
          />
        )}
      </div>
    </div>
  )
}
