import { useState } from "react"
import { signUp } from "../services/auth"
import { C } from "../lib/colors"
import { AuthWrap, lbl, inp, btn } from "./shared"

export default function Register({ go }) {
  const [name,  setName]  = useState("")
  const [email, setEmail] = useState("")
  const [pass,  setPass]  = useState("")
  const [err,   setErr]   = useState("")
  const [ok,    setOk]    = useState(false)
  const [loading, setLoading] = useState(false)

  const run = async () => {
    if (!name || !email || !pass) { setErr("Completa todos los campos"); return }
    setLoading(true); setErr("")
    try {
      await signUp(email, pass, name)
      setOk(true)
    } catch (e) {
      setErr(e.message || "Error al registrarse")
    }
    setLoading(false)
  }

  if (ok) return (
    <AuthWrap
      title="¡Registro exitoso!"
      sub="Tu cuenta está pendiente de aprobación por el administrador."
      icon={<svg width="24" height="24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M5 13l4 4L19 7"/></svg>}
      iconBg={C.green}
    >
      <button onClick={go} style={{ ...btn, marginTop:12, width:"100%" }}>Ir al Login</button>
    </AuthWrap>
  )

  return (
    <AuthWrap
      title="Crear Cuenta"
      sub="Regístrate para acceder al sistema"
      icon={<svg width="24" height="24" fill="none" stroke="#fff" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
    >
      {err && <div style={{ background:"#7f1d1d44", color:"#fca5a5", padding:"8px 12px", borderRadius:8, fontSize:13, marginBottom:12 }}>{err}</div>}
      <label style={lbl}>Nombre</label>
      <input style={inp} value={name} onChange={e=>setName(e.target.value)} placeholder="Tu nombre completo" />
      <label style={lbl}>Correo</label>
      <input style={inp} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
      <label style={lbl}>Contraseña</label>
      <input style={inp} type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&run()} />
      <button onClick={run} disabled={loading} style={{ ...btn, width:"100%", marginTop:8, opacity:loading?0.6:1 }}>
        {loading ? "Registrando..." : "Registrarme"}
      </button>
      <p style={{ textAlign:"center", marginTop:16, fontSize:13, color:C.muted }}>
        ¿Ya tienes cuenta?{" "}
        <span onClick={go} style={{ color:C.accent, cursor:"pointer", fontWeight:600 }}>Inicia sesión</span>
      </p>
    </AuthWrap>
  )
}
