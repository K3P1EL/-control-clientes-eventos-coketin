import { useState } from "react"
import { C } from "../lib/colors"
import { fmtDate } from "../lib/helpers"
import { inp, btn, DInput } from "./shared"
import { validatePhone, validateDNI } from "../lib/validation"

export default function Contactos({ contactos, user, adm, onAddContacto, onUpdateContacto, onDeleteContacto }) {
  const [search, setSearch] = useState("")
  const [view, setView] = useState(null)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDni, setNewDni] = useState("")
  const [newPhoneCreate, setNewPhoneCreate] = useState("")
  const [newPhone, setNewPhone] = useState("")

  const active = contactos.filter(c => !c.deleted_at)
  const filtered = search.trim()
    ? active.filter(c => {
        const q = search.toLowerCase()
        return (c.nombre||"").toLowerCase().includes(q)
          || (c.dni||"").includes(q)
          || (c.phones||[]).some(p => p.includes(q))
      })
    : active

  // Detail view
  if (view) {
    const c = contactos.find(x => x.id === view)
    if (!c) { if (contactos.length > 0) setView(null); return null }
    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <button onClick={()=>setView(null)} style={{ background:C.inputBg, border:`1px solid ${C.border}`, color:C.accent, borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>Volver
          </button>
          <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>{c.nombre||"Cliente"}</h2>
          {adm && <button onClick={()=>{if(window.confirm("¿Eliminar este cliente permanentemente?"))onDeleteContacto(c.id);setView(null)}} style={{ marginLeft:"auto", background:C.danger+"22", border:`1px solid ${C.danger}44`, borderRadius:8, color:C.danger, cursor:"pointer", padding:"6px 14px", fontSize:12, fontWeight:600 }}>Eliminar</button>}
        </div>

        <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:20, maxWidth:600 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.muted, marginBottom:4 }}>Nombre</label>
              <DInput value={c.nombre||""} onCommit={v=>onUpdateContacto(c.id,{nombre:v})} style={inp} placeholder="Nombre completo" />
            </div>
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.muted, marginBottom:4 }}>DNI</label>
              <DInput value={c.dni||""} onCommit={v=>onUpdateContacto(c.id,{dni:v})} style={inp} placeholder="Documento" maxLength={15} />
            </div>
          </div>

          <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.muted, marginBottom:4 }}>Celulares</label>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
            {(c.phones||[]).map((p,i) => (
              <span key={i} style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 12px", borderRadius:20, background:C.accent+"22", color:C.accent, fontSize:12, fontWeight:600 }}>
                {p}
                <button onClick={()=>{const ph=(c.phones||[]).filter((_,j)=>j!==i);onUpdateContacto(c.id,{phones:ph})}} style={{ background:"none", border:"none", color:C.accent, cursor:"pointer", fontSize:14, padding:0, lineHeight:1 }}>x</button>
              </span>
            ))}
            {!(c.phones||[]).length && <span style={{ fontSize:12, color:C.muted }}>Sin numeros</span>}
          </div>
          <div style={{ display:"flex", gap:6, marginBottom:16 }}>
            <input value={newPhone} onChange={e=>setNewPhone(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&newPhone.trim()){const ph=[...(c.phones||[])];if(!ph.includes(newPhone.trim())){ph.push(newPhone.trim());onUpdateContacto(c.id,{phones:ph})}setNewPhone("")}}} style={{ ...inp, marginBottom:0, flex:1 }} placeholder="Agregar numero y pulsa Enter" />
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.muted, marginBottom:4 }}>Direccion</label>
              <DInput value={c.direccion||""} onCommit={v=>onUpdateContacto(c.id,{direccion:v})} style={inp} placeholder="Direccion" />
            </div>
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.muted, marginBottom:4 }}>Referencia</label>
              <DInput value={c.referencia||""} onCommit={v=>onUpdateContacto(c.id,{referencia:v})} style={inp} placeholder="Cerca de..." />
            </div>
          </div>

          <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.muted, marginBottom:4 }}>Notas</label>
          <DInput tag="textarea" value={c.notas||""} onCommit={v=>onUpdateContacto(c.id,{notas:v})} style={{ ...inp, minHeight:60, resize:"vertical", fontFamily:"inherit" }} placeholder="Notas sobre el cliente..." />

          <div style={{ marginTop:16, fontSize:11, color:C.muted }}>
            Creado por {c.created_by_name||"—"} — {fmtDate(c.created_at)}
          </div>
        </div>
      </div>
    )
  }

  // List view
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>Clientes</h2>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <div style={{ position:"relative" }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre, DNI o celular..." style={{ ...inp, marginBottom:0, width:280, paddingLeft:34, fontSize:13 }} />
            <svg width="16" height="16" fill="none" stroke={C.muted} strokeWidth="2" style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }}><circle cx="7" cy="7" r="4.5"/><path d="M11 11l3 3"/></svg>
          </div>
          <button onClick={()=>setAdding(true)} style={btn}>+ Nuevo Cliente</button>
        </div>
      </div>

      {/* Quick add */}
      {adding && (
        <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.accent}44`, padding:16, marginBottom:16, display:"flex", gap:10, alignItems:"flex-end", flexWrap:"wrap" }}>
          <div style={{ flex:"2 1 220px", minWidth:180 }}>
            <label style={{ display:"block", fontSize:11, color:C.muted, marginBottom:4 }}>Nombre</label>
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nombre del cliente" style={{ ...inp, marginBottom:0 }} autoFocus />
          </div>
          <div style={{ flex:"1 1 140px", minWidth:120 }}>
            <label style={{ display:"block", fontSize:11, color:C.muted, marginBottom:4 }}>DNI</label>
            <input value={newDni} onChange={e=>setNewDni(e.target.value.replace(/\D/g,""))} placeholder="Documento" maxLength={15} style={{ ...inp, marginBottom:0 }} />
          </div>
          <div style={{ flex:"1 1 160px", minWidth:140 }}>
            <label style={{ display:"block", fontSize:11, color:C.muted, marginBottom:4 }}>Celular</label>
            <input value={newPhoneCreate} onChange={e=>setNewPhoneCreate(e.target.value)} placeholder="Numero" style={{ ...inp, marginBottom:0 }} />
          </div>
          <button onClick={async()=>{
            // Require at least one of: name, DNI, phone — so the user can
            // create a quick lead with only a phone number, only a DNI, etc.
            const hasAny = newName.trim() || newDni.trim() || newPhoneCreate.trim()
            if (!hasAny) { alert("Ingresa al menos nombre, DNI o celular"); return }
            let dniClean = ""
            if (newDni.trim()) {
              const v = validateDNI(newDni)
              if (!v.ok) { alert(v.error); return }
              dniClean = v.value
            }
            let phones = []
            if (newPhoneCreate.trim()) {
              const v = validatePhone(newPhoneCreate)
              if (!v.ok) { alert(v.error); return }
              phones = [v.value]
            }
            const nc = await onAddContacto({
              nombre: newName.trim(),
              dni: dniClean,
              phones,
              created_by: user.id,
              created_by_name: user.name,
            })
            setNewName(""); setNewDni(""); setNewPhoneCreate("")
            setAdding(false); setView(nc.id)
          }} style={{ ...btn, whiteSpace:"nowrap" }}>Crear</button>
          <button onClick={()=>{setAdding(false);setNewName("");setNewDni("");setNewPhoneCreate("")}} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, cursor:"pointer", padding:"10px 16px", fontSize:13 }}>Cancelar</button>
        </div>
      )}

      <div style={{ fontSize:13, color:C.muted, marginBottom:12 }}>{filtered.length} cliente{filtered.length!==1?"s":""}</div>

      {!filtered.length ? (
        <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:40, textAlign:"center", color:C.muted }}>
          {search ? "No se encontraron clientes." : "No hay clientes guardados. Crea uno o guarda desde una ficha."}
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:12 }}>
          {filtered.map(c => (
            <button key={c.id} onClick={()=>setView(c.id)} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"16px 18px", cursor:"pointer", textAlign:"left", transition:"all .15s" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent}
              onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
              <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:4 }}>{c.nombre||"Sin nombre"}</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:6 }}>
                {c.dni && <span style={{ fontSize:11, color:C.yellow, background:C.yellow+"18", padding:"1px 6px", borderRadius:4 }}>DNI: {c.dni}</span>}
                {(c.phones||[])[0] && <span style={{ fontSize:11, color:C.accent }}>{(c.phones||[])[0]}</span>}
              </div>
              <div style={{ fontSize:11, color:C.muted }}>{c.created_by_name||"—"} — {fmtDate(c.created_at)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
