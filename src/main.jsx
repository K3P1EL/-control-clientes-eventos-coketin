import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Ruta pública /vista/:token — se intercepta acá antes de montar App
// para evitar que arranque auth/clients/etc. La dueña solo carga lo que necesita.
const PublicFinanzas = lazy(() => import("./components/PublicFinanzas"))
const vistaMatch = window.location.pathname.match(/^\/vista\/([A-Za-z0-9]+)\/?$/)

const root = createRoot(document.getElementById('root'))
if (vistaMatch) {
  const token = vistaMatch[1]
  root.render(
    <StrictMode>
      <Suspense fallback={<div style={{ minHeight: "100vh", background: "#09090b", color: "#71717a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontFamily: "system-ui,sans-serif" }}>Cargando...</div>}>
        <PublicFinanzas token={token} />
      </Suspense>
    </StrictMode>
  )
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
