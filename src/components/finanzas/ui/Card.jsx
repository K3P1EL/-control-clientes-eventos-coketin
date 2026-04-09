// Generic card container with optional title bar and accent border.
// Used by every Tailwind-styled section in the Finanzas module.
const ACCENTS = {
  sky: "border-sky-500/40",
  amber: "border-amber-500/40",
  emerald: "border-emerald-500/40",
  rose: "border-rose-500/40",
  violet: "border-violet-500/40",
  zinc: "border-zinc-600/40",
}

export default function Card({ title, icon, children, className = "", accent = "sky" }) {
  const accentClass = ACCENTS[accent] || ACCENTS.sky
  return (
    <div className={`bg-zinc-900/80 backdrop-blur-sm rounded-2xl border ${accentClass} shadow-xl shadow-black/20 overflow-hidden ${className}`}>
      {title && (
        <div className="px-5 py-3 border-b border-zinc-800/80 flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <h2 className="text-sm font-semibold tracking-wide uppercase text-zinc-300">{title}</h2>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}
