// Plain text input — no special focus logic, just Tailwind styling.
export default function TextInput({ value, onChange, placeholder = "", className = "" }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 w-full focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/30 transition-all ${className}`}
    />
  )
}
