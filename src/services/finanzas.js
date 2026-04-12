import { supabase } from "../lib/supabase"

// Three-table model: one row per user_id, the whole module state lives in
// a `data` jsonb column. Cheap to read/write as a single round-trip and
// trivial to migrate the localStorage shape into.
//
// RLS is enforced server-side: only the row owner (auth.uid()) can read or
// write its own rows. We never pass user_id from the client — Supabase
// already knows it from the JWT.

const TABLES = {
  viabilidad: "finanzas_viabilidad",
  contratos: "finanzas_contratos",
  caja: "finanzas_caja",
}

// Returns the current authenticated user_id, or null if not logged in.
// Cached after first call to avoid a network round-trip on every save.
let _cachedUserId = null
async function currentUserId() {
  if (_cachedUserId) return _cachedUserId
  const { data } = await supabase.auth.getUser()
  _cachedUserId = data?.user?.id || null
  return _cachedUserId
}
// Clear cache on sign-out so a new user gets a fresh lookup
supabase.auth.onAuthStateChange((event) => { if (event === "SIGNED_OUT") _cachedUserId = null })

// Generic loader. Returns the `data` jsonb for the current user, or null
// if there is no row yet (first time). Throws on real errors so callers
// can fall back to localStorage for transient network failures.
async function loadOne(table) {
  const userId = await currentUserId()
  if (!userId) return null
  const { data, error } = await supabase
    .from(table)
    .select("data")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw error
  return data?.data ?? null
}

// Generic upsert. Writes the entire blob in one round-trip.
async function saveOne(table, blob) {
  const userId = await currentUserId()
  if (!userId) throw new Error("No authenticated user")
  const { error } = await supabase
    .from(table)
    .upsert({ user_id: userId, data: blob, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
  if (error) throw error
}

// Generic delete. Wipes the entire row for the current user. Used by
// the "Resetear datos originales" button so the next reload re-seeds
// from INITIAL_CONTRACTS / etc instead of restoring the cloud backup.
async function deleteOne(table) {
  const userId = await currentUserId()
  if (!userId) throw new Error("No authenticated user")
  const { error } = await supabase
    .from(table)
    .delete()
    .eq("user_id", userId)
  if (error) throw error
}

export const loadViabilidad = () => loadOne(TABLES.viabilidad)
export const saveViabilidad = (blob) => saveOne(TABLES.viabilidad, blob)
export const deleteViabilidad = () => deleteOne(TABLES.viabilidad)

export const loadContratos = () => loadOne(TABLES.contratos)
export const saveContratos = (blob) => saveOne(TABLES.contratos, blob)
export const deleteContratos = () => deleteOne(TABLES.contratos)

export const loadCaja = () => loadOne(TABLES.caja)
export const saveCaja = (blob) => saveOne(TABLES.caja, blob)
export const deleteCaja = () => deleteOne(TABLES.caja)

// ── Cierres (historial semanal/mensual) ──────────────────────────────

export async function loadCierres() {
  const userId = await currentUserId()
  if (!userId) return []
  const { data, error } = await supabase
    .from("finanzas_cierres")
    .select("*")
    .eq("user_id", userId)
    .order("anio", { ascending: false })
    .order("periodo", { ascending: false })
  if (error) throw error
  return data || []
}

export async function upsertCierre(cierre) {
  const userId = await currentUserId()
  if (!userId) throw new Error("No authenticated user")
  const { error } = await supabase
    .from("finanzas_cierres")
    .upsert(
      { ...cierre, user_id: userId },
      { onConflict: "user_id,tipo,periodo,anio" }
    )
  if (error) throw error
}

export async function deleteCierre(id) {
  const { error } = await supabase
    .from("finanzas_cierres")
    .delete()
    .eq("id", id)
  if (error) throw error
}
