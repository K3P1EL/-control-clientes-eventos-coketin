import { signOut } from "../services/auth"
import { C } from "../lib/colors"
import { AuthWrap, btnD } from "./shared"

export default function Pending() {
  return (
    <AuthWrap
      title="Cuenta pendiente"
      sub="El administrador aún no ha habilitado tu cuenta."
      icon={<svg width="24" height="24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l2 2"/></svg>}
      iconBg={C.yellow}
    >
      <button onClick={() => signOut()} style={{ ...btnD, marginTop:12, width:"100%" }}>
        Cerrar sesión
      </button>
    </AuthWrap>
  )
}
