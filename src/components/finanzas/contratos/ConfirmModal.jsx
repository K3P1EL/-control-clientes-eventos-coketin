import { useEffect } from "react"

// Generic delete-confirmation modal used by Contratos.
export default function ConfirmModal({ message, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onCancel() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onCancel])

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1001, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#18181b", borderRadius: 16, padding: 28, maxWidth: 380, textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.4)", border: "1px solid #3f3f46" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
        <p style={{ fontSize: 14, color: "#d4d4d8", marginBottom: 20 }}>{message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onCancel} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #3f3f46", background: "#27272a", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#a1a1aa" }}>No</button>
          <button onClick={onConfirm} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#dc2626", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Sí, eliminar</button>
        </div>
      </div>
    </div>
  )
}
