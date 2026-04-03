import { useState, useEffect } from "react"
import { supabase } from "./lib/supabase"
import { C } from "./lib/colors"
import { today } from "./lib/helpers"
import { CSS, Loader } from "./components/shared"

import { getSession } from "./services/auth"
import { getProfile, listProfiles, updateProfile } from "./services/profiles"
import { listRegistros, createRegistro, updateRegistro, listRegistroFotos, createRegistroFoto } from "./services/registros"
import { listClients, createClient, updateClient, deleteClient } from "./services/clients"
import { createContrato, updateContrato, createAdelanto, updateAdelanto, deleteAdelanto, createContratoArchivo, deleteContratoArchivo } from "./services/contratos"
import { listAlmacen, createSalida, updateSalida, deleteSalida, createItem, updateItem, deleteItem, createAlmacenArchivo, deleteAlmacenArchivo } from "./services/almacen"
import { listInventario, createInventarioItem, updateInventarioItem, deleteInventarioItem } from "./services/inventario"
import { getConfig, setConfig } from "./services/config"
import { uploadFile } from "./services/storage"

import Login      from "./components/Login"
import Register   from "./components/Register"
import Pending    from "./components/Pending"
import Side       from "./components/Side"
import Head       from "./components/Head"
import Registro   from "./components/Registro"
import Clientes   from "./components/Clientes"
import Almacen    from "./components/Almacen"
import Inventario from "./components/Inventario"
import Agenda     from "./components/Agenda"
import Admin      from "./components/Admin"
import Audit      from "./components/Audit"
import Dash       from "./components/Dash"

