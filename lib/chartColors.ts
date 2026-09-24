// Paleta de gráficos de Memento, derivada de la marca (cacao + terracota) y
// validada con el script de la skill de dataviz contra la superficie oscura
// del sitio (#2a1b13): banda de luminosidad, piso de croma, separación CVD
// (protan/deutan) y contraste — las dos pasan las seis verificaciones.
export const CHART_COLORS = {
  ingresos: "#d9663a", // mismo hue que --brand, un paso más oscuro para uso en marcas de gráfico
  transferencia: "#d9663a",
  efectivo: "#17a68a",
} as const;
