import { supabase } from '../lib/supabase'

export async function listContactos() {
  const { data, error } = await supabase
    .from('contactos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error
  return data ?? []
}

export async function createContacto(payload) {
  const { data, error } = await supabase
    .from('contactos')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateContacto(id, patch) {
  const { data, error } = await supabase
    .from('contactos')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteContacto(id) {
  const { error } = await supabase.from('contactos').delete().eq('id', id)
  if (error) throw error
}

export async function searchContactos(query) {
  const q = query.toLowerCase()
  const { data, error } = await supabase
    .from('contactos')
    .select('*')
    .or(`nombre.ilike.%${q}%,dni.ilike.%${q}%`)
    .limit(10)
  if (error) throw error
  return data ?? []
}
