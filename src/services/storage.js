import { supabase } from '../lib/supabase'

/**
 * Sube un archivo al bucket "archivos" y devuelve la URL pública.
 * @param {string} folder  - subcarpeta: 'registros' | 'contratos' | 'almacen'
 * @param {string} fileName - nombre original del archivo
 * @param {File} file - objeto File del input
 */
const MAX_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'video/mp4', 'video/quicktime']

export async function uploadFile(folder, fileName, file) {
  if (file.size > MAX_SIZE) throw new Error(`El archivo excede 50MB (${(file.size/1024/1024).toFixed(1)}MB)`)
  if (file.type && !ALLOWED_TYPES.includes(file.type)) throw new Error(`Tipo de archivo no permitido: ${file.type}. Usa JPG, PNG, PDF, MP4 o MOV`)
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
