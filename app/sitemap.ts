import type { MetadataRoute } from "next";
import { SITIO_URL } from "@/lib/negocio";

const RUTAS_PUBLICAS = [
  "",
  "/registro",
  "/login",
  "/terminos",
  "/privacidad",
  "/cookies",
  "/cambios-y-devoluciones",
  "/arrepentimiento",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return RUTAS_PUBLICAS.map((ruta) => ({
    url: `${SITIO_URL}${ruta}`,
    changeFrequency: ruta === "" ? "weekly" : "yearly",
    priority: ruta === "" ? 1 : 0.4,
  }));
}
