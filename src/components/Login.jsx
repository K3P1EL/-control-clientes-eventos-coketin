import { useState } from "react"
import { signIn } from "../services/auth"
import { C } from "../lib/colors"
import { AuthWrap, lbl, inp, btn } from "./shared"

export default function Login({ go }) {
  const [email, setEmail] = useState("")
  const [pass, setPass]   = useState("")
  const [err, setErr]     = useState("")
  const [loading, setLoading] = useState(false)

  const run = async () => {
    if (!email || !pass) { setErr("Completa todos los campos"); return }
    setLoading(true); setErr("")
    try {
      await signIn(email, pass)
      // onAuthStateChange en App.jsx maneja el resto
    } catch (e) {
      setErr(e.message || "Correo o contraseña incorrectos")
    }
    setLoading(false)
  }

  return (
    <AuthWrap
      title="Control de Clientes"
      sub="Inicia sesión para continuar"
      icon={<svg width="24" height="24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
    >
      {err && <div style={{ background:"#7f1d1d44", color:"#fca5a5", padding:"8px 12px", borderRadius:8, fontSize:13, marginBottom:12 }}>{err}</div>}
      <label style={lbl}>Correo</label>
      <input style={inp} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
      <label style={lbl}>Contraseña</label>
      <input style={inp} type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&run()} />
      <button onClick={run} disabled={loading} style={{ ...btn, width:"100%", marginTop:8, opacity:loading?0.6:1 }}>
        {loading ? "Ingresando..." : "Iniciar Sesión"}
      </button>
      <p style={{ textAlign:"center", marginTop:16, fontSize:13, color:C.muted }}>
        ¿No tienes cuenta?{" "}
        <span onClick={go} style={{ color:C.accent, cursor:"pointer", fontWeight:600 }}>Regístrate</span>
      </p>
    </AuthWrap>
  )
}
