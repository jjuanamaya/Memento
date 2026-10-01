// Datos del negocio que exige la ley para vender por internet (Ley 24.240,
// Res. 104/2005 y Ley 25.326). Completá los vacíos antes de publicar: si
// queda alguno vacío, el sitio muestra "[a completar]" en su lugar.
export const NEGOCIO = {
  nombreComercial: "Memento",
  titular: "", // Nombre y apellido (o razón social) de quien vende
  cuit: "",
  domicilio: "", // Calle y número
  localidad: "Cañada de Gómez, Santa Fe, Argentina",
  email: "",
  telefono: "",
  // Link del Formulario 960/D "Data Fiscal" que da ARCA (ex AFIP). Si queda
  // vacío no se muestra nada.
  dataFiscalUrl: "",
  dataFiscalImagenUrl: "",
};

export const ULTIMA_ACTUALIZACION_LEGAL = "1 de octubre de 2026";

export const LINK_DEFENSA_CONSUMIDOR = "https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario";
export const LINK_AAIP = "https://www.argentina.gob.ar/aaip/datospersonales";

export function dato(valor: string) {
  return valor.trim() || "[a completar]";
}
