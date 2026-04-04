import { C } from "../lib/colors"

const allItems = [
  { id:"registro",    label:"Registro",   d:"M3 3h12v12H3zM3 8h12" },
  { id:"fichas",      label:"Fichas",     d:"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" },
  { id:"clientes",    label:"Clientes",   d:"M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 3a4 4 0 100 8 4 4 0 000-8z" },
  { id:"almacen",     label:"Almacén",    d:"M3 3h4l2 3h6l2-3h4v12H3zM8 10h6M11 8v4" },
  { id:"inventario",  label:"Inventario", d:"M4 4h16v4H4zM6 8v8h12V8M10 11h4" },
  { id:"agenda",      label:"Agenda",     d:"M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" },
  { id:"auditoria",   label:"Auditoría",  d:"M9 3a6 6 0 100 12A6 6 0 009 3zM9 6v3l2 1" },
  { id:"dashboard",   label:"Dashboard",  d:"M3 10h3v5H3zM8 6h3v9H8zM13 3h3v12h-3z" },
]
const adminItem = { id:"admin", label:"Admin", d:"M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 3a4 4 0 100 8 4 4 0 000-8zM19 8l2 2-2 2M21 10h-6" }

export default function Side({ tab, set, adm, open, perms }) {
  const items = adm
    ? [...allItems, adminItem]
    : allItems.filter(t => (perms||[]).includes(t.id))

  return (
    <aside
      className={`desk-side ${open ? "mob-side" : ""}`}
      style={{
        width:200, background:C.sidebar, borderRight:`1px solid ${C.border}`,
        padding:"20px 12px", display:"flex", flexDirection:"column", gap:4,
        ...(open ? { position:"fixed", left:0, top:0, bottom:0, zIndex:50 } : {}),
      }}
    >
      <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:1, padding:"0 12px", marginBottom:8 }}>
        Navegación
      </div>
      {items.map(t => (
        <button
          key={t.id}
          onClick={() => set(t.id)}
          style={{
            display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:8,
            border:"none", background:tab===t.id ? C.accent+"22" : "transparent",
            color:tab===t.id ? C.accent : C.muted, cursor:"pointer", fontSize:14,
            fontWeight:tab===t.id ? 600 : 400, transition:"all .15s", textAlign:"left", width:"100%",
          }}
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d={t.d}/></svg>
          <span>{t.label}</span>
        </button>
      ))}
    </aside>
  )
}
