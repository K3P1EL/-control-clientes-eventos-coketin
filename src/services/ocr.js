import { isValidDNI, validatePhone, isValidContrato } from '../lib/validation'

export function parseOCRText(rawText) {
  const text = rawText || ''
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  const result = {
    nombre: '', dni: '', telefono: '', direccion: '', referencia: '',
    total: '', adelanto: '', saldo: '', garantia: '', fecha_evento: '',
    numero_contrato: '', tipo_documento: '', descripcion_servicios: '',
    confianza: {},
  }

  // --- TIPO DE DOCUMENTO ---
  const contratoLine = getLineWith(lines, 'CONTRATO')
  if (contratoLine && /[\u2713\u2714\u2611\u2612]|[vVxX]\s*$/.test(contratoLine)) {
    result.tipo_documento = 'contrato'
  } else if (/CONTRATO/i.test(text)) {
    result.tipo_documento = 'contrato'
  }
  if (/PROFORMA/i.test(text)) {
    const pl = getLineWith(lines, 'PROFORMA')
    if (/[\u2713\u2714\u2611\u2612]|[vVxX]\s*$/.test(pl)) result.tipo_documento = 'proforma'
  }

  // --- NUMERO DE CONTRATO ---
  const nMatch = text.match(/N[\u00b0\u00ba.]\s*:?\s*([\d]{3,7})/i)
  if (nMatch) { result.numero_contrato = nMatch[1]; result.confianza.numero_contrato = 'alto' }

  // --- NOMBRE ---
  const senorMatch = text.match(/SE[\u00d1N]OR\s*:?\s*(.+)/i)
  if (senorMatch) {
    result.nombre = cleanValue(senorMatch[1])
    result.confianza.nombre = 'alto'
  } else {
    const idx = findLineIndex(lines, /^SE[\u00d1N]OR/i)
    if (idx >= 0) {
      const after = lines[idx].replace(/^SE[\u00d1N]OR\s*:?\s*/i, '').trim()
      result.nombre = after || (lines[idx + 1] || '')
      result.confianza.nombre = after ? 'alto' : 'medio'
    }
  }

  // --- TELEFONO ---
  const telMatch = text.match(/TEL[\u00c9E]FONO\s*:?\s*([\d\s\-\.]{7,15})/i)
    || text.match(/CELULAR\s*:?\s*([\d\s\-\.]{7,15})/i)
  if (telMatch) {
    result.telefono = telMatch[1].replace(/[\s\-\.]/g, '').trim()
    result.confianza.telefono = 'alto'
  } else {
    const phoneRegex = /\b(\d[\d\s\-\.]{7,12}\d)\b/g
    let m
    while ((m = phoneRegex.exec(text)) !== null) {
      const digits = m[1].replace(/\D/g, '')
      if (digits.length === 9 && /^9/.test(digits)) {
        result.telefono = digits
        result.confianza.telefono = 'medio'
        break
      }
    }
  }

  // --- DNI ---
  const dniMatch = text.match(/DNI\s*:?\s*(\d{8})\b/i)
  if (dniMatch) {
    result.dni = dniMatch[1]
    result.confianza.dni = 'alto'
  } else {
    const allNums = text.match(/\b\d{8}\b/g) || []
    for (const num of allNums) {
      if (num !== result.telefono && num !== result.numero_contrato && !/^0/.test(num)) {
        result.dni = num
        result.confianza.dni = 'bajo'
        break
      }
    }
  }

  // --- DIRECCION ---
  const dirMatch = text.match(/DIRECCI[\u00d3O]N\s*:?\s*(.+)/i)
  if (dirMatch) {
    let dir = cleanValue(dirMatch[1])
    dir = dir.replace(/E[-\s]?MAIL.*$/i, '').replace(/TEL[\u00c9E]FONO.*$/i, '').trim()
    result.direccion = dir
    result.confianza.direccion = 'alto'
  }

  // --- REFERENCIA ---
  const refMatch = text.match(/REFERENCIA\s*:?\s*(.+)/i)
  if (refMatch) {
    let ref = cleanValue(refMatch[1])
    ref = ref.replace(/DISTRITO.*$/i, '').trim()
    result.referencia = ref
    result.confianza.referencia = 'alto'
  }

  // --- TOTALES ---
  const totalMatch = text.match(/TOTAL\s*:?\s*S?\/?\s*([\d,\.]+)/i)
  if (totalMatch) { result.total = cleanNumber(totalMatch[1]); result.confianza.total = 'alto' }

  const adelantoMatch = text.match(/(?:ADELANTO|YAPE|A\s*CUENTA)\s*:?\s*S?\/?\s*([\d,\.]+)/i)
  if (adelantoMatch) { result.adelanto = cleanNumber(adelantoMatch[1]); result.confianza.adelanto = 'alto' }

  const saldoMatch = text.match(/SALDO\s*:?\s*S?\/?\s*([\d,\.]+)/i)
  if (saldoMatch) { result.saldo = cleanNumber(saldoMatch[1]); result.confianza.saldo = 'alto' }

  const garantiaMatch = text.match(/GARANT[\u00cdI]A\s*:?\s*(.+)/i)
  if (garantiaMatch) { result.garantia = cleanValue(garantiaMatch[1]); result.confianza.garantia = 'alto' }

  // --- FECHA DE EVENTO ---
  const fechaMatch = text.match(/FECHA\s*(?:DE\s*)?(?:EVENTO|ENTREGA)\s*:?\s*(.+)/i)
  if (fechaMatch) {
    result.fecha_evento = cleanValue(fechaMatch[1])
    result.confianza.fecha_evento = 'alto'
  } else {
    const fg = text.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/)
    if (fg) { result.fecha_evento = fg[1]; result.confianza.fecha_evento = 'bajo' }
  }

  // --- DESCRIPCION ---
  result.descripcion_servicios = extractDescripcion(lines)
  if (result.descripcion_servicios) result.confianza.descripcion_servicios = 'medio'

  // --- Validación final: descartar valores que no pasen las reglas ---
  if (result.dni && !isValidDNI(result.dni)) {
    result.dni = ''
    delete result.confianza.dni
  }
  if (result.telefono) {
    const tv = validatePhone(result.telefono)
    if (tv.ok) result.telefono = tv.value
    else { result.telefono = ''; delete result.confianza.telefono }
  }
  if (result.numero_contrato && !isValidContrato(result.numero_contrato)) {
    result.numero_contrato = ''
    delete result.confianza.numero_contrato
  }

  return result
}

