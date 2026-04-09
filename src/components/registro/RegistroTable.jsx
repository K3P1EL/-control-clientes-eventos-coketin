import { memo, useMemo } from "react"
import { C } from "../../lib/colors"
import RegistroRow from "./RegistroRow"

// Tabla principal de registros con edición inline, drag-drop de archivos,
// y todas las acciones de fila. Cada fila vive en RegistroRow para que el
// memo() de fila pueda saltarse re-renders cuando solo cambia OTRA fila.
//
// Optimización clave: en vez de hacer `clients.find(...)` dentro de cada
// fila (que escanearía el array entero por fila), construimos UN mapa
// `linkedByRegId` aquí arriba y le pasamos a cada fila SU cliente ya
// resuelto. Sin esto el memo() seguiría re-corriendo en cada cambio de
// `clients` aunque la fila no haya cambiado.
export default memo(function RegistroTable({
  rows, total, showAll, adm, user, clients, tags, locales,
  selectedRow, setSelectedRow,
  dragOverRow, contractUploading,
  cRef, setContractUpId, setPreviewRegId,
  upd, del, restore, hardDel,
  goToClient, onAddClient,
  onRowDragOver, onRowDragLeave, onRowDrop,
}) {
  // Build a map of regId -> linked client. Recomputes only when `clients`
  // changes, not when the user types in some unrelated cell.
  const linkedByRegId = useMemo(() => {
    const m = new Map()
    for (const c of clients) {
      if (c.deleted_at) continue
      const rids = c.reg_ids || []
      for (const rid of rids) m.set(rid, c)
    }
    return m
  }, [clients])

  // Compute non-deleted index map and visible window once per render of
  // the table (not once per row).
  const { visibleRows, nonDelIdSet } = useMemo(() => {
    const nonDelRows = rows.filter(x => !x.deleted)
    const idSet = new Map(nonDelRows.map((r,i) => [r.id, i]))
    const visible = showAll ? rows : (nonDelRows.length > 5 ? nonDelRows.slice(-5) : nonDelRows)
    return { visibleRows: visible, nonDelIdSet: idSet }
  }, [rows, showAll])

  return (
    <>
      <div style={{ overflowX:"auto", borderRadius:12, border:`1px solid ${C.border}` }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:1300, fontSize:13 }}>
          <thead>
            <tr style={{ background:C.cardAlt }}>
              {["#","Fecha","Empleado","Local","Hora Ingreso","Archivo","Canal","Sexo","Edad","Piraña","Estado","Observaciones","Ficha","Acciones"].map(h =>
                <th key={h} style={{ padding:"12px 10px", textAlign:"left", fontWeight:600, color:C.muted, fontSize:12, borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={14} style={{ padding:40, textAlign:"center", color:C.muted }}>No hay registros. Haz clic en "+ Agregar Registro".</td></tr>
            )}
            {visibleRows.map((r, i) => {
              const isDel = r.deleted
              const nonDelIdx = isDel ? -1 : (nonDelIdSet.get(r.id) ?? -1)
              const canEdit = !isDel && (adm || nonDelIdx >= total - 3)
              return (
                <RegistroRow
                  key={r.id}
                  r={r}
                  i={i}
                  linked={linkedByRegId.get(r.id) || null}
                  isSel={selectedRow === r.id}
                  isDrag={dragOverRow === r.id}
                  canEdit={canEdit}
                  isUploading={contractUploading.has(r.id)}
                  total={total}
                  adm={adm}
                  locales={locales}
                  tags={tags}
                  upd={upd}
                  del={del}
                  restore={restore}
                  hardDel={hardDel}
                  setSelectedRow={setSelectedRow}
                  setContractUpId={setContractUpId}
                  setPreviewRegId={setPreviewRegId}
                  cRef={cRef}
                  goToClient={goToClient}
                  onAddClient={onAddClient}
                  user={user}
                  onRowDragOver={onRowDragOver}
                  onRowDragLeave={onRowDragLeave}
                  onRowDrop={onRowDrop}
                />
              )
            })}
          </tbody>
        </table>
      </div>

      {!adm && total > 3 && (
        <div style={{ marginTop:10, fontSize:12, color:C.muted, display:"flex", alignItems:"center", gap:6 }}>
          <svg width="14" height="14" fill="none" stroke={C.yellow} strokeWidth="2"><circle cx="7" cy="7" r="5.5"/><path d="M7 5v3M7 10h.01"/></svg>
          Solo puedes editar los datos de las últimas 3 filas.
        </div>
      )}
    </>
  )
})
