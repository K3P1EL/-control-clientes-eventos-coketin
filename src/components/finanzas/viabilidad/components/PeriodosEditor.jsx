import { peruToday, darDeBaja, readmitir, fmtFecha, getOpenPeriod } from "../../../../lib/finanzas/helpers"

// Editor genérico de períodos de alta/baja.
// Reutilizable para workers, servicios y apoyos: recibe el record y una
// función onChange(nuevosPeriodos). No conoce nada específico del dominio.
//
// Comportamiento:
// - Un record sin `periodos` = activo siempre (sin historial).
// - "📤 Dar de baja hoy": cierra el período abierto (o crea uno con hasta=hoy).
// - "📥 Readmitir hoy": agrega un nuevo período abierto desde hoy.
// - Las fechas se pueden editar manualmente (para cargas retroactivas).
// - Un período se puede eliminar con la x (ej: cargado por error).
export default function PeriodosEditor({ record, onChange, label = "Períodos" }) {
  const periodos = Array.isArray(record?.periodos) ? record.periodos : []
  const open = getOpenPeriod(record)
  const isActive = periodos.length === 0 || !!open

  const handleBaja = () => onChange(darDeBaja(periodos, peruToday()))
  const handleReadmitir = () => onChange(readmitir(periodos, peruToday()))

  const updatePeriod = (idx, field, value) => {
    const next = periodos.map((p, i) => i === idx ? { ...p, [field]: value || null } : p)
    onChange(next)
  }
  const removePeriod = (idx) => onChange(periodos.filter((_, i) => i !== idx))
  const addEmpty = () => onChange([...periodos, { desde: peruToday(), hasta: null }])

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 mt-3">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          📋 {label}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isActive ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-zinc-700/40 text-zinc-400 border border-zinc-600/40"}`}>
            {isActive ? "ACTIVO" : "INACTIVO"}
          </span>
        </h4>
        <div className="flex gap-2">
          {isActive ? (
            <button onClick={handleBaja}
              className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-all">
              📤 Dar de baja hoy
            </button>
          ) : (
            <button onClick={handleReadmitir}
              className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all">
              📥 Readmitir hoy
            </button>
          )}
        </div>
      </div>

      {periodos.length === 0 ? (
        <p className="text-[11px] text-zinc-500 italic">
          Sin períodos configurados — se trata como activo desde siempre. Presioná "Dar de baja hoy" para empezar a llevar historial.
        </p>
      ) : (
        <div className="space-y-1.5">
          {periodos.map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-xs bg-zinc-800/40 rounded-lg px-3 py-2">
              <span className="text-zinc-500 font-mono w-6">#{i + 1}</span>
              <label className="text-zinc-500">Desde</label>
              <input type="date" value={p.desde || ""}
                onChange={e => updatePeriod(i, "desde", e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-sky-500/60" />
              <span className="text-zinc-600">→</span>
              <label className="text-zinc-500">Hasta</label>
              <input type="date" value={p.hasta || ""}
                onChange={e => updatePeriod(i, "hasta", e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-sky-500/60" />
              {!p.hasta && (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-semibold">actual</span>
              )}
              {!p.desde && (
                <span className="text-[10px] text-zinc-500 bg-zinc-700/30 px-2 py-0.5 rounded-full" title="Se asume desde siempre">sin inicio</span>
              )}
              <button onClick={() => removePeriod(i)}
                className="ml-auto text-red-400/60 hover:text-red-400 text-base transition-colors"
                title="Eliminar este período">×</button>
            </div>
          ))}
        </div>
      )}

      <button onClick={addEmpty}
        className="mt-3 px-3 py-1 text-[11px] text-zinc-400 hover:text-sky-400 border border-zinc-700 hover:border-sky-500/40 rounded-lg transition-all">
        + Agregar período manualmente
      </button>
    </div>
  )
}
