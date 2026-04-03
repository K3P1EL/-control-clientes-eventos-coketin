export const today = () => {
  const d = new Date()
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`
}

export const nowTime = () => {
  const d = new Date()
  let h = d.getHours()
  const m = String(d.getMinutes()).padStart(2,"0")
  const ampm = h >= 12 ? "pm" : "am"
  h = h % 12 || 12
  return `${h}:${m} ${ampm}`
}

export const nowFull = () => {
  const d = new Date()
  return `${today()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`
}

export const genCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let c = ""
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)]
  return "FIC-" + c
}

// Formatea un timestamp ISO de Supabase a "DD/MM/YYYY"
export const fmtDate = (ts) => {
  if (!ts) return ""
  try {
    const d = new Date(ts)
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`
  } catch { return "" }
}

// Convierte "DD/MM/YYYY" → "YYYY-MM-DD" (para input type="date")
export const toInputDate = (d) => {
  if (!d) return ""
  try { const p = d.split("/"); return `${p[2]}-${p[1]}-${p[0]}` } catch { return "" }
}

// Convierte "YYYY-MM-DD" → "DD/MM/YYYY"
export const fromInputDate = (d) => {
  if (!d) return ""
  try { const p = d.split("-"); return `${p[2]}/${p[1]}/${p[0]}` } catch { return "" }
}
