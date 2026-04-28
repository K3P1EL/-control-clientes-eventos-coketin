import { useState, useEffect } from "react"
import { listTokens, createToken, revokeToken, deleteToken } from "../../services/shareTokens"

// Modal para gestionar links públicos de vista read-only de Finanzas.
// Genera URL tipo /vista/:token. Si el link se filtra, el dueño puede
// revocarlo (deja de funcionar inmediatamente) o borrarlo.
export default function ShareLinkModal({ onClose }) {
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const [newLabel, setNewLabel] = useState("")
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(null)

  const refresh = async () => {
    try {
      const list = await listTokens()
      setTokens(list)
    } catch (e) {
      alert("Error cargando tokens: " + e.message)
    }
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { refresh() }, [])

  const handleCreate = async () => {
    setCreating(true)
    try {
      await createToken(newLabel.trim() || null)
      setNewLabel("")
      await refresh()
    } catch (e) {
      alert("Error creando token: " + e.message)
    }
    setCreating(false)
  }

  const handleRevoke = async (token) => {
    if (!window.confirm("¿Revocar este link? Deja de funcionar inmediatamente.")) return
    try { await revokeToken(token); await refresh() }
    catch (e) { alert("Error: " + e.message) }
  }

  const handleDelete = async (token) => {
    if (!window.confirm("¿Borrar este link permanentemente? No se puede deshacer.")) return
    try { await deleteToken(token); await refresh() }
    catch (e) { alert("Error: " + e.message) }
  }

  const buildUrl = (token) => `${window.location.origin}/vista/${token}`

  const handleCopy = async (token) => {
    try {
      await navigator.clipboard.writeText(buildUrl(token))
      setCopied(token)
      setTimeout(() => setCopied(null), 2000)
    } catch { alert("No se pudo copiar. Copialo manualmente: " + buildUrl(token)) }
  }

  const btn = { padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#18181b", borderRadius: 16, border: "1px solid #3f3f46", maxWidth: 700, width: "100%", maxHeight: "85vh", overflow: "auto", color: "#e4e4e7", fontFamily: "'DM Sans',system-ui,sans-serif" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(63,63,70,0.6)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>🔗 Links de vista pública</h2>
            <p style={{ fontSize: 11, color: "#71717a", margin: "4px 0 0" }}>Read-only de Caja y Contratos. Si se filtra, revocá.</p>
          </div>
          <button onClick={onClose} style={{ ...btn, background: "transparent", color: "#71717a", fontSize: 20 }}>✕</button>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Etiqueta (ej: 'Dueña Loli')"
              onKeyDown={e => { if (e.key === "Enter" && !creating) handleCreate() }}
              style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #3f3f46", background: "#27272a", color: "#e4e4e7", fontSize: 13 }}
            />
            <button onClick={handleCreate} disabled={creating}
              style={{ ...btn, padding: "8px 16px", background: creating ? "#3f3f46" : "#0ea5e9", color: "#fff", fontSize: 13 }}>
              {creating ? "Creando..." : "+ Crear link"}
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#71717a", fontSize: 13 }}>Cargando...</div>
          ) : tokens.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#71717a", fontSize: 13 }}>
              No hay links todavía. Creá uno arriba.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tokens.map(t => {
                const url = buildUrl(t.token)
                const isCopied = copied === t.token
                return (
                  <div key={t.token} style={{
                    background: t.revoked ? "rgba(239,68,68,0.05)" : "rgba(39,39,42,0.5)",
                    border: `1px solid ${t.revoked ? "rgba(239,68,68,0.3)" : "rgba(63,63,70,0.6)"}`,
                    borderRadius: 10, padding: 14,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: t.revoked ? "#71717a" : "#e4e4e7" }}>{t.label || "Sin etiqueta"}</span>
                        {t.revoked && <span style={{ fontSize: 10, fontWeight: 700, color: "#f87171", background: "rgba(239,68,68,0.15)", padding: "2px 8px", borderRadius: 4 }}>REVOCADO</span>}
                      </div>
                      <div style={{ fontSize: 10, color: "#52525b", fontFamily: "monospace" }}>
                        {new Date(t.created_at).toLocaleDateString("es-PE")}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <code style={{ flex: 1, minWidth: 200, fontSize: 11, color: t.revoked ? "#52525b" : "#a1a1aa", background: "#09090b", padding: "6px 10px", borderRadius: 6, border: "1px solid #3f3f46", fontFamily: "monospace", textDecoration: t.revoked ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</code>
                      {!t.revoked && (
                        <button onClick={() => handleCopy(t.token)} style={{ ...btn, background: isCopied ? "#22c55e" : "#27272a", color: isCopied ? "#fff" : "#a1a1aa", border: "1px solid #3f3f46" }}>
                          {isCopied ? "✓ Copiado" : "📋 Copiar"}
                        </button>
                      )}
                      {!t.revoked && (
                        <button onClick={() => handleRevoke(t.token)} style={{ ...btn, background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.35)" }}>
                          Revocar
                        </button>
                      )}
                      <button onClick={() => handleDelete(t.token)} style={{ ...btn, background: "transparent", color: "#71717a", border: "1px solid #3f3f46" }} title="Borrar permanente">
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
