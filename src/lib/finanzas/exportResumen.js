import * as XLSX from "xlsx"

// Generates a one-page Excel summary ("Resumen para la Jefa") with
// 5 sections: Contratos, Caja, Viabilidad, Plata por recibir, Ritmo.
// All data is pre-computed and passed in — no hooks, no React.

const fmt = (n) => typeof n === "number" ? `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"

export function exportResumen({ periodo, periodoLabel, summary, desglose, viabilidad, tipo }) {
  const rows = []
  const merges = []
  let r = 0

  const addTitle = (text) => { rows.push([text]); merges.push({ s: { r, c: 0 }, e: { r, c: 3 } }); r++ }
  const addBlank = () => { rows.push([]); r++ }
  const addHeader = (text) => { rows.push([text]); merges.push({ s: { r, c: 0 }, e: { r, c: 3 } }); r++ }
  const addRow = (label, val) => { rows.push([label, val]); r++ }
  const addRow4 = (a, b, c, d) => { rows.push([a, b, c, d]); r++ }

  // Title
  addTitle(`Resumen del Negocio — ${periodoLabel}`)
  const now = new Date()
  addRow("Generado:", `${now.toLocaleDateString("es-PE")} a las ${now.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}`)
  addBlank()

  // Section A: Contratos
  addHeader("CONTRATOS")
  addRow4("Métrica", "Valor", "", "")
  addRow("Contratos registrados", summary.registros)
  addRow("Ganancia", fmt(summary.ganancia))
  addRow("Descuentos", fmt(summary.descuentos))
  addRow("En caja (cobrado)", fmt(summary.enCaja))
  addRow("Pendiente de cobro", fmt(summary.pendiente))
  if (summary.deNuevos) addRow("  De nuevos contratos", fmt(summary.deNuevos))
  if (summary.deAnteriores) addRow("  De contratos anteriores", fmt(summary.deAnteriores))
  addRow("Ingreso Yape", fmt(summary.ingresoYape))
  addRow("Ingreso Efectivo", fmt(summary.ingresoEfectivo))
  addBlank()

  // Section B: Caja
  if (desglose) {
    addHeader("CAJA")
    addRow4("Concepto", "Ingresos", "Egresos", "Balance")
    addRow4("Efectivo", fmt(desglose.efecIn), fmt(desglose.efecOut), fmt(desglose.efecBal))
    addRow4("Yape", fmt(desglose.yapeIn), fmt(desglose.yapeOut), fmt(desglose.yapeBal))
    addRow4("Del negocio", fmt(desglose.negIn), fmt(desglose.negOut), fmt(desglose.negBal))
    addRow4("Externos", fmt(desglose.extIn), fmt(desglose.extOut), fmt(desglose.extBal))
    addRow4("TOTAL", fmt(desglose.efecIn + desglose.yapeIn), fmt(desglose.efecOut + desglose.yapeOut), fmt(desglose.efecIn + desglose.yapeIn - desglose.efecOut - desglose.yapeOut))
    if (desglose.traspYaEf || desglose.traspEfYa) {
      addRow(`Traspasos: Yape→Efectivo ${fmt(desglose.traspYaEf)}  |  Efectivo→Yape ${fmt(desglose.traspEfYa)}`, "")
    }
    addBlank()
  }

  // Section C: Viabilidad
  if (viabilidad) {
    addHeader("VIABILIDAD")
    if (tipo === "semana") {
      addRow("Trabajadores semana", fmt(viabilidad.trabajadoresSemanaReal))
      addRow("Servicios semana", fmt(viabilidad.proporcionServSemana))
      addRow("Apoyo externo", fmt(-viabilidad.apoyoSemanal))
      addRow("Gasto neto semanal", fmt(viabilidad.gastoNetoSemanal))
      addBlank()
      const libre = viabilidad.cajaLibreSemana
      addRow(libre >= 0 ? `SOBRAN` : `FALTAN`, fmt(Math.abs(libre)))
    } else {
      addRow("Trabajadores mes", fmt(viabilidad.trabRealMes))
      addRow("Servicios mes", fmt(viabilidad.serviciosMes))
      addRow("Apoyo externo", fmt(-viabilidad.apoyoMes))
      addRow("Gasto real mes", fmt(viabilidad.gastoRealMes))
      addBlank()
      const libre = viabilidad.cajaVsGasto3A
      addRow(libre >= 0 ? `SOBRAN` : `FALTAN`, fmt(Math.abs(libre)))
    }
    addBlank()
  }

  // Section D: Plata por recibir
  if (summary.porPersona) {
    const personas = Object.entries(summary.porPersona).filter(([, v]) => v > 0)
    if (personas.length > 0) {
      addHeader("PLATA POR RECIBIR")
      addRow4("Persona", "Monto", "", "")
      personas.forEach(([name, monto]) => addRow(name, fmt(monto)))
      addBlank()
    }
  }

  // Section E: Ritmo (monthly only)
  if (tipo === "mes" && viabilidad && viabilidad.ritmoActual != null) {
    addHeader("RITMO DEL MES")
    addRow("Meta diaria necesaria", fmt(viabilidad.metaDiariaNecesaria))
    addRow("Ritmo actual (S//día)", fmt(viabilidad.ritmoActual))
    addRow("Diferencia vs meta", fmt(viabilidad.diffRitmo))
  }

  // Build workbook
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws["!merges"] = merges
  ws["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 18 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Resumen")

  const filename = `Resumen_${periodo.replace(/\s/g, "_")}.xlsx`
  XLSX.writeFile(wb, filename)
}
