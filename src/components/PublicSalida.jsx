import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { C } from "../lib/colors"

const EST_LABEL = { por_recoger:"Por recoger", recogido:"Recogido", en_uso:"En uso", entregado:"Entregado", devuelto:"Devuelto" }
const EST_COLOR = { por_recoger:C.yellow, recogido:C.blue, en_uso:C.purple, entregado:C.accent, devuelto:C.green }

export default function PublicSalida({ code }) {
  const [loading, setLoading] = useState(true)
  const [salida, setSalida] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    (async () => {
      try {
        // Find client by code
        const { data: clients } = await supabase
          .from("clients")
          .select("id, nombre, code")
          .eq("code", code)
          .limit(1)
        if (!clients?.length) { setError("Ficha no encontrada"); setLoading(false); return }
        const client = clients[0]

        // Find active salida
        const { data: salidas } = await supabase
          .from("almacen_salidas")
          .select("*, almacen_items(*), almacen_archivos(*)")
          .eq("client_id", client.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
        if (!salidas?.length) { setError("No hay salida de almacen para este cliente"); setLoading(false); return }

        setSalida({ ...salidas[0], clientName: client.nombre, clientCode: client.code })
      } catch (e) {
        setError(e.message)
      }
      setLoading(false)
    })()
  }, [code])

  if (loading) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ textAlign:"center", color:C.accent }}>
        <div style={{ width:40, height:40, border:`3px solid ${C.border}`, borderTop:`3px solid ${C.accent}`, borderRadius:"50%", animation:"spin 1s linear infinite", margin:"0 auto 16px" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        Cargando...
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ background:C.card, borderRadius:16, border:`1px solid ${C.border}`, padding:40, maxWidth:400, textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:16 }}>!</div>
        <div style={{ fontSize:16, fontWeight:700, color:C.text, marginBottom:8 }}>{error}</div>
        <div style={{ fontSize:13, color:C.muted }}>Codigo: {code}</div>
      </div>
    </div>
  )

  const s = salida
  const items = s.almacen_items || []
  const archivos = s.almacen_archivos || []
  const devueltos = items.filter(it => it.devuelto).length
  const estColor = EST_COLOR[s.estado] || C.muted

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'Segoe UI',system-ui,sans-serif", color:C.text }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {/* Header */}
      <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:18, fontWeight:700 }}>Salida de Almacen</div>
          <div style={{ fontSize:13, color:C.muted }}>{s.clientName || "Cliente"} — {s.clientCode}</div>
        </div>
        <span style={{ padding:"4px 14px", borderRadius:20, fontSize:12, fontWeight:700, background:estColor+"33", color:estColor }}>
          {EST_LABEL[s.estado] || s.estado}
        </span>
      </div>

      <div style={{ maxWidth:600, margin:"0 auto", padding:20 }}>
        {/* Items */}
        <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:20, marginBottom:16 }}>
          <h3 style={{ margin:"0 0 12px", fontSize:15, fontWeight:600, color:C.accent }}>Productos / Materiales</h3>
          <div style={{ fontSize:12, color:C.muted, marginBottom:12 }}>{items.length} productos — {devueltos} devueltos</div>
          {!items.length ? (
            <div style={{ padding:16, textAlign:"center", color:C.muted, fontSize:13 }}>Sin productos</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {items.map(it => (
                <div key={it.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", borderRadius:8, background:C.cardAlt, border:`1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{it.nombre || "Sin nombre"}</div>
                    <div style={{ fontSize:11, color:C.muted }}>Cantidad: {it.cantidad || 1}</div>
                  </div>
                  <span style={{ padding:"3px 10px", borderRadius:6, fontSize:10, fontWeight:700, background:it.devuelto?C.green+"33":C.yellow+"33", color:it.devuelto?C.green:C.yellow }}>
                    {it.devuelto ? "Devuelto" : "Pendiente"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Archivos */}
        {archivos.length > 0 && (
          <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:20, marginBottom:16 }}>
            <h3 style={{ margin:"0 0 12px", fontSize:15, fontWeight:600, color:C.accent }}>Archivos</h3>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(100px, 1fr))", gap:10 }}>
              {archivos.map(ar => (
                <div key={ar.id} onClick={()=>window.open(ar.url)} style={{ borderRadius:10, overflow:"hidden", border:`1px solid ${C.border}`, cursor:"pointer", aspectRatio:"1" }}>
                  {ar.tipo?.startsWith("image")
                    ? <img src={ar.url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    : ar.tipo?.startsWith("video")
                    ? <div style={{ width:"100%", height:"100%", background:C.cardAlt, display:"flex", alignItems:"center", justifyContent:"center" }}><svg width="28" height="28" fill="none" stroke={C.purple} strokeWidth="2"><path d="M5 3l14 9-14 9V3z"/></svg></div>
                    : <div style={{ width:"100%", height:"100%", background:C.cardAlt, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:C.yellow, fontWeight:700 }}>PDF</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notas */}
        {s.notas && (
          <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:20 }}>
            <h3 style={{ margin:"0 0 8px", fontSize:15, fontWeight:600, color:C.accent }}>Notas</h3>
            <div style={{ fontSize:13, color:C.muted, whiteSpace:"pre-wrap" }}>{s.notas}</div>
          </div>
        )}

        <div style={{ textAlign:"center", marginTop:24, fontSize:11, color:C.muted }}>
          Eventos Los Coketines — {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}
