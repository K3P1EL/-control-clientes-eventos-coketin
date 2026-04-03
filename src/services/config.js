import { supabase } from '../lib/supabase'

export async function getConfig(key) {
  const { data, error } = await supabase
    .from('config')
    .select('value')
    .eq('key', key)
    .single()
  // PGRST116 = row not found, devolver null sin error
  if (error && error.code !== 'PGRST116') throw error
  return data?.value ?? null
}

export async function setConfig(key, value) {
  const { error } = await supabase
    .from('config')
    .upsert({ key, value })
  if (error) throw error
}
