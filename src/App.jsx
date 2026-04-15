import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react"
import { supabase } from "./lib/supabase"
import { C } from "./lib/colors"
import { today } from "./lib/helpers"
import { getStr, setStr, remove as removeLS } from "./lib/storage"
import { logError } from "./lib/logger"
import { CSS, Loader, ToastContainer } from "./components/shared"

import { getSession } from "./services/auth"
import { listProfiles, updateProfile } from "./services/profiles"
import { listRegistros, createRegistro, updateRegistro, listRegistroFotos, createRegistroFoto, deleteRegistro } from "./services/registros"
import { listClients, createClient, updateClient, deleteClient } from "./services/clients"
import { createContrato, updateContrato, createAdelanto, updateAdelanto, deleteAdelanto, createContratoArchivo, deleteContratoArchivo } from "./services/contratos"
import { listAlmacen, createSalida, updateSalida, deleteSalida, createItem, updateItem, deleteItem, createAlmacenArchivo, deleteAlmacenArchivo, createArchivoRecojo, deleteArchivoRecojo } from "./services/almacen"
import { listInventario, createInventarioItem, updateInventarioItem, deleteInventarioItem } from "./services/inventario"
import { getConfig, setConfig } from "./services/config"
import { uploadFile, deleteFileByUrl } from "./services/storage"
import { listContactos, createContacto, updateContacto, deleteContacto } from "./services/contactos"

import Login      from "./components/Login"
import Register   from "./components/Register"
import Pending    from "./components/Pending"
import Side       from "./components/Side"
import Head       from "./components/Head"

// Lazy load tab components — only loaded when user navigates to them.
// We capture the import promises so we can warm-prefetch the heaviest tabs
// (Registro/Clientes) right after the app boots — that way the chunk is
// already in memory by the time the user clicks "+ Ficha" or switches tabs.
const importRegistro = () => import("./components/Registro")
const importClientes = () => import("./components/Clientes")
const Registro   = lazy(importRegistro)
const Clientes   = lazy(importClientes)
const Contactos  = lazy(() => import("./components/Contactos"))
const Almacen    = lazy(() => import("./components/Almacen"))
const Papelera   = lazy(() => import("./components/Papelera"))
const Inventario = lazy(() => import("./components/Inventario"))
const Agenda     = lazy(() => import("./components/Agenda"))
const Admin      = lazy(() => import("./components/Admin"))
const Audit      = lazy(() => import("./components/Audit"))
const Dash       = lazy(() => import("./components/Dash"))
const Finanzas   = lazy(() => import("./components/Finanzas"))