// --- Helpers ---

function getLineWith(lines, keyword) {
  return lines.find(l => l.toUpperCase().includes(keyword.toUpperCase())) || ''
}

function findLineIndex(lines, regex) {
  return lines.findIndex(l => regex.test(l))
}

function cleanValue(val) {
  return (val || '').replace(/[_\.]{3,}/g, '').replace(/\s{2,}/g, ' ').trim()
}

function cleanNumber(val) {
  let n = (val || '').replace(/\s/g, '')
  if (/^\d{1,3},\d{3}/.test(n)) n = n.replace(/,/g, '')
  if (/^\d{1,3}\.\d{3}$/.test(n)) n = n.replace(/\./g, '')
  n = n.replace(/\.00$/, '')
  return n
}

function extractDescripcion(lines) {
  const startIdx = findLineIndex(lines, /DESCRIPCI[\u00d3O]N/i)
  if (startIdx < 0) return ''

  const stopWords = [
    /^TOTAL/i, /^SALDO/i, /^ADELANTO/i, /^YAPE/i, /^GARANT/i,
    /^CONDICIONES/i, /^FIRMA/i, /^CLIENTE$/i, /^EVENTOS/i,
    /NO\s*INCLUYE/i, /RESPONSABIL/i, /SE\s*ADELANTO/i,
    /P\.?\s*UNITARIO/i, /^IMPORTE$/i,
  ]

  const descLines = []
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    if (stopWords.some(sw => sw.test(line))) break
    if (/^P\.?\s*UNITARIO|^IMPORTE$/i.test(line)) continue
    descLines.push(line)
  }
  if (!descLines.length) return ''
  return descLines.map(line => /^[-+\u2022\u00b7]/.test(line) ? line : `- ${line}`).join('\n')
}
