import { useState, useEffect, useRef } from "react"

// Money input that hides "0" placeholder until the user focuses, so empty
// fields don't show a confusing "0". Also resyncs the local raw text
// whenever the parent value changes WHILE focused — that way ContractModal's
// "no trackeado" toggle (which clears multiple fields at once) doesn't leave
// the input showing stale text.
export default function DarkMoneyInput({ value, onChange, style }) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw] = useState(String(value || ""))
  // Track whether the latest raw text came from the user's keystrokes,
  // so we don't fight their typing with parent-driven sync.
  const userTyping = useRef(false)

  useEffect(() => {
    if (userTyping.current) {
      userTyping.current = false
      return
    }
    setRaw(value === 0 ? "" : String(value || ""))
  }, [value])

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
        userTyping.current = true
        setRaw(v)
        onChange(parseFloat(v) || 0)
      }}
    />
  )
}
