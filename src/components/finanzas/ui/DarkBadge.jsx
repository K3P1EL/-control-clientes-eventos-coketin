// Inline-style badge used by Contratos/Caja tables. Color tokens are
// duplicated here on purpose so this file is self-contained.
const COLORS = {
  green: { bg: "rgba(16,185,129,0.15)", text: "#34d399", border: "rgba(16,185,129,0.3)" },
  red: { bg: "rgba(239,68,68,0.15)", text: "#f87171", border: "rgba(239,68,68,0.3)" },
  yellow: { bg: "rgba(245,158,11,0.15)", text: "#fbbf24", border: "rgba(245,158,11,0.3)" },
  blue: { bg: "rgba(56,189,248,0.15)", text: "#38bdf8", border: "rgba(56,189,248,0.3)" },
  neutral: { bg: "rgba(63,63,70,0.5)", text: "#a1a1aa", border: "rgba(63,63,70,0.6)" },
  purple: { bg: "rgba(139,92,246,0.15)", text: "#a78bfa", border: "rgba(139,92,246,0.3)" },
}

export default function DarkBadge({ children, color = "neutral" }) {
  const c = COLORS[color] || COLORS.neutral
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
      {children}
    </span>
  )
}
