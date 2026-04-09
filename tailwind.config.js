/** @type {import('tailwindcss').Config} */
// preflight: false → Tailwind does NOT inject its CSS reset. That keeps
// our existing inline-style components (Clientes, Registro, Almacen, etc.)
// looking exactly the same. Tailwind utilities are still available for
// the new Finanzas module.
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
}
