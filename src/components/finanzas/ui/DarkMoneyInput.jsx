import { useState, useEffect } from "react"

// Money input that hides "0" placeholder until user focuses, so empty
// fields don't show a confusing "0".
export default function DarkMoneyInput({ value, onChange, style }) {
  const [raw, setRaw] = useState(String(value || ""))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setRaw(value === 0 ? "" : String(value || ""))
  }, [value, focused])

  return (
    <input
      style={style}
      type="text"
      inputMode="numeric"
      value={focused ? raw : (value === 0 ? "" : String(value || ""))}
      placeholder="0"
      onFocus={() => { setFocused(true); setRaw(value === 0 ? "" : String(value || "")) }}
      onBlur={() => setFocused(false)}
      onChange={e => {
        const v = e.target.value.replace(/[^0-9.]/g, "")
        setRaw(v)
        onChange(parseFloat(v) || 0)
      }}
    />
  )
}
