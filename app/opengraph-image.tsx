import { ImageResponse } from "next/og";

// Imagen que aparece al compartir el link del sitio (WhatsApp, Instagram, etc.).
export const alt = "Memento — Cajas de regalo armadas a tu medida en Cañada de Gómez";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#2a1b13",
          color: "#fdf3e7",
        }}
      >
        <div style={{ fontSize: 30, letterSpacing: 8, color: "#e8794f", fontWeight: 700 }}>
          CAJAS DE REGALO · CAÑADA DE GÓMEZ
        </div>
        <div style={{ marginTop: 28, fontSize: 92, fontWeight: 700, lineHeight: 1.05 }}>
          Regalá un momento,
        </div>
        <div style={{ fontSize: 92, fontWeight: 700, lineHeight: 1.05 }}>no un objeto.</div>
        <div style={{ marginTop: 40, display: "flex", alignItems: "center" }}>
          <div
            style={{
              background: "#e8794f",
              color: "#3e2a1f",
              padding: "18px 40px",
              borderRadius: 999,
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            MEMENTO
          </div>
          <div style={{ marginLeft: 28, fontSize: 30, color: "#c9a78d" }}>Armala a tu gusto, te la llevamos.</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
