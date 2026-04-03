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

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export async function getOCRUsage() {
  const val = await getConfig('ocr_usage')
  if (!val) return { month: getCurrentMonth(), count: 0 }
  return val.month === getCurrentMonth() ? val : { month: getCurrentMonth(), count: 0 }
}

export async function incrementOCRCount() {
  const current = await getOCRUsage()
  const month = getCurrentMonth()
  const usage = { month, count: current.month === month ? current.count + 1 : 1 }
  await setConfig('ocr_usage', usage)
  return usage
}
