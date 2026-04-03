import { supabase } from '../lib/supabase'

/**
 * Sube un archivo al bucket "archivos" y devuelve la URL pública.
 * @param {string} folder  - subcarpeta: 'registros' | 'contratos' | 'almacen'
 * @param {string} fileName - nombre original del archivo
 * @param {File} file - objeto File del input
 */
export async function uploadFile(folder, fileName, file) {
  const ext = fileName.includes('.') ? fileName.split('.').pop() : 'bin'
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage
    .from('archivos')
    .upload(path, file, {
      upsert: true,
      contentType: file.type || 'application/octet-stream',
    })
  if (error) throw error
  const { data } = supabase.storage.from('archivos').getPublicUrl(path)
  return data.publicUrl
}
