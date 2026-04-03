import { supabase } from '../lib/supabase'

// ─── Contratos ──────────────────────────────────────────────────────────────

export async function createContrato(payload) {
  const { data, error } = await supabase
    .from('contratos')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return { ...data, adelantos: [], contrato_archivos: [] }
}

export async function updateContrato(id, patch) {
  const { data, error } = await supabase
    .from('contratos')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Adelantos ───────────────────────────────────────────────────────────────

export async function createAdelanto(payload) {
  const { data, error } = await supabase
    .from('adelantos')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateAdelanto(id, patch) {
  const { data, error } = await supabase
    .from('adelantos')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAdelanto(id) {
  const { error } = await supabase.from('adelantos').delete().eq('id', id)
  if (error) throw error
}

// ─── Archivos de contrato ────────────────────────────────────────────────────

export async function createContratoArchivo(payload) {
  const { data, error } = await supabase
    .from('contrato_archivos')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteContratoArchivo(id) {
  const { error } = await supabase.from('contrato_archivos').delete().eq('id', id)
  if (error) throw error
}
