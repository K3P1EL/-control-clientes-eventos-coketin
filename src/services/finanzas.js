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
async function currentUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id || null
}

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

export const loadViabilidad = () => loadOne(TABLES.viabilidad)
export const saveViabilidad = (blob) => saveOne(TABLES.viabilidad, blob)

export const loadContratos = () => loadOne(TABLES.contratos)
export const saveContratos = (blob) => saveOne(TABLES.contratos, blob)

export const loadCaja = () => loadOne(TABLES.caja)
export const saveCaja = (blob) => saveOne(TABLES.caja, blob)
