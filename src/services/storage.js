import { supabase } from '../lib/supabase'
import { logError, logWarn } from '../lib/logger'

const DEFAULTS = { maxMB: 45, quality: 0.85, allowedTypes: ['image/jpeg','image/png','application/pdf','video/mp4','video/quicktime'] }

// Compress image via canvas (max 1920px wide, configurable quality). Returns a Blob.
function compressImage(file, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objUrl)
      const MAX_W = 1920
      let w = img.width, h = img.height
      if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W }
      const canvas = document.createElement("canvas")
      canvas.width = w; canvas.height = h
      canvas.getContext("2d").drawImage(img, 0, 0, w, h)
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Compresión falló")), "image/jpeg", quality)
    }
    img.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error("No se pudo leer la imagen")) }
    img.src = objUrl
  })
}

/**
 * @param {string} folder
 * @param {string} fileName
 * @param {File} file
 * @param {object} cfg - { maxMB, quality, allowedTypes }
 */
export async function uploadFile(folder, fileName, file, cfg) {
  const { maxMB, quality, allowedTypes } = { ...DEFAULTS, ...cfg }
  const maxBytes = maxMB * 1024 * 1024

  if (file.type && !allowedTypes.includes(file.type)) {
    throw new Error(`Tipo no permitido: ${file.type}`)
  }

  let uploadBlob = file
  let contentType = file.type || 'application/octet-stream'

  // Compress images (not PDFs, not videos)
  if (file.type?.startsWith("image/")) {
    try {
      uploadBlob = await compressImage(file, quality)
      contentType = "image/jpeg"
    } catch (e) { logWarn("storage.compress", "Compresion fallida, subiendo original", { msg: e.message }); uploadBlob = file }
  }

  if (uploadBlob.size > maxBytes) {
    throw new Error(`El archivo excede ${maxMB}MB (${(uploadBlob.size/1024/1024).toFixed(1)}MB)`)
  }

  const ext = contentType === "image/jpeg" ? "jpg" : (fileName.includes('.') ? fileName.split('.').pop() : 'bin')
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage
    .from('archivos')
    .upload(path, uploadBlob, { upsert: true, contentType })
  if (error) throw error
  const { data } = supabase.storage.from('archivos').getPublicUrl(path)
  return data.publicUrl
}

// Extract storage path from public URL
function urlToPath(url) {
  if (!url) return null
  const match = url.match(/\/archivos\/(.+)$/)
  return match ? match[1] : null
}

// Delete file from storage bucket by its public URL
export async function deleteFileByUrl(url) {
  const path = urlToPath(url)
  if (!path) return
  const { error } = await supabase.storage.from('archivos').remove([path])
  if (error) logError("storage.deleteFileByUrl", error, { path })
}

// List all files in a folder
export async function listStorageFiles(folder) {
  const { data, error } = await supabase.storage.from('archivos').list(folder, { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } })
  if (error) throw error
  return (data || []).map(f => ({ ...f, folder, path: `${folder}/${f.name}` }))
}

// Delete file from storage by path
export async function deleteStorageFile(path) {
  const { data, error } = await supabase.storage.from('archivos').remove([path])
  if (error) throw error
  return data
}

// Sum the bytes of every file in the given folders. Used by the
// dashboard to show "X MB / 1 GB" without exposing supabase to the UI.
export async function getStorageUsage(folders) {
  let total = 0
  for (const folder of folders) {
    const { data, error } = await supabase.storage.from('archivos').list(folder, { limit: 1000 })
    if (error) throw error
    if (data) total += data.reduce((sum, f) => sum + (f.metadata?.size || 0), 0)
  }
  return total
}

// Resolve a storage `path` (e.g. "registros/abc.jpg") to its public URL.
export function getStorageUrl(path) {
  const { data } = supabase.storage.from('archivos').getPublicUrl(path)
  return data?.publicUrl || null
}
