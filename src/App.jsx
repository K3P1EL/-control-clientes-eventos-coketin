import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "./lib/supabase"
import { C } from "./lib/colors"
import { today } from "./lib/helpers"
import { CSS, Loader } from "./components/shared"

import { getSession } from "./services/auth"
import { getProfile, listProfiles, updateProfile } from "./services/profiles"
import { listRegistros, createRegistro, updateRegistro, listRegistroFotos, createRegistroFoto, deleteRegistro } from "./services/registros"
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
  const loginInProgress = useRef(false)
  const dataLoaded      = useRef(false)

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

  const goToClient  = useCallback((id)        => { setNavClientId(id); setTab("clientes") }, [])
  const goToReg     = useCallback((uid, date) => { setNavRegId(uid); setNavRegDate(date||null); setTab("registro") }, [])
  const goToAlmacen = useCallback((id)        => { setNavAlmClientId(id); setTab("almacen") }, [])

  // ── Load all data ─────────────────────────────────────────────────────────
  const safe = (promise, fallback) => {
    let timerId
    const timer = new Promise(resolve => { timerId = setTimeout(() => resolve(fallback), 5000) })
    return Promise.race([
      promise.then(r => { clearTimeout(timerId); return r }).catch(e => { clearTimeout(timerId); console.error("[data]", e.message); return fallback }),
      timer
    ])
  }

  const loadData = async () => {
    if (dataLoaded.current) return
    dataLoaded.current = true
    const [regData, fotosData, clientData, almData, invData, tagData, locData, ptData, profileData] = await Promise.all([
      safe(listRegistros(),            []),
      safe(listRegistroFotos(),        []),
      safe(listClients(),              []),
      safe(listAlmacen(),              []),
      safe(listInventario(),           []),
      safe(getConfig("estado_tags"),   null),
      safe(getConfig("locales"),       null),
      safe(getConfig("producto_tags"), null),
      safe(listProfiles(),             []),
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

  // handleLogin receives the full session.user object to avoid any extra network calls
  const handleLogin = async (sessionUser) => {
    if (loginInProgress.current) return
    loginInProgress.current = true
    try {
      const userId = sessionUser.id
      const userEmail = sessionUser.email ?? ""
      const userName = sessionUser.user_metadata?.name ?? userEmail.split("@")[0] ?? "Usuario"

      // Fetch profile via direct fetch with 3s timeout — avoids supabase client hanging
      let profile = null
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 3000)
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`, {
          signal: controller.signal,
          headers: {
            "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
        })
        clearTimeout(timer)
        const rows = await res.json()
        if (Array.isArray(rows) && rows.length > 0) profile = rows[0]
      } catch (fetchErr) {
        console.error("Profile fetch error:", fetchErr.message)
      }

      // Fallback: build profile from session data
      if (!profile) {
        profile = {
          id: userId,
          email: userEmail,
          name: userName,
          active: true,
          is_admin: userEmail === "k3p1elsor@gmail.com",
          permissions: ["registro","clientes","almacen","inventario","agenda","auditoria","dashboard"],
          client_visibility: "all",
        }
        supabase.from("profiles").upsert(profile).then(({ error }) => {
          if (error) console.error("Profile upsert error:", error.message)
        })
      }

      setUser(profile)
      setAuthState("logged_in")
      loadData()
    } catch (e) {
      console.error("handleLogin error:", e)
      loginInProgress.current = false
      setAuthState("logged_out")
    }
  }

  // ── Auth listener ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fallback = setTimeout(() => {
      setAuthState(prev => prev === "loading" ? "logged_out" : prev)
    }, 10000)

    getSession()
      .then(session => {
        if (session?.user) return handleLogin(session.user)
        else setAuthState("logged_out")
      })
      .catch(e => { console.error("getSession error:", e); setAuthState("logged_out") })
      .finally(() => clearTimeout(fallback))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await handleLogin(session.user)
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
  const onAddReg = useCallback(async (payload) => {
    const data = await createRegistro(payload)
    setRegs(prev => [...prev, data])
    return data
  }, [])
  const onUpdateReg = useCallback(async (id, patch) => {
    await updateRegistro(id, patch)
    setRegs(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }, [])
  const onUploadRegPhoto = useCallback(async (registroId, file) => {
    const url = await uploadFile("registros", file.name, file)
    await createRegistroFoto(registroId, url)
    await updateRegistro(registroId, { foto: "SI" })
    setPhotos(prev => ({ ...prev, [registroId]: url }))
    setRegs(prev => prev.map(r => r.id === registroId ? { ...r, foto: "SI" } : r))
  }, [])
  const onHardDeleteReg = useCallback(async (id) => {
    await deleteRegistro(id)
    setRegs(prev => prev.filter(r => r.id !== id))
  }, [])

  // ── CLIENT ops ────────────────────────────────────────────────────────────
  const onAddClient = useCallback(async (clientPayload, contratoPayload = {}) => {
    const data = await createClient({ ...clientPayload, reg_ids: clientPayload.reg_ids || [] })
    const ct   = await createContrato({ client_id: data.id, fecha: today(), tipo: "proforma", estado: "activo", total: 0, producto_interes: [], ...contratoPayload })
    const full = { ...data, contratos: [ct] }
    setClients(prev => [...prev, full])
    return full
  }, [])
  const onUpdateClient = useCallback(async (id, fieldOrPatch, val) => {
    const patch = typeof fieldOrPatch === "string" ? { [fieldOrPatch]: val } : fieldOrPatch
    await updateClient(id, patch)
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }, [])
  const onDeleteClient = useCallback(async (id) => {
    await deleteClient(id)
    setClients(prev => prev.filter(c => c.id !== id))
  }, [])
  const onUpdateContrato = useCallback(async (clientId, contratoId, patch) => {
    await updateContrato(contratoId, patch)
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c
      return { ...c, contratos: (c.contratos||[]).map(ct => ct.id === contratoId ? { ...ct, ...patch } : ct) }
    }))
  }, [])
  const onAddAdelanto = useCallback(async (clientId, contratoId, payload) => {
    const a = await createAdelanto({ contrato_id: contratoId, ...payload })
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c
      return { ...c, contratos: (c.contratos||[]).map(ct => ct.id === contratoId ? { ...ct, adelantos: [...(ct.adelantos||[]), a] } : ct) }
    }))
    return a
  }, [])
  const onUpdateAdelanto = useCallback(async (clientId, contratoId, adelantoId, patch) => {
    await updateAdelanto(adelantoId, patch)
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c
      return { ...c, contratos: (c.contratos||[]).map(ct => {
        if (ct.id !== contratoId) return ct
        return { ...ct, adelantos: (ct.adelantos||[]).map(a => a.id === adelantoId ? { ...a, ...patch } : a) }
      })}
    }))
  }, [])
  const onDeleteAdelanto = useCallback(async (clientId, contratoId, adelantoId) => {
    await deleteAdelanto(adelantoId)
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c
      return { ...c, contratos: (c.contratos||[]).map(ct => {
        if (ct.id !== contratoId) return ct
        return { ...ct, adelantos: (ct.adelantos||[]).filter(a => a.id !== adelantoId) }
      })}
    }))
  }, [])
  const onAddContratoArchivo = useCallback(async (clientId, contratoId, file) => {
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
  }, [])
  const onDeleteContratoArchivo = useCallback(async (clientId, contratoId, archivoId) => {
    await deleteContratoArchivo(archivoId)
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c
      return { ...c, contratos: (c.contratos||[]).map(ct => {
        if (ct.id !== contratoId) return ct
        return { ...ct, contrato_archivos: (ct.contrato_archivos||[]).filter(a => a.id !== archivoId) }
      })}
    }))
  }, [])
  const onMergeClients = useCallback(async (targetId, sourceId) => {
    setClients(prev => {
      const target = prev.find(c => c.id === targetId)
      const source = prev.find(c => c.id === sourceId)
      if (!target || !source) return prev
      const newRegIds = [...new Set([...(target.reg_ids||[]), ...(source.reg_ids||[])])]
      const newPhones = [...new Set([...(target.phones||[]), ...(source.phones||[])])]
      updateClient(targetId, { reg_ids: newRegIds, phones: newPhones })
      Promise.all((source.contratos||[]).map(ct => updateContrato(ct.id, { client_id: targetId })))
        .then(() => deleteClient(sourceId))
      return prev
        .map(c => c.id === targetId ? { ...c, reg_ids: newRegIds, phones: newPhones, contratos: [...(c.contratos||[]), ...(source.contratos||[])] } : c)
        .filter(c => c.id !== sourceId)
    })
  }, [])

  // ── ALMACEN ops ───────────────────────────────────────────────────────────
  const onAddSalida = useCallback(async (clientId, clientName, clientCode) => {
    const data = await createSalida({ client_id: clientId, client_name: clientName, client_code: clientCode, created_by: user.id, created_by_name: user.name, estado: "por_recoger", notas: "" })
    setAlmacen(prev => [...prev, data])
    return data
  }, [user])
  const onUpdateSalida = useCallback(async (id, patch) => {
    await updateSalida(id, patch)
    setAlmacen(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }, [])
  const onDeleteSalida = useCallback(async (id) => {
    await deleteSalida(id)
    setAlmacen(prev => prev.filter(s => s.id !== id))
  }, [])
  const onAddItem = useCallback(async (salidaId, payload) => {
    const item = await createItem({ salida_id: salidaId, ...payload })
    setAlmacen(prev => prev.map(s => s.id === salidaId ? { ...s, almacen_items: [...(s.almacen_items||[]), item] } : s))
    return item
  }, [])
  const onUpdateItem = useCallback(async (salidaId, itemId, patch) => {
    await updateItem(itemId, patch)
    setAlmacen(prev => prev.map(s => s.id === salidaId ? { ...s, almacen_items: (s.almacen_items||[]).map(it => it.id === itemId ? { ...it, ...patch } : it) } : s))
  }, [])
  const onDeleteItem = useCallback(async (salidaId, itemId) => {
    await deleteItem(itemId)
    setAlmacen(prev => prev.map(s => s.id === salidaId ? { ...s, almacen_items: (s.almacen_items||[]).filter(it => it.id !== itemId) } : s))
  }, [])
  const onAddAlmacenArchivo = useCallback(async (salidaId, file) => {
    const url = await uploadFile("almacen", file.name, file)
    const ar  = await createAlmacenArchivo({ salida_id: salidaId, nombre: file.name, tipo: file.type, url })
    setAlmacen(prev => prev.map(s => s.id === salidaId ? { ...s, almacen_archivos: [...(s.almacen_archivos||[]), ar] } : s))
  }, [])
  const onDeleteAlmacenArchivo = useCallback(async (salidaId, archivoId) => {
    await deleteAlmacenArchivo(archivoId)
    setAlmacen(prev => prev.map(s => s.id === salidaId ? { ...s, almacen_archivos: (s.almacen_archivos||[]).filter(a => a.id !== archivoId) } : s))
  }, [])

  // ── INVENTARIO ops ────────────────────────────────────────────────────────
  const onAddInventario    = useCallback(async (payload) => { const item = await createInventarioItem({ ...payload, created_by: user.name }); setInventario(prev=>[...prev,item]); return item }, [user])
  const onUpdateInventario = useCallback(async (id, patch) => { await updateInventarioItem(id, patch); setInventario(prev=>prev.map(i=>i.id===id?{...i,...patch}:i)) }, [])
  const onDeleteInventario = useCallback(async (id) => { await deleteInventarioItem(id); setInventario(prev=>prev.filter(i=>i.id!==id)) }, [])

  // ── CONFIG ops ────────────────────────────────────────────────────────────
  const onSetTags     = useCallback(async (v) => { await setConfig("estado_tags",   v); setTags(v) }, [])
  const onSetLocales  = useCallback(async (v) => { await setConfig("locales",       v); setLocales(v) }, [])
  const onSetProdTags = useCallback(async (v) => { await setConfig("producto_tags", v); setProdTags(v) }, [])

  // ── PROFILES ops ─────────────────────────────────────────────────────────
  const onUpdateProfile = useCallback(async (id, patch) => { await updateProfile(id, patch); setUsers(prev=>prev.map(u=>u.id===id?{...u,...patch}:u)) }, [])
  const onDeleteProfile = useCallback(async (id) => { await updateProfile(id, { active: false }); setUsers(prev=>prev.filter(u=>u.id!==id)) }, [])

  // ── Render ────────────────────────────────────────────────────────────────
  if (authState === "loading") return <Loader />
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
              onHardDeleteReg={onHardDeleteReg}
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
