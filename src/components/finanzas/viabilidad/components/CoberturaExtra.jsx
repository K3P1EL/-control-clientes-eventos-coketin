import { useState } from "react"
import NumInput from "../../ui/NumInput"
import TextInput from "../../ui/TextInput"
import { fmtS } from "../../../../lib/finanzas/helpers"

// Collapsible "cobertura extra" panel — only relevant when an employee
// covered the shop on a normally-closed day. Shown inside ConfigTab.
export default function CoberturaExtra({ workers, diasOpBase, cobExtra, setCobExtra }) {
  const [open, setOpen] = useState(false)
  const cobExtraDias = cobExtra?.dias || 0
  const cobExtraPagadoAparte = cobExtra?.pagadoAparte || false
  const cobExtraMonto = cobExtra?.monto || 0
  const cobExtraNombre = cobExtra?.nombre || []
  const cobExtraNota = cobExtra?.nota || ""

  return (
    <div className="mt-5 bg-zinc-800/40 rounded-xl border border-amber-500/20 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800/40 transition-all">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-amber-400">👤 Cobertura extra</h3>
          {cobExtraDias > 0 && !open && (
            <span className="text-[10px] bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
              {cobExtraDias} días · {cobExtraNombre.length > 0 ? cobExtraNombre.join(", ") : "sin asignar"}
            </span>
          )}
        </div>
        <span className={`text-zinc-500 text-xs transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-xs text-zinc-500 mb-4">Cuando la tienda normalmente cierra pero alguien la cubrió y operó ese día.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">¿Quién cubrió?</label>
              <div className="flex flex-wrap gap-1.5">
                {workers.filter(w => w.name).map((w, i) => {
                  const selected = cobExtraNombre.includes(w.name)
                  return (
                    <button key={i} onClick={() => setCobExtra("nombre", selected ? cobExtraNombre.filter(n => n !== w.name) : [...cobExtraNombre, w.name])}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selected ? "bg-amber-500/20 border-amber-500/40 text-amber-400" : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600"}`}>
                      <span className={`inline-block w-3.5 h-3.5 rounded border-2 mr-1.5 align-middle text-[8px] font-bold leading-3 text-center ${selected ? "border-amber-500 bg-amber-500/30 text-amber-400" : "border-zinc-600"}`}>{selected ? "✓" : ""}</span>
                      {w.name}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">¿Cuántos días cubrió?</label>
              <NumInput value={cobExtraDias} onChange={v => setCobExtra("dias", v || 0)} min={0} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Monto total pagado (S/)</label>
              <NumInput value={cobExtraMonto} onChange={v => setCobExtra("monto", v || 0)} min={0} />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">¿Cómo se pagó?</label>
              <button onClick={() => setCobExtra("pagadoAparte", !cobExtraPagadoAparte)}
                className={`w-full rounded-lg px-3 py-2 text-sm border transition-all flex items-center gap-2 ${cobExtraPagadoAparte ? "bg-amber-500/15 border-amber-500/40 text-amber-400" : "bg-zinc-800 border-zinc-700 text-zinc-400"}`}>
                <span className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs font-bold shrink-0 ${cobExtraPagadoAparte ? "border-amber-500 bg-amber-500/20 text-amber-400" : "border-zinc-600"}`}>{cobExtraPagadoAparte ? "✓" : ""}</span>
                <span className="text-left">{cobExtraPagadoAparte ? "Pago aparte — gasto adicional" : "Dentro del sueldo — ya incluido"}</span>
              </button>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Motivo / nota</label>
              <TextInput value={cobExtraNota} onChange={v => setCobExtra("nota", v)} placeholder="Ej: Cubrió domingos" />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Días op. con cobertura</label>
              <div className="bg-emerald-500/10 rounded-lg px-3 py-1.5 text-sm text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                {diasOpBase}
                {cobExtraDias > 0 && <span className="text-[10px] text-zinc-500 font-normal ml-2">(+{cobExtraDias} extra)</span>}
              </div>
            </div>
          </div>
          {cobExtraDias > 0 && (
            <div className="mt-4 pt-3 border-t border-zinc-700/40 space-y-2">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Resumen de impacto</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-zinc-800/60 rounded-lg p-3 border border-zinc-700/40">
                  <div className="text-[10px] text-zinc-500 uppercase">Cubrió</div>
                  <div className="text-sm font-mono font-bold text-zinc-200 mt-0.5">{cobExtraNombre.length > 0 ? cobExtraNombre.join(", ") : "Sin asignar"}</div>
                </div>
                <div className="bg-zinc-800/60 rounded-lg p-3 border border-zinc-700/40">
                  <div className="text-[10px] text-zinc-500 uppercase">Días extra operados</div>
                  <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5">{cobExtraDias} días</div>
                </div>
                <div className="bg-zinc-800/60 rounded-lg p-3 border border-zinc-700/40">
                  <div className="text-[10px] text-zinc-500 uppercase">Costo por día</div>
                  <div className="text-sm font-mono font-bold text-zinc-200 mt-0.5">{cobExtraDias > 0 ? fmtS(cobExtraMonto / cobExtraDias) : "—"}</div>
                </div>
                <div className="bg-zinc-800/60 rounded-lg p-3 border border-zinc-700/40">
                  <div className="text-[10px] text-zinc-500 uppercase">Impacto en costos</div>
                  <div className={`text-sm font-mono font-bold mt-0.5 ${cobExtraPagadoAparte ? "text-red-400" : "text-emerald-400"}`}>
                    {cobExtraPagadoAparte ? `+${fmtS(cobExtraMonto)} al mes` : "S/ 0 — ya incluido"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
