import { supabase } from '../lib/supabase'

export async function listClients() {
  const { data, error } = await supabase
    .from('clients')
    .select(`
      *,
      contratos (
        *,
        adelantos (*),
        contrato_archivos (*)
      )
    `)
    .order('created_at')
  if (error) throw error
  return (data ?? []).map(c => ({
    ...c,
    contratos: (c.contratos ?? [])
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map(ct => ({
        ...ct,
        adelantos: (ct.adelantos ?? []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
        contrato_archivos: (ct.contrato_archivos ?? []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
      })),
  }))
}

export async function createClient(payload) {
  const { data, error } = await supabase
    .from('clients')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return { ...data, contratos: [] }
}

export async function updateClient(id, patch) {
  const { data, error } = await supabase
    .from('clients')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteClient(id) {
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw error
}
