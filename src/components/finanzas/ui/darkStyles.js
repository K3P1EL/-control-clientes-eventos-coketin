// Inline-style tokens shared by Contratos and Caja modules.
// These predate Tailwind in the original code; we keep them as-is so
// the look is identical and there's a single source of truth instead
// of repeating literals everywhere.

export const cDark = {
  card: { background: "rgba(24,24,27,0.8)", borderRadius: 16, border: "1px solid rgba(63,63,70,0.6)", overflow: "hidden", backdropFilter: "blur(8px)" },
  cardHeader: { padding: "14px 20px", borderBottom: "1px solid rgba(63,63,70,0.5)", background: "rgba(39,39,42,0.4)" },
  cardTitle: { margin: 0, fontSize: 15, fontWeight: 800, color: "#e4e4e7" },
  th: { padding: "10px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#a1a1aa", textAlign: "left", whiteSpace: "nowrap", position: "sticky", top: 0, background: "rgba(39,39,42,0.9)", borderBottom: "2px solid rgba(63,63,70,0.8)", zIndex: 1 },
  td: { padding: "10px 12px", fontSize: 13, verticalAlign: "middle", color: "#d4d4d8" },
  input: { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #3f3f46", fontSize: 13, background: "#27272a", color: "#e4e4e7", outline: "none", boxSizing: "border-box" },
  select: { padding: "6px 10px", borderRadius: 8, border: "1px solid #3f3f46", fontSize: 12, background: "#27272a", color: "#e4e4e7", cursor: "pointer" },
  label: { fontSize: 11, fontWeight: 600, color: "#a1a1aa", marginBottom: 3, display: "block", textTransform: "uppercase", letterSpacing: 0.3 },
  iconBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: "2px 4px", borderRadius: 4 },
  statCard: () => ({ background: "rgba(39,39,42,0.6)", borderRadius: 14, padding: "16px 18px", border: "1px solid rgba(63,63,70,0.6)", flex: "1 1 140px", minWidth: 140, position: "relative", overflow: "hidden" }),
  statAccent: (accent) => ({ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent }),
}

// Avatar bar colors per persona used in "Mi Plata" view.
export const barColors = { Yo: "#38bdf8", Loli: "#a78bfa", Mama: "#f472b6", Jose: "#fbbf24", Otro: "#71717a" }
