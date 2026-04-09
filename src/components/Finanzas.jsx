import { useState } from "react"
import ViabilidadModule from "./finanzas/viabilidad/ViabilidadModule"
import ContratosModule from "./finanzas/contratos/ContratosModule"
import CajaModule from "./finanzas/caja/CajaModule"

// Top-level Finanzas entry. Holds a small tab bar to switch between
// the 3 sub-modules. Each module owns its own state and persistence;
// nothing is shared between them.
//
// Wrapped in a dark-themed container so the Tailwind classes inside
// the modules render against the right background regardless of the
// rest of the app's inline styles.
const MODULES = [
  { id: "viabilidad", label: "Viabilidad Operativa", icon: "📈" },
  { id: "contratos", label: "Contratos", icon: "💼" },
  { id: "caja", label: "Caja", icon: "💰" },
]

export default function Finanzas() {
  const [activeModule, setActiveModule] = useState("viabilidad")

  // Background color is set on the parent <main> in App.jsx when tab==="finanzas",
  // so we don't need to wrap ourselves in a colored container — we just inherit
  // the dark zinc-950 from above. That avoids any rim/gap from the parent padding.
  return (
    <div className="text-zinc-100" style={{ fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      <header className="border-b border-zinc-800/80 pb-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">Finanza Coketín</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Sistema integral de gestión financiera</p>
          </div>
          <div className="flex items-center gap-1 bg-zinc-900/80 rounded-xl p-1 border border-zinc-800">
            {MODULES.map(m => (
              <button key={m.id} onClick={() => setActiveModule(m.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                  activeModule === m.id
                    ? "bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-lg shadow-sky-500/5"
                    : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                }`}>
                <span>{m.icon}</span>{m.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div style={{ display: activeModule === "viabilidad" ? "block" : "none" }}><ViabilidadModule /></div>
      <div style={{ display: activeModule === "contratos" ? "block" : "none" }}><ContratosModule /></div>
      <div style={{ display: activeModule === "caja" ? "block" : "none" }}><CajaModule /></div>
    </div>
  )
}
