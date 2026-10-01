import type { Metadata } from "next";
import { Geist_Mono, Quicksand } from "next/font/google";
import "./globals.css";
import { SITIO_URL } from "@/lib/negocio";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPCION =
  "Cajas de regalo armadas a tu medida con snacks, dulces y bebidas, entregadas a domicilio en Cañada de Gómez.";

export const metadata: Metadata = {
  metadataBase: new URL(SITIO_URL),
  title: "Memento — Regalá un momento",
  description: DESCRIPCION,
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Memento",
    title: "Memento — Regalá un momento",
    description: DESCRIPCION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${quicksand.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:font-medium focus:text-brand-foreground"
        >
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
