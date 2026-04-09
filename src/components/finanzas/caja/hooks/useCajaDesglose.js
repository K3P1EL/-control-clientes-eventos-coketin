import { useMemo } from "react"

// Pure derivation hook for the Caja metrics view. Computes 30+ buckets
// (Yape/Efectivo × Negocio/Externo × Contrato/Fuera + sueldos +
// servicios + traspasos) from the filtered entries list.
export function useCajaDesglose(filtered) {
  return useMemo(() => {
    let yapeIn = 0, yapeOut = 0, efecIn = 0, efecOut = 0
    let negIn = 0, negOut = 0, extIn = 0, extOut = 0
    let yapeNegIn = 0, yapeNegOut = 0, yapeExtIn = 0, yapeExtOut = 0
    let efecNegIn = 0, efecNegOut = 0, efecExtIn = 0, efecExtOut = 0
    let traspYaEf = 0, traspEfYa = 0
    let contratoIn = 0, contratoOut = 0, fueraIn = 0, fueraOut = 0
    let contYapeIn = 0, contYapeOut = 0, contEfecIn = 0, contEfecOut = 0
    let fueraYapeIn = 0, fueraYapeOut = 0, fueraEfecIn = 0, fueraEfecOut = 0
    let sueldoOut = 0, servicioOut = 0

    filtered.forEach(e => {
      const m = e.monto || 0
      if (e.tipo === "traspaso") {
        if (e.modalidad === "Yape>Efectivo") traspYaEf += m
        else if (e.modalidad === "Efectivo>Yape") traspEfYa += m
        return
      }
      const isYape = e.modalidad === "Yape"
      const isNeg = e.delNegocio !== false
      const isCont = (e.deContrato || false) && isNeg

      if (e.tipo === "ingreso") {
        if (isYape) { yapeIn += m; if (isNeg) yapeNegIn += m; else yapeExtIn += m }
        else { efecIn += m; if (isNeg) efecNegIn += m; else efecExtIn += m }
        if (isNeg) negIn += m; else extIn += m
        if (isCont) { contratoIn += m; if (isYape) contYapeIn += m; else contEfecIn += m }
        else { fueraIn += m; if (isYape) fueraYapeIn += m; else fueraEfecIn += m }
      } else if (e.tipo === "egreso") {
        if (isYape) { yapeOut += m; if (isNeg) yapeNegOut += m; else yapeExtOut += m }
        else { efecOut += m; if (isNeg) efecNegOut += m; else efecExtOut += m }
        if (isNeg) negOut += m; else extOut += m
        if (isCont) { contratoOut += m; if (isYape) contYapeOut += m; else contEfecOut += m }
        else { fueraOut += m; if (isYape) fueraYapeOut += m; else fueraEfecOut += m }
        if (e.categoria === "sueldo") sueldoOut += m
        if (e.categoria === "servicio") servicioOut += m
      }
    })

    return {
      yapeIn, yapeOut, yapeBal: yapeIn - yapeOut - traspYaEf + traspEfYa,
      efecIn, efecOut, efecBal: efecIn - efecOut + traspYaEf - traspEfYa,
      negIn, negOut, negBal: negIn - negOut, extIn, extOut, extBal: extIn - extOut,
      yapeNegIn, yapeNegOut, yapeNegBal: yapeNegIn - yapeNegOut,
      yapeExtIn, yapeExtOut, yapeExtBal: yapeExtIn - yapeExtOut,
      efecNegIn, efecNegOut, efecNegBal: efecNegIn - efecNegOut,
      efecExtIn, efecExtOut, efecExtBal: efecExtIn - efecExtOut,
      traspYaEf, traspEfYa,
      contratoIn, contratoOut, contratoBal: contratoIn - contratoOut,
      fueraIn, fueraOut, fueraBal: fueraIn - fueraOut,
      contYapeBal: contYapeIn - contYapeOut, contEfecBal: contEfecIn - contEfecOut,
      fueraYapeBal: fueraYapeIn - fueraYapeOut, fueraEfecBal: fueraEfecIn - fueraEfecOut,
      contYapeIn, contYapeOut, contEfecIn, contEfecOut,
      sueldoOut, servicioOut,
    }
  }, [filtered])
}
