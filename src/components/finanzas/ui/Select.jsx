// Styled select. Accepts options as either ["a","b"] or [{value, label}].
export default function Select({ value, onChange, options, className = "" }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 w-full focus:outline-none focus:border-sky-500/60 appearance-none cursor-pointer ${className}`}
    >
      {options.map(o =>
        typeof o === "string"
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
      )}
    </select>
  )
}
