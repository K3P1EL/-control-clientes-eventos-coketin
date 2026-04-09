// Pill badge with semantic color (danger/warn/ok/info/muted).
const COLORS = {
  danger: "bg-red-500/15 text-red-400 border-red-500/30",
  warn: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  ok: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  info: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  muted: "bg-zinc-700/50 text-zinc-400 border-zinc-600/30",
}

export default function StatusBadge({ text, type }) {
  const cls = COLORS[type] || COLORS.muted
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>{text}</span>
}
