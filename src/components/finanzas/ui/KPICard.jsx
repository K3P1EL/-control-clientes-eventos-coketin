// Single KPI tile. type=positive (green) / negative (red) / neutral.
const BORDERS = {
  positive: "border-emerald-500/40",
  negative: "border-red-500/40",
  neutral: "border-zinc-700",
}
const VALUE_COLORS = {
  positive: "text-emerald-400",
  negative: "text-red-400",
  neutral: "text-zinc-100",
}

export default function KPICard({ label, value, sub, type = "neutral" }) {
  const border = BORDERS[type] || BORDERS.neutral
  const valColor = VALUE_COLORS[type] || VALUE_COLORS.neutral
  return (
    <div className={`bg-zinc-800/60 rounded-xl border ${border} p-4 flex flex-col gap-1`}>
      <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}</span>
      <span className={`text-xl font-bold font-mono ${valColor}`}>{value}</span>
      {sub && <span className="text-xs text-zinc-500">{sub}</span>}
    </div>
  )
}
