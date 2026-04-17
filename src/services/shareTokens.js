import { supabase } from "../lib/supabase"

// Gestión de tokens para compartir vista pública read-only de Finanzas.
// Tabla finanzas_share_tokens + RPC public_get_contratos / public_get_caja
// (ver supabase/migrations/20260417_share_tokens.sql).

// 32 chars url-safe. No necesita ser criptográficamente perfecto — la
// seguridad real viene de poder revocar. 32 chars ≈ 190 bits, suficiente
// para que no se adivine por fuerza bruta.
function randomToken() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(36).padStart(2, "0")).join("").slice(0, 32)
}

export async function listTokens() {
  const { data, error } = await supabase
    .from("finanzas_share_tokens")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data || []
}

export async function createToken(label) {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id
  if (!userId) throw new Error("No hay usuario autenticado")
  const token = randomToken()
  const { data, error } = await supabase
    .from("finanzas_share_tokens")
    .insert({ token, user_id: userId, label: label || null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function revokeToken(token) {
  const { error } = await supabase
    .from("finanzas_share_tokens")
    .update({ revoked: true, revoked_at: new Date().toISOString() })
    .eq("token", token)
  if (error) throw error
}

export async function deleteToken(token) {
  const { error } = await supabase
    .from("finanzas_share_tokens")
    .delete()
    .eq("token", token)
  if (error) throw error
}

// Fetch público (sin auth) de los datos del dueño vía RPC.
// Solo funciona si el token existe y no está revocado.
export async function fetchPublicContratos(token) {
  const { data, error } = await supabase.rpc("public_get_contratos", { p_token: token })
  if (error) throw error
  return data
}

export async function fetchPublicCaja(token) {
  const { data, error } = await supabase.rpc("public_get_caja", { p_token: token })
  if (error) throw error
  return data
}
