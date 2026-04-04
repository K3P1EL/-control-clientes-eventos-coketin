import { supabase } from '../lib/supabase'

export async function listAlmacen() {
  const { data, error } = await supabase
    .from('almacen_salidas')
    .select(`
      *,
      almacen_items (*),
      almacen_archivos (*),
      almacen_archivos_recojo (*)
    `)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error
  return (data ?? []).reverse()
}

export async function createSalida(payload) {
  const { data, error } = await supabase
    .from('almacen_salidas')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return { ...data, almacen_items: [], almacen_archivos: [] }
}

export async function updateSalida(id, patch) {
  const { data, error } = await supabase
    .from('almacen_salidas')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSalida(id) {
  const { error } = await supabase.from('almacen_salidas').delete().eq('id', id)
  if (error) throw error
}

export async function createItem(payload) {
  const { data, error } = await supabase
    .from('almacen_items')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateItem(id, patch) {
  const { data, error } = await supabase
    .from('almacen_items')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteItem(id) {
  const { error } = await supabase.from('almacen_items').delete().eq('id', id)
  if (error) throw error
}

export async function createAlmacenArchivo(payload) {
  const { data, error } = await supabase
    .from('almacen_archivos')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAlmacenArchivo(id) {
  const { error } = await supabase.from('almacen_archivos').delete().eq('id', id)
  if (error) throw error
}

// ─── Archivos de recojo ─────────────────────────────────────────────────────

export async function createArchivoRecojo(payload) {
  const { data, error } = await supabase
    .from('almacen_archivos_recojo')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteArchivoRecojo(id) {
  const { error } = await supabase.from('almacen_archivos_recojo').delete().eq('id', id)
  if (error) throw error
}
