// Static constants used across the entire Finanzas module.
// Kept dependency-free so any sub-module can import without pulling in
// React, hooks, or other helpers.

export const DIAS_SEMANA = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"]

export const MESES = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

export const MESES_CORTO = ["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]

// Used by Contratos and Caja modules.
export const PERSONAS = ["Yo", "Loli", "Mama", "Jose", "Otro"]
export const MODALS = ["Efectivo", "Yape", "Transferencia", "Plin"]

// localStorage keys for the Finanzas module. All persistence is local
// to the browser; nothing crosses to Supabase.
export const STORAGE_KEYS = {
  VIABILIDAD: "finanzas_viabilidad",
  CONTRATOS: "finanzas_contratos",
  CAJA: "finanzas_caja",
}
