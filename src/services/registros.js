import { supabase } from '../lib/supabase'

export async function listRegistros() {
  const { data, error } = await supabase
    .from('registros')
    .select('*')
    .order('created_at')
  if (error) throw error
  return data ?? []
}

export async function createRegistro(payload) {
  const { data, error } = await supabase
    .from('registros')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRegistro(id, patch) {
  const { data, error } = await supabase
    .from('registros')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listRegistroFotos() {
  const { data, error } = await supabase
    .from('registro_fotos')
    .select('registro_id, url')
  if (error) throw error
  return data ?? []
}

export async function createRegistroFoto(registroId, url) {
  const { error } = await supabase
    .from('registro_fotos')
    .insert({ registro_id: registroId, url })
  if (error) throw error
}
