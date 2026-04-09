import { useState } from "react"

// Numeric input with focus/blur display logic so a stale "0" doesn't
// block the user from typing. On focus, raw text is shown; on blur,
// the canonical numeric value is shown.
export default function NumInput({ value, onChange, placeholder = "", className = "", min, step }) {
  const [raw, setRaw] = useState("")
  const [focused, setFocused] = useState(false)
  const display = focused ? raw : (value === "" ? "" : String(value))

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={e => {
        const v = e.target.value.replace(/[^0-9.\-]/g, "")
        setRaw(v)
        if (v === "" || v === "-") return onChange("")
        const num = Number(v)
        if (!isNaN(num)) onChange(num)
      }}
      onFocus={e => {
        setFocused(true)
        setRaw(value === "" ? "" : String(value))
        if (String(value) === "0") e.target.select()
      }}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      min={min}
      step={step || 1}
      className={`bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 w-full focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/30 transition-all ${className}`}
    />
  )
}
