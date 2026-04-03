import { supabase } from '../lib/supabase'

export async function listInventario() {
  const { data, error } = await supabase
    .from('inventario')
    .select('*')
    .order('created_at')
  if (error) throw error
  return data ?? []
}

export async function createInventarioItem(payload) {
  const { data, error } = await supabase
    .from('inventario')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateInventarioItem(id, patch) {
  const { data, error } = await supabase
    .from('inventario')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteInventarioItem(id) {
  const { error } = await supabase.from('inventario').delete().eq('id', id)
  if (error) throw error
}