export default function App() {
  // ── Auth state ────────────────────────────────────────────────────────────
  const [authState,  setAuthState]  = useState("loading")  // loading | logged_out | logged_in
  const [authView,   setAuthView]   = useState("login")
  const [user,       setUser]       = useState(null)
  const [dataReady,  setDataReady]  = useState(false)

  // ── App data ──────────────────────────────────────────────────────────────
  const [users,      setUsers]      = useState([])
  const [regs,       setRegs]       = useState([])
  const [photos,     setPhotos]     = useState({})
  const [clients,    setClients]    = useState([])
  const [almacen,    setAlmacen]    = useState([])
  const [inventario, setInventario] = useState([])
  const [tags,       setTags]       = useState([])
  const [locales,    setLocales]    = useState(["Local 1"])
  const [prodTags,   setProdTags]   = useState([])

  // ── Navigation ────────────────────────────────────────────────────────────
  const [tab,            setTab]            = useState("registro")
  const [mobSide,        setMobSide]        = useState(false)
  const [navClientId,    setNavClientId]    = useState(null)
  const [navRegId,       setNavRegId]       = useState(null)
  const [navRegDate,     setNavRegDate]     = useState(null)
  const [navAlmClientId, setNavAlmClientId] = useState(null)

  const goToClient  = (id)        => { setNavClientId(id); setTab("clientes") }
  const goToReg     = (uid, date) => { setNavRegId(uid); setNavRegDate(date||null); setTab("registro") }
  const goToAlmacen = (id)        => { setNavAlmClientId(id); setTab("almacen") }

  // ── Load all data ─────────────────────────────────────────────────────────
  const loadData = async () => {
    const [regData, fotosData, clientData, almData, invData, tagData, locData, ptData, profileData] = await Promise.all([
      listRegistros(),
      listRegistroFotos(),
      listClients(),
      listAlmacen(),
      listInventario(),
      getConfig("estado_tags"),
      getConfig("locales"),
      getConfig("producto_tags"),
      listProfiles(),
    ])
    setRegs(regData)
    const photosObj = {}
    fotosData.forEach(f => { photosObj[f.registro_id] = f.url })
    setPhotos(photosObj)
    setClients(clientData)
    setAlmacen(almData)
    setInventario(invData)
    setTags(tagData    ?? ["Desconocido","Cliente frío","Cotizó","Contrato","Re Consultó","Competencia","Conocido"])
    setLocales(locData ?? ["Local 1"])
    setProdTags(ptData ?? [])
    setUsers(profileData)
    setDataReady(true)
  }

  const handleLogin = async (userId) => {
    try {
      console.log("[auth] handleLogin start, userId:", userId)

      let profile = null
      try {
        profile = await getProfile(userId)
        console.log("[auth] profile loaded:", profile)
      } catch (profileErr) {
        console.error("[auth] getProfile error:", profileErr)
        // Profile may not exist yet (trigger didn't fire) — create it
        const { data: { user: authUser } } = await supabase.auth.getUser()
        const fallbackProfile = {
          id: userId,
          email: authUser?.email ?? "",
          name: authUser?.user_metadata?.name ?? authUser?.email ?? "Usuario",
          active: true,
          is_admin: false,
          permissions: [],
          client_visibility: "all",
        }
        const { data: created, error: createErr } = await supabase
          .from("profiles")
          .upsert(fallbackProfile)
          .select()
          .single()
        if (createErr) {
          console.error("[auth] profile create error:", createErr)
          setAuthState("logged_out")
          return
        }
        profile = created
        console.log("[auth] profile created as fallback:", profile)
      }

      setUser(profile)
      console.log("[auth] loading app data...")
      await loadData()
      console.log("[auth] data loaded, setting logged_in")
      setAuthState("logged_in")
    } catch (e) {
      console.error("[auth] handleLogin error:", e)
      setAuthState("logged_out")
    }
  }

  // ── Auth listener ─────────────────────────────────────────────────────────
  useEffect(() => {
    // Fallback: if session check or data load hangs, show login after 3s
    const fallback = setTimeout(() => {
      console.warn("[auth] timeout! authState still loading after 3s, forcing logged_out")
      setAuthState(prev => prev === "loading" ? "logged_out" : prev)
    }, 3000)

    console.log("[auth] checking session...")
    getSession()
      .then(session => {
        console.log("[auth] session result:", session)
        if (session?.user) return handleLogin(session.user.id)
        else setAuthState("logged_out")
      })
      .catch(e => { console.error("[auth] getSession error:", e); setAuthState("logged_out") })
      .finally(() => clearTimeout(fallback))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await handleLogin(session.user.id)
      } else if (event === "SIGNED_OUT") {
        setUser(null); setUsers([]); setRegs([]); setClients([])
        setAlmacen([]); setInventario([]); setPhotos({}); setDataReady(false)
        setAuthState("logged_out")
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const adm = user?.is_admin === true

  // ── REGISTRO ops ──────────────────────────────────────────────────────────
  const onAddReg = async (payload) => {
    const data = await createRegistro(payload)
    setRegs(prev => [...prev, data])
    return data
  }
  const onUpdateReg = async (id, patch) => {
    await updateRegistro(id, patch)
    setRegs(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }
  const onUploadRegPhoto = async (registroId, file) => {
    const url = await uploadFile("registros", file.name, file)
    await createRegistroFoto(registroId, url)
    await updateRegistro(registroId, { foto: "SI" })
    setPhotos(prev => ({ ...prev, [registroId]: url }))
    setRegs(prev => prev.map(r => r.id === registroId ? { ...r, foto: "SI" } : r))
  }

  // ── CLIENT ops ────────────────────────────────────────────────────────────
  const onAddClient = async (clientPayload, contratoPayload = {}) => {
    const data = await createClient({ ...clientPayload, reg_ids: clientPayload.reg_ids || [] })
    const ct   = await createContrato({ client_id: data.id, fecha: today(), tipo: "proforma", estado: "activo", total: 0, producto_interes: [], ...contratoPayload })
    const full = { ...data, contratos: [ct] }
    setClients(prev => [...prev, full])
    return full
  }
  const onUpdateClient = async (id, fieldOrPatch, val) => {
    const patch = typeof fieldOrPatch === "string" ? { [fieldOrPatch]: val } : fieldOrPatch
    await updateClient(id, patch)
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }
  const onDeleteClient = async (id) => {
    await deleteClient(id)
    setClients(prev => prev.filter(c => c.id !== id))
  }
  const onUpdateContrato = async (clientId, contratoId, patch) => {
    await updateContrato(contratoId, patch)
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c
      return { ...c, contratos: (c.contratos||[]).map(ct => ct.id === contratoId ? { ...ct, ...patch } : ct) }
    }))
  }
  const onAddAdelanto = async (clientId, contratoId, payload) => {
    const a = await createAdelanto({ contrato_id: contratoId, ...payload })
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c
      return { ...c, contratos: (c.contratos||[]).map(ct => ct.id === contratoId ? { ...ct, adelantos: [...(ct.adelantos||[]), a] } : ct) }
    }))
    return a
  }
  const onUpdateAdelanto = async (clientId, contratoId, adelantoId, patch) => {
    await updateAdelanto(adelantoId, patch)
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c
      return { ...c, contratos: (c.contratos||[]).map(ct => {
        if (ct.id !== contratoId) return ct
        return { ...ct, adelantos: (ct.adelantos||[]).map(a => a.id === adelantoId ? { ...a, ...patch } : a) }
      })}
    }))
  }
  const onDeleteAdelanto = async (clientId, contratoId, adelantoId) => {
    await deleteAdelanto(adelantoId)
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c
      return { ...c, contratos: (c.contratos||[]).map(ct => {
        if (ct.id !== contratoId) return ct
        return { ...ct, adelantos: (ct.adelantos||[]).filter(a => a.id !== adelantoId) }
      })}
    }))
  }
  const onAddContratoArchivo = async (clientId, contratoId, file) => {
    const url     = await uploadFile("contratos", file.name, file)
    const tipo    = file.type?.startsWith("image") ? "image" : "pdf"
    const archivo = await createContratoArchivo({ contrato_id: contratoId, nombre: file.name, tipo, url })
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c
      return { ...c, contratos: (c.contratos||[]).map(ct => {
        if (ct.id !== contratoId) return ct
        return { ...ct, contrato_archivos: [...(ct.contrato_archivos||[]), archivo] }
      })}
    }))
  }
  const onDeleteContratoArchivo = async (clientId, contratoId, archivoId) => {
    await deleteContratoArchivo(archivoId)
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c
      return { ...c, contratos: (c.contratos||[]).map(ct => {
        if (ct.id !== contratoId) return ct
        return { ...ct, contrato_archivos: (ct.contrato_archivos||[]).filter(a => a.id !== archivoId) }
      })}
    }))
  }
  const onMergeClients = async (targetId, sourceId) => {
    const target = clients.find(c => c.id === targetId)
    const source = clients.find(c => c.id === sourceId)
    if (!target || !source) return
    const newRegIds = [...new Set([...(target.reg_ids||[]), ...(source.reg_ids||[])])]
    const newPhones = [...new Set([...(target.phones||[]), ...(source.phones||[])])]
    await updateClient(targetId, { reg_ids: newRegIds, phones: newPhones })
    for (const ct of (source.contratos||[])) { await updateContrato(ct.id, { client_id: targetId }) }
    await deleteClient(sourceId)
    setClients(prev => prev
      .map(c => c.id === targetId ? { ...c, reg_ids: newRegIds, phones: newPhones, contratos: [...(c.contratos||[]), ...(source.contratos||[])] } : c)
      .filter(c => c.id !== sourceId)
    )
  }

  // ── ALMACEN ops ───────────────────────────────────────────────────────────
  const onAddSalida = async (clientId, clientName, clientCode) => {
    const data = await createSalida({ client_id: clientId, client_name: clientName, client_code: clientCode, created_by: user.id, created_by_name: user.name, estado: "por_recoger", notas: "" })
    setAlmacen(prev => [...prev, data])
    return data
  }
  const onUpdateSalida = async (id, patch) => {
    await updateSalida(id, patch)
    setAlmacen(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }
  const onDeleteSalida = async (id) => {
    await deleteSalida(id)
    setAlmacen(prev => prev.filter(s => s.id !== id))
  }
  const onAddItem = async (salidaId, payload) => {
    const item = await createItem({ salida_id: salidaId, ...payload })
    setAlmacen(prev => prev.map(s => s.id === salidaId ? { ...s, almacen_items: [...(s.almacen_items||[]), item] } : s))
    return item
  }
  const onUpdateItem = async (salidaId, itemId, patch) => {
    await updateItem(itemId, patch)
    setAlmacen(prev => prev.map(s => s.id === salidaId ? { ...s, almacen_items: (s.almacen_items||[]).map(it => it.id === itemId ? { ...it, ...patch } : it) } : s))
  }
  const onDeleteItem = async (salidaId, itemId) => {
    await deleteItem(itemId)
    setAlmacen(prev => prev.map(s => s.id === salidaId ? { ...s, almacen_items: (s.almacen_items||[]).filter(it => it.id !== itemId) } : s))
  }
  const onAddAlmacenArchivo = async (salidaId, file) => {
    const url = await uploadFile("almacen", file.name, file)
    const ar  = await createAlmacenArchivo({ salida_id: salidaId, nombre: file.name, tipo: file.type, url })
    setAlmacen(prev => prev.map(s => s.id === salidaId ? { ...s, almacen_archivos: [...(s.almacen_archivos||[]), ar] } : s))
  }
  const onDeleteAlmacenArchivo = async (salidaId, archivoId) => {
    await deleteAlmacenArchivo(archivoId)
    setAlmacen(prev => prev.map(s => s.id === salidaId ? { ...s, almacen_archivos: (s.almacen_archivos||[]).filter(a => a.id !== archivoId) } : s))
  }

  // ── INVENTARIO ops ────────────────────────────────────────────────────────
  const onAddInventario     = async (payload) => { const item = await createInventarioItem({ ...payload, created_by: user.name }); setInventario(prev=>[...prev,item]); return item }
  const onUpdateInventario  = async (id, patch) => { await updateInventarioItem(id, patch); setInventario(prev=>prev.map(i=>i.id===id?{...i,...patch}:i)) }
  const onDeleteInventario  = async (id) => { await deleteInventarioItem(id); setInventario(prev=>prev.filter(i=>i.id!==id)) }

  // ── CONFIG ops ────────────────────────────────────────────────────────────
  const onSetTags     = async (v) => { await setConfig("estado_tags",   v); setTags(v) }
  const onSetLocales  = async (v) => { await setConfig("locales",       v); setLocales(v) }
  const onSetProdTags = async (v) => { await setConfig("producto_tags", v); setProdTags(v) }

  // ── PROFILES ops ─────────────────────────────────────────────────────────
  const onUpdateProfile = async (id, patch) => { await updateProfile(id, patch); setUsers(prev=>prev.map(u=>u.id===id?{...u,...patch}:u)) }
  const onDeleteProfile = async (id) => { await updateProfile(id, { active: false }); setUsers(prev=>prev.filter(u=>u.id!==id)) }

  // ── Render ────────────────────────────────────────────────────────────────
  if (authState === "loading" || (authState === "logged_in" && !dataReady)) return <Loader />
  if (authState === "logged_out") {
    return authView === "login"
      ? <Login go={() => setAuthView("register")} />
      : <Register go={() => setAuthView("login")} />
  }
  if (!user?.active && !adm) return <Pending />

  const changeTab = (t) => { setTab(t); setMobSide(false); setNavClientId(null); setNavRegId(null); setNavRegDate(null) }

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <style>{CSS}</style>
      {mobSide && <div onClick={()=>setMobSide(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:40 }} />}
      <Side tab={tab} set={changeTab} adm={adm} open={mobSide} perms={user?.permissions||[]} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        <Head user={user} menu={()=>setMobSide(true)} />
        <main style={{ flex:1, padding:24, overflow:"auto" }}>
          {tab==="registro" && (
            <Registro
              regs={regs} user={user} adm={adm} tags={tags} photos={photos}
              clients={clients} locales={locales} users={users}
              navRegId={navRegId} navRegDate={navRegDate}
              clearNavReg={()=>{setNavRegId(null);setNavRegDate(null)}}
              onAddReg={onAddReg} onUpdateReg={onUpdateReg} onUploadRegPhoto={onUploadRegPhoto}
              onAddClient={onAddClient} goToClient={goToClient}
            />
          )}
          {tab==="clientes" && (
            <Clientes
              clients={clients} user={user} adm={adm} regs={regs} users={users} prodTags={prodTags}
              navClientId={navClientId} clearNavClient={()=>setNavClientId(null)}
              goToReg={goToReg} goToAlmacen={goToAlmacen}
              onAddClient={onAddClient} onUpdateClient={onUpdateClient} onDeleteClient={onDeleteClient}
              onAddContrato={async(cid,p)=>{const ct=await createContrato({client_id:cid,...p});setClients(prev=>prev.map(c=>c.id===cid?{...c,contratos:[...(c.contratos||[]),ct]}:c));return ct}}
              onUpdateContrato={onUpdateContrato}
              onAddAdelanto={onAddAdelanto} onUpdateAdelanto={onUpdateAdelanto} onDeleteAdelanto={onDeleteAdelanto}
              onAddContratoArchivo={onAddContratoArchivo} onDeleteContratoArchivo={onDeleteContratoArchivo}
              onMergeClients={onMergeClients}
            />
          )}
          {tab==="almacen" && (
            <Almacen
              almacen={almacen} clients={clients} user={user} adm={adm}
              navClientId={navAlmClientId} clearNav={()=>setNavAlmClientId(null)}
              goToClient={goToClient}
              onAddSalida={onAddSalida} onUpdateSalida={onUpdateSalida} onDeleteSalida={onDeleteSalida}
              onAddItem={onAddItem} onUpdateItem={onUpdateItem} onDeleteItem={onDeleteItem}
              onAddAlmacenArchivo={onAddAlmacenArchivo} onDeleteAlmacenArchivo={onDeleteAlmacenArchivo}
            />
          )}
          {tab==="inventario" && (
            <Inventario
              inventario={inventario} user={user} adm={adm}
              onAddInventario={onAddInventario} onUpdateInventario={onUpdateInventario} onDeleteInventario={onDeleteInventario}
            />
          )}
          {tab==="agenda"    && <Agenda clients={clients} user={user} adm={adm} goToClient={goToClient} />}
          {tab==="auditoria" && <Audit regs={regs} photos={photos} />}
          {tab==="dashboard" && <Dash regs={regs} />}
          {tab==="admin" && adm && (
            <Admin
              users={users} tags={tags} locales={locales} prodTags={prodTags}
              onSetTags={onSetTags} onSetLocales={onSetLocales} onSetProdTags={onSetProdTags}
              onUpdateProfile={onUpdateProfile} onDeleteProfile={onDeleteProfile}
            />
          )}
        </main>
      </div>
    </div>
  )
}
