import { useState, memo } from "react"
import { C } from "../lib/colors"
import { inp, mi, btn, td, ib, DInput } from "./shared"
import { nowFull } from "../lib/helpers"

const EST_COLORS_INV = { bueno:C.green, dañado:C.yellow, reparacion:C.orange, baja:C.red }
const estLabel = e => ({ reparacion:"En reparacion", baja:"De baja" })[e] || (e ? e.charAt(0).toUpperCase()+e.slice(1) : "Bueno")

export default memo(function Inventario({ inventario, user, adm, onAddInventario, onUpdateInventario, onDeleteInventario }) {
  const [search, setSearch] = useState("")
  const [editId, setEditId] = useState(null)
  const [filterCat, setFilterCat] = useState("")

  const cats = [...new Set(inventario.map(i => i.categoria).filter(Boolean))]

  const addItem = async () => {
    const item = await onAddInventario({
      nombre: "", categoria: "", cantidad: 0, estado: "bueno", notas: "", created_by: user.name,
    })
    setEditId(item.id)
  }

  const upd = (id, field, val) => onUpdateInventario(id, { [field]: val })
  const del = async (id) => { if (!window.confirm("¿Eliminar este item permanentemente?")) return; await onDeleteInventario(id); if (editId===id) setEditId(null) }

  const filtered = inventario.filter(i => {
    if (filterCat && i.categoria !== filterCat) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (i.nombre||"").toLowerCase().includes(q) || (i.categoria||"").toLowerCase().includes(q)
    }
    return true
  })

  const totalItems = filtered.reduce((s,i) => s + (Number(i.cantidad)||0), 0)
  const estColors = EST_COLORS_INV

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>Inventario de Empresa</h2>
          <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>{filtered.length} ítems · {totalItems} unidades totales</div>
        </div>
        {adm && <button onClick={addItem} style={btn}>+ Nuevo Ítem</button>}
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar producto..." style={{ ...mi, flex:1, minWidth:200 }} />
        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{ ...mi, minWidth:120 }}>
          <option value="">Todas las categorías</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:40, textAlign:"center", color:C.muted }}>
          {inventario.length === 0 ? "Sin ítems en inventario." : "No se encontraron resultados."}
        </div>
      ) : (
        <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background:C.cardAlt }}>
                {["Producto","Categoría","Cantidad","Estado","Notas",""].map(h =>
                  <th key={h} style={{ padding:"10px 12px", textAlign:"left", fontWeight:600, color:C.muted, fontSize:12, borderBottom:`1px solid ${C.border}` }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => {
                const editing = editId === item.id
                return (
                  <tr key={item.id} style={{ borderBottom:`1px solid ${C.border}`, background:idx%2?C.cardAlt+"44":"transparent" }}>
                    <td style={td}>
                      {editing
                        ? <DInput value={item.nombre} onCommit={v=>upd(item.id,"nombre",v)} style={{ ...mi, width:180 }} placeholder="Nombre del producto" autoFocus />
                        : <span style={{ fontWeight:600 }}>{item.nombre||"Sin nombre"}</span>}
                    </td>
                    <td style={td}>
                      {editing
                        ? <DInput value={item.categoria||""} onCommit={v=>upd(item.id,"categoria",v)} style={{ ...mi, width:120 }} placeholder="Ej: Toldos" />
                        : <span style={{ color:C.muted }}>{item.categoria||"—"}</span>}
                    </td>
                    <td style={td}>
                      {editing
                        ? <DInput type="number" value={item.cantidad||""} onCommit={v=>upd(item.id,"cantidad",v)} style={{ ...mi, width:60 }} />
                        : <span style={{ fontWeight:700, color:C.accent }}>{item.cantidad||0}</span>}
                    </td>
                    <td style={td}>
                      {editing
                        ? <select value={item.estado||"bueno"} onChange={e=>upd(item.id,"estado",e.target.value)} style={mi}>
                            <option value="bueno">Bueno</option>
                            <option value="dañado">Dañado</option>
                            <option value="reparacion">En reparación</option>
                            <option value="baja">De baja</option>
                          </select>
                        : <span style={{ padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700, background:(estColors[item.estado]||C.green)+"33", color:estColors[item.estado]||C.green }}>
                            {estLabel(item.estado)}
                          </span>}
                    </td>
                    <td style={td}>
                      {editing
                        ? <DInput value={item.notas||""} onCommit={v=>upd(item.id,"notas",v)} style={{ ...mi, width:150 }} placeholder="Notas..." />
                        : <span style={{ color:C.muted, fontSize:12 }}>{item.notas||"—"}</span>}
                    </td>
                    <td style={td}>
                      <div style={{ display:"flex", gap:4 }}>
                        {adm && (
                          <button onClick={() => setEditId(editing ? null : item.id)} style={{ ...ib, color:editing?C.green:C.accent }}>
                            {editing ? "✓" : "✎"}
                          </button>
                        )}
                        {adm && (
                          <button onClick={() => del(item.id)} style={{ ...ib, color:C.danger }}>
                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 4h8M9 4V10a1 1 0 01-1 1H4a1 1 0 01-1-1V4"/></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
})