export default function App() {
  // ── Auth state ────────────────────────────────────────────────────────────
  const [authState,  setAuthState]  = useState("loading")  // loading | logged_out | logged_in
  const [authView,   setAuthView]   = useState("login")
  const [user,       setUser]       = useState(null)
  const [dataReady,  setDataReady]  = useState(false)
  const loginInProgress = useRef(false)
  const dataLoaded      = useRef(false)
  const [uploadCount, setUploadCount] = useState(0)
  const uploadStart = useCallback(() => setUploadCount(c => c + 1), [])
  const uploadEnd   = useCallback(() => setUploadCount(c => Math.max(0, c - 1)), [])

  // Warn before closing tab/browser while uploads are in progress
  useEffect(() => {
    const handler = (e) => { if (uploadCount > 0) { e.preventDefault(); e.returnValue = "" } }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [uploadCount])

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
  const [contactos,  setContactos]  = useState([])
  const [uploadCfg,  setUploadCfg]  = useState({ maxMB: 45, quality: 0.85, allowedTypes: ['image/jpeg','image/png','application/pdf','video/mp4','video/quicktime'] })
  const uploadCfgRef = useRef(uploadCfg)
  const [visionKey,  setVisionKey]  = useState("")
  const [trashDays,  setTrashDays]  = useState(10)
  uploadCfgRef.current = uploadCfg

  // ── URL routing ────────────────────────────────────────────────────────
  const [pendingAlmLink, setPendingAlmLink] = useState(() => {
    const m = window.location.pathname.match(/^\/almacen\/(FIC-[A-Z0-9]+)$/i)
    if (m) { window.history.replaceState({}, "", "/"); return m[1].toUpperCase() }
    return null
  })
  const [pendingVerLink, setPendingVerLink] = useState(() => {
    const m = window.location.pathname.match(/^\/ver\/(FIC-[A-Z0-9]+)$/i)
    if (m) { window.history.replaceState({}, "", "/"); return m[1].toUpperCase() }
    return null
  })

  // ── Navigation ────────────────────────────────────────────────────────────
  const [tab,            setTab_]           = useState(() => getStr("app_tab", "registro"))
  const setTab = useCallback((t) => { setTab_(t); setStr("app_tab", t) }, [])
  const [mobSide,        setMobSide]        = useState(false)
  const [navClientId,    setNavClientId]    = useState(null)
  const [navRegId,       setNavRegId]       = useState(null)
  const [navRegDate,     setNavRegDate]     = useState(null)
  const [navAlmClientId, setNavAlmClientId] = useState(null)

  const goToClient  = useCallback((id)        => { setStr("return_tab", getStr("app_tab", "")); setNavClientId(id); setTab("fichas") }, [])
  const goToReg     = useCallback((uid, date) => { setStr("return_tab", getStr("app_tab", "")); setNavRegId(uid); setNavRegDate(date||null); setTab("registro") }, [])
  const goToAlmacen = useCallback((id)        => { setStr("return_tab", getStr("app_tab", "")); setNavAlmClientId(id); setTab("almacen") }, [])

  // ── Load all data ─────────────────────────────────────────────────────────
  const safe = (promise, fallback) => {
    let timerId
    const timer = new Promise(resolve => { timerId = setTimeout(() => resolve(fallback), 5000) })
    return Promise.race([
      promise.then(r => { clearTimeout(timerId); return r }).catch(e => { clearTimeout(timerId); logError("data", e); return fallback }),
      timer
    ])
  }

  const loadData = async () => {
    if (dataLoaded.current) return
    dataLoaded.current = true
    const [regData, fotosData, clientData, almData, invData, contData, tagData, locData, ptData, profileData, upCfg, gvKey, tDays] = await Promise.all([
      safe(listRegistros(),            []),
      safe(listRegistroFotos(),        []),
      safe(listClients(),              []),
      safe(listAlmacen(),              []),
      safe(listInventario(),           []),
      safe(listContactos(),            []),
      safe(getConfig("estado_tags"),   null),
      safe(getConfig("locales"),       null),
      safe(getConfig("producto_tags"), null),
      safe(listProfiles(),             []),
      safe(getConfig("upload_config"), null),
      safe(getConfig("google_vision_key"), null),
      safe(getConfig("trash_days"), null),
    ])
    setRegs(regData)
    const photosObj = {}
    fotosData.forEach(f => {
      if (!photosObj[f.registro_id]) photosObj[f.registro_id] = []
      photosObj[f.registro_id].push(f.url)
    })
    setPhotos(photosObj)
    setClients(clientData)
    setAlmacen(almData)
    setInventario(invData)
    setContactos(contData)
    setTags(tagData    ?? ["Desconocido","Cliente frío","Cotizó","Contrato","Re Consultó","Competencia","Conocido"])
    setLocales(locData ?? ["Local 1"])
    setProdTags(ptData ?? [])
    setUsers(profileData)
    if (upCfg) setUploadCfg(upCfg)
    if (gvKey) setVisionKey(gvKey)
    if (tDays) setTrashDays(tDays)
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

      // Start loading data immediately — don't wait for profile
      loadData()

      // Warm-prefetch the heaviest lazy chunks so navigating to Registro
      // or clicking "+ Ficha" doesn't have to wait on a chunk download.
      importRegistro().catch(() => {})
      importClientes().catch(() => {})

      // Fetch profile — try Supabase client first, fast timeout to avoid hanging
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
        logError("Profile fetch", fetchErr)
      }

      // Fallback: build profile from session data if not in DB yet
      if (!profile) {
        profile = {
          id: userId,
          email: userEmail,
          name: userName,
          active: true,
          is_admin: userEmail === "k3p1elsor@gmail.com",
          permissions: ["registro","clientes","almacen","inventario","agenda","auditoria","dashboard"],
          client_visibility: "all",
          view_mode: "completo",
        }
        supabase.from("profiles").upsert(profile).then(({ error }) => {
          if (error) logError("Profile upsert", error)
        })
      }

      setUser(profile)
      setAuthState("logged_in")
    } catch (e) {
      logError("handleLogin", e)
      setAuthState("logged_out")
    } finally {
      loginInProgress.current = false
    }
  }

  // ── Auth listener ─────────────────────────────────────────────────────────
  const handleLoginRef = useRef(handleLogin)
  handleLoginRef.current = handleLogin

  useEffect(() => {
    const fallback = setTimeout(() => {
      setAuthState(prev => prev === "loading" ? "logged_out" : prev)
    }, 10000)

    getSession()
      .then(session => {
        if (session?.user) return handleLoginRef.current(session.user)
        else setAuthState("logged_out")
      })
      .catch(e => { logError("getSession", e); setAuthState("logged_out") })
      .finally(() => clearTimeout(fallback))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await handleLoginRef.current(session.user)
      } else if (event === "SIGNED_OUT") {
        setUser(null); setUsers([]); setRegs([]); setClients([])
        setAlmacen([]); setInventario([]); setPhotos({}); setDataReady(false)
        setAuthState("logged_out")
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const adm = user?.is_admin === true

  // ── Process /almacen/FIC-XXXXX link ────────────────────────────────────
  useEffect(() => {
    if (!pendingAlmLink || !dataReady || !user) return
    const hasAlmPerm = user.is_admin || (user.permissions||[]).includes("almacen")
    if (!hasAlmPerm) {
      alert("No tienes permisos para acceder al almacen")
      setPendingAlmLink(null)
      return
    }
    const client = clients.find(c => c.code === pendingAlmLink && !c.deleted_at)
    if (!client) {
      alert("Ficha no encontrada: " + pendingAlmLink)
      setPendingAlmLink(null)
      return
    }
    // Check if salida already exists
    const existing = almacen.find(s => s.client_id === client.id && s.estado !== "devuelto")
    if (existing) {
      setTab("almacen")
      setNavAlmClientId(client.id)
    } else {
      createSalida({ client_id: client.id, client_name: client.nombre||"", client_code: client.code||"", created_by: user.id, created_by_name: user.name, estado: "por_recoger", notas: "" })
        .then(data => {
          setAlmacen(prev => [...prev, data])
          setTab("almacen")
          setNavAlmClientId(client.id)
        })
        .catch(e => alert("Error creando salida: " + e.message))
    }
    setPendingAlmLink(null)
  }, [pendingAlmLink, dataReady, user, clients, almacen])

  // ── Process /ver/FIC-XXXXX link (any logged-in user)
  useEffect(() => {
    if (!pendingVerLink || !dataReady || !user) return
    const client = clients.find(c => c.code === pendingVerLink && !c.deleted_at)
    if (!client) { alert("Ficha no encontrada: " + pendingVerLink); setPendingVerLink(null); return }
    const existing = almacen.find(s => s.client_id === client.id && !s.deleted_at && s.estado !== "devuelto")
    if (existing) {
      setTab("almacen")
      setNavAlmClientId(client.id)
    } else {
      alert("No hay salida de almacen para " + pendingVerLink)
    }
    setPendingVerLink(null)
  }, [pendingVerLink, dataReady, user, clients, almacen])

  // ── REGISTRO ops ──────────────────────────────────────────────────────────
  const onAddReg = useCallback(async (payload) => {
    // Optimistic: show row immediately with temp id
    const tempId = `temp_${Date.now()}`
    const optimistic = { ...payload, id: tempId, created_at: new Date().toISOString() }
    setRegs(prev => [...prev, optimistic])
    try {
      const data = await createRegistro(payload)
      setRegs(prev => prev.map(r => r.id === tempId ? data : r))
      return data
    } catch (e) {
      setRegs(prev => prev.filter(r => r.id !== tempId))
      throw e
    }
  }, [])
  const onUpdateReg = useCallback(async (id, patch) => {
    setRegs(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
    updateRegistro(id, patch).catch(e => { logError("updateRegistro", e); alert("Error guardando registro") })
    // Sync: changing estado to Proforma/Contrato updates ficha's contrato tipo
    if (patch.estado === "Proforma" || patch.estado === "Contrato") {
      const tipo = patch.estado === "Contrato" ? "contrato" : "proforma"
      const client = clients.find(c => !c.deleted_at && (c.reg_ids||[]).includes(id))
      if (client) {
        const lastCt = (client.contratos||[]).slice(-1)[0]
        if (lastCt && lastCt.tipo !== tipo) {
          setClients(prev => prev.map(c => {
            if (c.id !== client.id) return c
            return { ...c, contratos: (c.contratos||[]).map(ct => ct.id === lastCt.id ? { ...ct, tipo } : ct) }
          }))
          updateContrato(lastCt.id, { tipo }).catch(() => {})
        }
      }
    }
  }, [clients])
  const onUploadRegPhoto = useCallback(async (registroId, file) => {
    const localUrl = URL.createObjectURL(file)
    setPhotos(prev => ({ ...prev, [registroId]: localUrl }))
    setRegs(prev => prev.map(r => r.id === registroId ? { ...r, foto: "SI" } : r))
    uploadStart()
    try {
      const url = await uploadFile("registros", file.name, file, uploadCfgRef.current)
      await createRegistroFoto(registroId, url)
      await updateRegistro(registroId, { foto: "SI" })
      setPhotos(prev => ({ ...prev, [registroId]: url }))
      URL.revokeObjectURL(localUrl)
    } catch (e) {
      setPhotos(prev => { const p = { ...prev }; delete p[registroId]; return p })
      setRegs(prev => prev.map(r => r.id === registroId ? { ...r, foto: "" } : r))
      URL.revokeObjectURL(localUrl)
      throw e
    } finally { uploadEnd() }
  }, [])
  const onHardDeleteReg = useCallback(async (id) => {
    setRegs(prev => prev.filter(r => r.id !== id))
    deleteRegistro(id).catch(e => { logError("deleteRegistro", e); alert("Error eliminando registro") })
  }, [])

  // ── CLIENT ops ────────────────────────────────────────────────────────────
  // Returns the new client immediately (with empty contratos[] for fast UI),
  // PLUS a `contratoPromise` callers can await when they need the contrato
  // id — e.g. uploading files right after creating the client.
  const onAddClient = useCallback(async (clientPayload, contratoPayload = {}) => {
    // Step 1: create the client and add it to state IMMEDIATELY so the UI can
    // navigate to the new ficha without waiting on the second round-trip.
    const data = await createClient({ ...clientPayload, reg_ids: clientPayload.reg_ids || [] })
    setClients(prev => [...prev, { ...data, contratos: [] }])

    // Step 2: create the default contrato. Kept as a promise so callers
    // that need the id (file upload) can await it; callers that don't
    // (the "+ Ficha" navigate-and-go path) just ignore it.
    const contratoPromise = createContrato({ client_id: data.id, fecha: today(), tipo: "proforma", estado: "activo", total: 0, producto_interes: [], ...contratoPayload })
      .then(ct => {
        setClients(prev => prev.map(c => c.id === data.id ? { ...c, contratos: [...(c.contratos || []), ct] } : c))
        return ct
      })
      .catch(e => { logError("createContrato", e); alert("Error creando contrato inicial"); throw e })

    return { ...data, contratos: [], contratoPromise }
  }, [])
  const onUpdateClient = useCallback(async (id, fieldOrPatch, val) => {
    const patch = typeof fieldOrPatch === "string" ? { [fieldOrPatch]: val } : fieldOrPatch
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
    updateClient(id, patch).catch(e => { logError("updateClient", e); alert("Error guardando cliente") })
    // When marking as erronea, clear Proforma/Contrato estado from linked registros
    if (patch.erronea === true) {
      const client = clients.find(c => c.id === id)
      ;(client?.reg_ids || []).forEach(rid => {
        const reg = regs.find(r => r.id === rid)
        if (reg && (reg.estado === "Proforma" || reg.estado === "Contrato")) {
          setRegs(prev => prev.map(r => r.id === rid ? { ...r, estado: "" } : r))
          updateRegistro(rid, { estado: "" }).catch(() => {})
        }
      })
    }
    // When removing erronea, restore estado from ficha's contrato tipo
    if (patch.erronea === false) {
      const client = clients.find(c => c.id === id)
      const lastCt = (client?.contratos || []).slice(-1)[0]
      if (lastCt?.tipo) {
        const estado = lastCt.tipo === "contrato" ? "Contrato" : "Proforma"
        ;(client?.reg_ids || []).forEach(rid => {
          setRegs(prev => prev.map(r => r.id === rid ? { ...r, estado } : r))
          updateRegistro(rid, { estado }).catch(() => {})
        })
      }
    }
  }, [clients, regs])
  const onDeleteClient = useCallback(async (id) => {
    const ts = new Date().toISOString()
    // Find linked registros BEFORE updating state so we can clear their
    // Proforma/Contrato estado — otherwise they keep showing a green
    // "Contrato" badge pointing to a ficha that no longer exists.
    const client = clients.find(c => c.id === id)
    const linkedRegIds = client?.reg_ids || []

    setClients(prev => prev.map(c => c.id === id ? { ...c, deleted_at: ts } : c))
    // Also soft-delete linked almacen salidas
    setAlmacen(prev => prev.map(s => s.client_id === id ? { ...s, deleted_at: ts } : s))
    // Clear Proforma/Contrato from linked registros so they don't show
    // a badge pointing to a deleted ficha.
    linkedRegIds.forEach(rid => {
      const reg = regs.find(r => r.id === rid)
      if (reg && (reg.estado === "Proforma" || reg.estado === "Contrato")) {
        setRegs(prev => prev.map(r => r.id === rid ? { ...r, estado: "" } : r))
        updateRegistro(rid, { estado: "" }).catch(() => {})
      }
    })

    updateClient(id, { deleted_at: ts }).catch(e => {
      setClients(prev => prev.map(c => c.id === id ? { ...c, deleted_at: null } : c))
      setAlmacen(prev => prev.map(s => s.client_id === id ? { ...s, deleted_at: null } : s))
      logError("deleteClient", e); alert("Error eliminando")
    })
    // Update almacen salidas in DB
    almacen.filter(s => s.client_id === id && !s.deleted_at).forEach(s => {
      updateSalida(s.id, { deleted_at: ts }).catch(() => {})
    })
  }, [almacen, clients, regs])
  const onRestoreClient = useCallback(async (id) => {
    // Warn if this client had almacen salidas so the user knows to
    // double-check equipment status after restoration.
    const hadAlmacen = almacen.some(s => s.client_id === id)
    if (hadAlmacen) {
      if (!window.confirm("Esta ficha tiene salidas de almacén. Verificá el estado de los equipos después de restaurar.\n\n¿Continuar?")) return
    }
    setClients(prev => prev.map(c => c.id === id ? { ...c, deleted_at: null } : c))
    // Also restore linked almacen salidas
    setAlmacen(prev => prev.map(s => s.client_id === id && s.deleted_at ? { ...s, deleted_at: null } : s))
    updateClient(id, { deleted_at: null }).catch(e => {
      setClients(prev => prev.map(c => c.id === id ? { ...c, deleted_at: new Date().toISOString() } : c))
      logError("restoreClient", e); alert("Error restaurando")
    })
    // Restore almacen salidas in DB
    almacen.filter(s => s.client_id === id && s.deleted_at).forEach(s => {
      updateSalida(s.id, { deleted_at: null }).catch(() => {})
    })
  }, [almacen])
  const onPermanentDeleteClient = useCallback(async (id) => {
    const backup = []
    setClients(prev => { backup.push(...prev.filter(c => c.id === id)); return prev.filter(c => c.id !== id) })
    // Collect all storage file URLs from contratos and almacen
    const client = backup[0]
    const fileUrls = []
    if (client) {
      ;(client.contratos || []).forEach(ct => {
        ;(ct.contrato_archivos || []).forEach(a => { if (a.url) fileUrls.push(a.url) })
      })
    }
    const clientAlmacen = almacen.filter(s => s.client_id === id)
    clientAlmacen.forEach(s => {
      ;(s.almacen_archivos || []).forEach(a => { if (a.url) fileUrls.push(a.url) })
      ;(s.almacen_archivos_recojo || []).forEach(a => { if (a.url) fileUrls.push(a.url) })
    })
    // Also remove almacen from state
    setAlmacen(prev => prev.filter(s => s.client_id !== id))
    // Delete DB record FIRST — only then clean up storage. If the DB
    // delete fails, the files survive and the user can retry. If we
    // deleted files first and the DB failed, the files would be lost
    // with no way to recover them.
    try {
      await deleteClient(id)
      // DB succeeded — now clean up storage in background (best-effort).
      fileUrls.forEach(url => deleteFileByUrl(url))
    } catch (e) {
      if (backup.length) setClients(prev => [...prev, ...backup])
      logError("permanentDeleteClient", e); alert("Error eliminando")
    }
  }, [almacen])
  const onAddContrato = useCallback(async (clientId, payload) => {
    const tempId = `temp_${Date.now()}`
    const optimistic = { id: tempId, client_id: clientId, ...payload, adelantos: [], contrato_archivos: [], created_at: new Date().toISOString() }
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, contratos: [...(c.contratos||[]), optimistic] } : c))
    try {
      const ct = await createContrato({ client_id: clientId, ...payload })
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, contratos: (c.contratos||[]).map(x => x.id === tempId ? { ...ct, adelantos: [], contrato_archivos: [] } : x) } : c))
      return ct
    } catch (e) {
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, contratos: (c.contratos||[]).filter(x => x.id !== tempId) } : c))
      alert("Error creando contrato"); throw e
    }
  }, [])
  const onUpdateContrato = useCallback(async (clientId, contratoId, patch) => {
    // When the type changes (Proforma↔Contrato), stamp who did it and when
    // so there's an audit trail if someone asks "who changed this?".
    if (patch.tipo) {
      patch.tipo_changed_by = user?.name || "?"
      patch.tipo_changed_at = new Date().toISOString()
    }
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c
      return { ...c, contratos: (c.contratos||[]).map(ct => ct.id === contratoId ? { ...ct, ...patch } : ct) }
    }))
    updateContrato(contratoId, patch).catch(e => { logError("updateContrato", e); alert("Error guardando contrato") })
    // Auto-update linked registro estado when tipo changes
    if (patch.tipo) {
      const client = clients.find(c => c.id === clientId)
      const estado = patch.tipo === "contrato" ? "Contrato" : "Proforma"
      ;(client?.reg_ids || []).forEach(rid => {
        setRegs(prev => prev.map(r => r.id === rid ? { ...r, estado } : r))
        updateRegistro(rid, { estado }).catch(() => {})
      })
    }
  }, [clients])
  const onAddAdelanto = useCallback(async (clientId, contratoId, payload) => {
    const tempId = `temp_${Date.now()}`
    const optimistic = { id: tempId, contrato_id: contratoId, ...payload, created_at: new Date().toISOString() }
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c
      return { ...c, contratos: (c.contratos||[]).map(ct => ct.id === contratoId ? { ...ct, adelantos: [...(ct.adelantos||[]), optimistic] } : ct) }
    }))
    try {
      const a = await createAdelanto({ contrato_id: contratoId, ...payload })
      setClients(prev => prev.map(c => {
        if (c.id !== clientId) return c
        return { ...c, contratos: (c.contratos||[]).map(ct => ct.id === contratoId ? { ...ct, adelantos: (ct.adelantos||[]).map(x => x.id === tempId ? a : x) } : ct) }
      }))
      return a
    } catch (e) {
      setClients(prev => prev.map(c => {
        if (c.id !== clientId) return c
        return { ...c, contratos: (c.contratos||[]).map(ct => ct.id === contratoId ? { ...ct, adelantos: (ct.adelantos||[]).filter(x => x.id !== tempId) } : ct) }
      }))
      alert("Error agregando adelanto"); throw e
    }
  }, [])
  const onUpdateAdelanto = useCallback(async (clientId, contratoId, adelantoId, patch) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c
      return { ...c, contratos: (c.contratos||[]).map(ct => {
        if (ct.id !== contratoId) return ct
        return { ...ct, adelantos: (ct.adelantos||[]).map(a => a.id === adelantoId ? { ...a, ...patch } : a) }
      })}
    }))
    updateAdelanto(adelantoId, patch).catch(e => { logError("updateAdelanto", e); alert("Error guardando adelanto") })
  }, [])
  const onDeleteAdelanto = useCallback(async (clientId, contratoId, adelantoId) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c
      return { ...c, contratos: (c.contratos||[]).map(ct => {
        if (ct.id !== contratoId) return ct
        return { ...ct, adelantos: (ct.adelantos||[]).filter(a => a.id !== adelantoId) }
      })}
    }))
    deleteAdelanto(adelantoId).catch(e => { logError("deleteAdelanto", e); alert("Error eliminando adelanto") })
  }, [])
  const onAddContratoArchivo = useCallback(async (clientId, contratoId, file) => {
    const localUrl = URL.createObjectURL(file)
    const tipo    = file.type?.startsWith("image") ? "image" : file.type?.startsWith("video") ? "video" : "pdf"
    const tempId  = `temp_${Date.now()}`
    const optimistic = { id: tempId, contrato_id: contratoId, nombre: file.name, tipo, url: localUrl }
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c
      return { ...c, contratos: (c.contratos||[]).map(ct => {
        if (ct.id !== contratoId) return ct
        return { ...ct, contrato_archivos: [...(ct.contrato_archivos||[]), optimistic] }
      })}
    }))
    uploadStart()
    try {
      const url     = await uploadFile("contratos", file.name, file, uploadCfgRef.current)
      const archivo = await createContratoArchivo({ contrato_id: contratoId, nombre: file.name, tipo, url })
      setClients(prev => prev.map(c => {
        if (c.id !== clientId) return c
        return { ...c, contratos: (c.contratos||[]).map(ct => {
          if (ct.id !== contratoId) return ct
          return { ...ct, contrato_archivos: (ct.contrato_archivos||[]).map(a => a.id === tempId ? archivo : a) }
        })}
      }))
      URL.revokeObjectURL(localUrl)
    } catch (e) {
      setClients(prev => prev.map(c => {
        if (c.id !== clientId) return c
        return { ...c, contratos: (c.contratos||[]).map(ct => {
          if (ct.id !== contratoId) return ct
          return { ...ct, contrato_archivos: (ct.contrato_archivos||[]).filter(a => a.id !== tempId) }
        })}
      }))
      URL.revokeObjectURL(localUrl)
      throw e
    } finally { uploadEnd() }
  }, [])
  const onDeleteContratoArchivo = useCallback(async (clientId, contratoId, archivoId) => {
    let fileUrl = null
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c
      return { ...c, contratos: (c.contratos||[]).map(ct => {
        if (ct.id !== contratoId) return ct
        const ar = (ct.contrato_archivos||[]).find(a => a.id === archivoId)
        if (ar) fileUrl = ar.url
        return { ...ct, contrato_archivos: (ct.contrato_archivos||[]).filter(a => a.id !== archivoId) }
      })}
    }))
    deleteContratoArchivo(archivoId).catch(e => { logError("deleteContratoArchivo", e); alert("Error eliminando archivo") })
    if (fileUrl) deleteFileByUrl(fileUrl)
  }, [])
  const onMergeClients = useCallback(async (targetId, sourceId) => {
    setClients(prev => {
      const target = prev.find(c => c.id === targetId)
      const source = prev.find(c => c.id === sourceId)
      if (!target || !source) return prev
      const newRegIds = [...new Set([...(target.reg_ids||[]), ...(source.reg_ids||[])])]
      const newPhones = [...new Set([...(target.phones||[]), ...(source.phones||[])])]
      updateClient(targetId, { reg_ids: newRegIds, phones: newPhones })
        .then(() => Promise.all((source.contratos||[]).map(ct => updateContrato(ct.id, { client_id: targetId }))))
        .then(() => deleteClient(sourceId))
        .catch(e => { logError("mergeClients", e); alert("Error al fusionar fichas") })
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
    setAlmacen(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
    updateSalida(id, patch).catch(e => { logError("updateSalida", e); alert("Error guardando salida") })
  }, [])
  const onDeleteSalida = useCallback(async (id) => {
    setAlmacen(prev => prev.filter(s => s.id !== id))
    deleteSalida(id).catch(e => { logError("deleteSalida", e); alert("Error eliminando salida") })
  }, [])
  const onAddItem = useCallback(async (salidaId, payload) => {
    const tempId = `temp_${Date.now()}`
    const optimistic = { id: tempId, salida_id: salidaId, ...payload, created_at: new Date().toISOString() }
    setAlmacen(prev => prev.map(s => s.id === salidaId ? { ...s, almacen_items: [...(s.almacen_items||[]), optimistic] } : s))
    try {
      const item = await createItem({ salida_id: salidaId, ...payload })
      setAlmacen(prev => prev.map(s => s.id === salidaId ? { ...s, almacen_items: (s.almacen_items||[]).map(it => it.id === tempId ? item : it) } : s))
      return item
    } catch (e) {
      setAlmacen(prev => prev.map(s => s.id === salidaId ? { ...s, almacen_items: (s.almacen_items||[]).filter(it => it.id !== tempId) } : s))
      alert("Error agregando item"); throw e
    }
  }, [])
  const onUpdateItem = useCallback(async (salidaId, itemId, patch) => {
    setAlmacen(prev => prev.map(s => s.id === salidaId ? { ...s, almacen_items: (s.almacen_items||[]).map(it => it.id === itemId ? { ...it, ...patch } : it) } : s))
    updateItem(itemId, patch).catch(e => { logError("updateItem", e); alert("Error guardando item") })
  }, [])
  const onDeleteItem = useCallback(async (salidaId, itemId) => {
    setAlmacen(prev => prev.map(s => s.id === salidaId ? { ...s, almacen_items: (s.almacen_items||[]).filter(it => it.id !== itemId) } : s))
    deleteItem(itemId).catch(e => { logError("deleteItem", e); alert("Error eliminando item") })
  }, [])
  const onAddAlmacenArchivo = useCallback(async (salidaId, file) => {
    const localUrl = URL.createObjectURL(file)
    const tempId = `temp_${Date.now()}`
    const optimistic = { id: tempId, salida_id: salidaId, nombre: file.name, tipo: file.type, url: localUrl }
    setAlmacen(prev => prev.map(s => s.id === salidaId ? { ...s, almacen_archivos: [...(s.almacen_archivos||[]), optimistic] } : s))
    uploadStart()
    try {
      const url = await uploadFile("almacen", file.name, file, uploadCfgRef.current)
      const ar  = await createAlmacenArchivo({ salida_id: salidaId, nombre: file.name, tipo: file.type, url })
      setAlmacen(prev => prev.map(s => s.id === salidaId ? { ...s, almacen_archivos: (s.almacen_archivos||[]).map(a => a.id === tempId ? ar : a) } : s))
      URL.revokeObjectURL(localUrl)
    } catch (e) {
      setAlmacen(prev => prev.map(s => s.id === salidaId ? { ...s, almacen_archivos: (s.almacen_archivos||[]).filter(a => a.id !== tempId) } : s))
      URL.revokeObjectURL(localUrl)
      throw e
    } finally { uploadEnd() }
  }, [])
  const onDeleteAlmacenArchivo = useCallback(async (salidaId, archivoId) => {
    let fileUrl = null
    setAlmacen(prev => prev.map(s => { if (s.id !== salidaId) return s; const ar = (s.almacen_archivos||[]).find(a=>a.id===archivoId); if(ar) fileUrl=ar.url; return { ...s, almacen_archivos: (s.almacen_archivos||[]).filter(a => a.id !== archivoId) } }))
    deleteAlmacenArchivo(archivoId).catch(e => { logError("deleteAlmacenArchivo", e); alert("Error eliminando archivo") })
    if (fileUrl) deleteFileByUrl(fileUrl)
  }, [])
  const onAddArchivoRecojo = useCallback(async (salidaId, file) => {
    const localUrl = URL.createObjectURL(file)
    const tempId = `temp_${Date.now()}`
    const optimistic = { id: tempId, salida_id: salidaId, nombre: file.name, tipo: file.type, url: localUrl }
    setAlmacen(prev => prev.map(s => s.id === salidaId ? { ...s, almacen_archivos_recojo: [...(s.almacen_archivos_recojo||[]), optimistic] } : s))
    uploadStart()
    try {
      const url = await uploadFile("almacen", file.name, file, uploadCfgRef.current)
      const ar = await createArchivoRecojo({ salida_id: salidaId, nombre: file.name, tipo: file.type, url })
      setAlmacen(prev => prev.map(s => s.id === salidaId ? { ...s, almacen_archivos_recojo: (s.almacen_archivos_recojo||[]).map(a => a.id === tempId ? ar : a) } : s))
      URL.revokeObjectURL(localUrl)
    } catch (e) {
      setAlmacen(prev => prev.map(s => s.id === salidaId ? { ...s, almacen_archivos_recojo: (s.almacen_archivos_recojo||[]).filter(a => a.id !== tempId) } : s))
      URL.revokeObjectURL(localUrl)
      throw e
    } finally { uploadEnd() }
  }, [])
  const onDeleteArchivoRecojo = useCallback(async (salidaId, archivoId) => {
    let fileUrl = null
    setAlmacen(prev => prev.map(s => { if (s.id !== salidaId) return s; const ar = (s.almacen_archivos_recojo||[]).find(a=>a.id===archivoId); if(ar) fileUrl=ar.url; return { ...s, almacen_archivos_recojo: (s.almacen_archivos_recojo||[]).filter(a => a.id !== archivoId) } }))
    deleteArchivoRecojo(archivoId).catch(e => { logError("deleteArchivoRecojo", e); alert("Error eliminando archivo") })
    if (fileUrl) deleteFileByUrl(fileUrl)
  }, [])

  // ── INVENTARIO ops ────────────────────────────────────────────────────────
  const onAddInventario = useCallback(async (payload) => {
    const tempId = `temp_${Date.now()}`
    const optimistic = { id: tempId, ...payload, created_by: user.name, created_at: new Date().toISOString() }
    setInventario(prev=>[...prev, optimistic])
    try { const item = await createInventarioItem({ ...payload, created_by: user.name }); setInventario(prev=>prev.map(i=>i.id===tempId?item:i)); return item }
    catch(e) { setInventario(prev=>prev.filter(i=>i.id!==tempId)); alert("Error agregando item"); throw e }
  }, [user])
  const onUpdateInventario = useCallback(async (id, patch) => {
    setInventario(prev=>prev.map(i=>i.id===id?{...i,...patch}:i))
    updateInventarioItem(id, patch).catch(e => { logError("updateInventario", e); alert("Error guardando item") })
  }, [])
  const onDeleteInventario = useCallback(async (id) => {
    setInventario(prev=>prev.filter(i=>i.id!==id))
    deleteInventarioItem(id).catch(e => { logError("deleteInventario", e); alert("Error eliminando item") })
  }, [])

  // ── CONTACTOS ops ─────────────────────────────────────────────────────────
  const onAddContacto = useCallback(async (payload) => {
    const tempId = `temp_${Date.now()}`
    const optimistic = { id: tempId, ...payload, created_at: new Date().toISOString() }
    setContactos(prev => [optimistic, ...prev])
    try {
      const data = await createContacto(payload)
      setContactos(prev => prev.map(c => c.id === tempId ? data : c))
      return data
    } catch (e) {
      setContactos(prev => prev.filter(c => c.id !== tempId))
      alert("Error creando cliente"); throw e
    }
  }, [])
  const onUpdateContacto = useCallback(async (id, patch) => {
    setContactos(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
    updateContacto(id, patch).catch(e => { logError("updateContacto", e); alert("Error guardando cliente") })
  }, [])
  const onDeleteContacto = useCallback(async (id) => {
    setContactos(prev => prev.map(c => c.id === id ? { ...c, deleted_at: new Date().toISOString() } : c))
    updateContacto(id, { deleted_at: new Date().toISOString() }).catch(e => { logError("deleteContacto", e); alert("Error eliminando") })
  }, [])
  const onRestoreContacto = useCallback(async (id) => {
    setContactos(prev => prev.map(c => c.id === id ? { ...c, deleted_at: null } : c))
    updateContacto(id, { deleted_at: null }).catch(e => { logError("restoreContacto", e); alert("Error restaurando") })
  }, [])
  const onPermanentDeleteContacto = useCallback(async (id) => {
    setContactos(prev => prev.filter(c => c.id !== id))
    deleteContacto(id).catch(e => { logError("permanentDeleteContacto", e); alert("Error eliminando") })
  }, [])

  // ── CONFIG ops ────────────────────────────────────────────────────────────
  const onSetTags     = useCallback(async (v) => { setTags(v); setConfig("estado_tags", v).catch(()=>alert("Error guardando tags")) }, [])
  const onSetLocales  = useCallback(async (v) => { setLocales(v); setConfig("locales", v).catch(()=>alert("Error guardando locales")) }, [])
  const onSetProdTags = useCallback(async (v) => { setProdTags(v); setConfig("producto_tags", v).catch(()=>alert("Error guardando productos")) }, [])
  const onSetUploadCfg = useCallback(async (v) => { setUploadCfg(v); setConfig("upload_config", v).catch(()=>alert("Error guardando config de uploads")) }, [])
  const onSetVisionKey = useCallback(async (v) => { setVisionKey(v); setConfig("google_vision_key", v).catch(()=>alert("Error guardando API key")) }, [])
  const onSetTrashDays = useCallback(async (v) => { setTrashDays(v); setConfig("trash_days", v).catch(()=>alert("Error guardando config")) }, [])

  // ── PROFILES ops ─────────────────────────────────────────────────────────
  const onUpdateProfile = useCallback(async (id, patch) => {
    setUsers(prev=>prev.map(u=>u.id===id?{...u,...patch}:u))
    updateProfile(id, patch).catch(e => { logError("updateProfile", e); alert("Error guardando perfil") })
  }, [])
  const onDeleteProfile = useCallback(async (id) => {
    setUsers(prev=>prev.filter(u=>u.id!==id))
    updateProfile(id, { active: false }).catch(e => { logError("deleteProfile", e); alert("Error eliminando perfil") })
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────
  if (authState === "loading") return <Loader />
  if (authState === "logged_out") {
    return authView === "login"
      ? <Login go={() => setAuthView("register")} />
      : <Register go={() => setAuthView("login")} />
  }
  if (!user?.active && !adm) return <Pending />


  const changeTab = (t) => {
    if (uploadCount > 0 && !window.confirm("Hay archivos subiendo, si sales se perderán. ¿Seguro?")) return
    setTab(t); setMobSide(false); setNavClientId(null); setNavRegId(null); setNavRegDate(null)
    // Sidebar tab-switching resets the per-tab "selected employee/ficha" views,
    // so every explicit navigation lands on the grid. Internal flows like the
    // ficha's Volver button use `returnToTab` instead to preserve the origin.
    removeLS("client_view"); removeLS("client_viewEmp"); removeLS("almacen_view"); removeLS("reg_viewUser")
  }

  // Used ONLY by the ficha Volver button to navigate back to the origin tab
  // without clearing that tab's view state. The origin tab was saved earlier
  // into return_tab by goToClient/goToReg/goToAlmacen, and crucially the
  // origin's viewUser/viewEmp keys are still in localStorage because those
  // helpers use setTab (not changeTab) — they never clear them.
  const returnToTab = (t) => {
    if (uploadCount > 0 && !window.confirm("Hay archivos subiendo, si sales se perderán. ¿Seguro?")) return
    setTab(t); setMobSide(false); setNavClientId(null); setNavRegId(null); setNavRegDate(null)
  }

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <style>{CSS}</style>
      <ToastContainer />
      {mobSide && <div onClick={()=>setMobSide(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:40 }} />}
      <Side tab={tab} set={changeTab} adm={adm} open={mobSide} perms={user?.permissions||[]} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        <Head user={user} menu={()=>setMobSide(true)} onToggleViewMode={(adm || user?.can_toggle_view) ? (mode) => {
          setUser(prev => ({ ...prev, view_mode: mode }))
          setStr("view_mode", mode)
          updateProfile(user.id, { view_mode: mode }).catch(() => {})
        } : null} />
        {uploadCount > 0 && (
          <div style={{ background:"#1a3a5c", borderBottom:`1px solid ${C.accent}`, padding:"8px 24px", display:"flex", alignItems:"center", gap:10, fontSize:13, color:C.accent }}>
            <span style={{ display:"inline-block", width:14, height:14, border:"2px solid currentColor", borderTopColor:"transparent", borderRadius:"50%", animation:"spin .8s linear infinite" }} />
            Subiendo {uploadCount} archivo{uploadCount > 1 ? "s" : ""}...
          </div>
        )}
        <main style={{ flex:1, padding:24, overflow:"auto", background: tab === "finanzas" ? "#09090b" : undefined }}>
          <Suspense fallback={<div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:60, color:C.muted }}><div style={{ width:28, height:28, border:`3px solid ${C.border}`, borderTop:`3px solid ${C.accent}`, borderRadius:"50%", animation:"spin 1s linear infinite" }} /></div>}>
          {tab==="registro" && (
            <Registro
              regs={regs} user={user} adm={adm} tags={tags} photos={photos}
              clients={clients} locales={locales} users={users}
              navRegId={navRegId} navRegDate={navRegDate}
              clearNavReg={()=>{setNavRegId(null);setNavRegDate(null)}}
              onAddReg={onAddReg} onUpdateReg={onUpdateReg} onUploadRegPhoto={onUploadRegPhoto}
              onHardDeleteReg={onHardDeleteReg}
              onAddClient={onAddClient} onDeleteClient={onDeleteClient} onAddContratoArchivo={onAddContratoArchivo} onDeleteContratoArchivo={onDeleteContratoArchivo} onUpdateContrato={onUpdateContrato} goToClient={goToClient}
            />
          )}
          {tab==="fichas" && (
            <Clientes
              clients={clients} user={user} adm={adm} regs={regs} users={users} prodTags={prodTags} visionKey={visionKey} contactos={contactos}
              navClientId={navClientId} clearNavClient={()=>setNavClientId(null)} changeTab={changeTab} returnToTab={returnToTab}
              goToReg={goToReg} goToAlmacen={goToAlmacen}
              onAddClient={onAddClient} onUpdateClient={onUpdateClient} onDeleteClient={onDeleteClient}
              onAddContrato={onAddContrato}
              onUpdateContrato={onUpdateContrato}
              onAddAdelanto={onAddAdelanto} onUpdateAdelanto={onUpdateAdelanto} onDeleteAdelanto={onDeleteAdelanto}
              onAddContratoArchivo={onAddContratoArchivo} onDeleteContratoArchivo={onDeleteContratoArchivo}
              onMergeClients={onMergeClients} onAddContacto={onAddContacto}
            />
          )}
          {tab==="clientes" && (
            <Contactos
              contactos={contactos} user={user} adm={adm}
              onAddContacto={onAddContacto} onUpdateContacto={onUpdateContacto} onDeleteContacto={onDeleteContacto}
            />
          )}
          {tab==="almacen" && (
            <Almacen
              almacen={almacen} clients={clients} regs={regs} user={user} adm={adm}
              navClientId={navAlmClientId} clearNav={()=>setNavAlmClientId(null)}
              goToClient={goToClient}
              onAddSalida={onAddSalida} onUpdateSalida={onUpdateSalida} onDeleteSalida={onDeleteSalida}
              onAddItem={onAddItem} onUpdateItem={onUpdateItem} onDeleteItem={onDeleteItem}
              onAddAlmacenArchivo={onAddAlmacenArchivo} onDeleteAlmacenArchivo={onDeleteAlmacenArchivo}
              onAddArchivoRecojo={onAddArchivoRecojo} onDeleteArchivoRecojo={onDeleteArchivoRecojo}
            />
          )}
          {tab==="inventario" && (
            <Inventario
              inventario={inventario} user={user} adm={adm}
              onAddInventario={onAddInventario} onUpdateInventario={onUpdateInventario} onDeleteInventario={onDeleteInventario}
            />
          )}
          {tab==="agenda"    && <Agenda clients={clients} user={user} adm={adm} goToClient={goToClient} onUpdateContrato={onUpdateContrato} />}
          {tab==="auditoria" && <Audit regs={regs} photos={photos} />}
          {tab==="dashboard" && <Dash regs={regs} adm={adm} />}
          {tab==="finanzas" && adm && <Finanzas prodTags={prodTags} />}
          {tab==="admin" && adm && (
            <Admin
              users={users} tags={tags} locales={locales} prodTags={prodTags}
              uploadCfg={uploadCfg} onSetUploadCfg={onSetUploadCfg}
              visionKey={visionKey} onSetVisionKey={onSetVisionKey}
              trashDays={trashDays} onSetTrashDays={onSetTrashDays}
              onSetTags={onSetTags} onSetLocales={onSetLocales} onSetProdTags={onSetProdTags}
              onUpdateProfile={onUpdateProfile} onDeleteProfile={onDeleteProfile}
            />
          )}
          {tab==="papelera" && (
            <Papelera
              clients={clients} contactos={contactos} regs={regs} adm={adm} trashDays={trashDays}
              onRestoreClient={onRestoreClient} onPermanentDeleteClient={onPermanentDeleteClient}
              onRestoreContacto={onRestoreContacto} onPermanentDeleteContacto={onPermanentDeleteContacto}
            />
          )}
          </Suspense>
        </main>
      </div>
    </div>
  )
}
