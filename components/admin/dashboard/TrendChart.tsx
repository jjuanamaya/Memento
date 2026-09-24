"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface TrendPunto {
  fecha: string;
  etiqueta: string;
  valor: number;
}

interface TrendChartProps {
  data: TrendPunto[];
  variant: "area" | "bar";
  color: string;
  formato: "moneda" | "pedidos";
  mensajeVacio: string;
}

function formatoMonedaCompacta(valor: number) {
  if (valor >= 1000) return `$${(valor / 1000).toFixed(valor >= 10000 ? 0 : 1)}K`;
  return `$${Math.round(valor)}`;
}

function formatoCantidadPedidos(valor: number) {
  const redondeado = Math.round(valor);
  return `${redondeado} pedido${redondeado === 1 ? "" : "s"}`;
}

const VIEW_W = 640;
const VIEW_H = 220;
const PAD_LEFT = 8;
const PAD_RIGHT = 8;
const PAD_TOP = 20;
const PAD_BOTTOM = 26;
const DRAW_W = VIEW_W - PAD_LEFT - PAD_RIGHT;
const DRAW_H = VIEW_H - PAD_TOP - PAD_BOTTOM;

function nicerMax(v: number) {
  if (v <= 0) return 1;
  const magnitud = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / magnitud;
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return niceNorm * magnitud;
}

function roundedTopBarPath(x: number, y: number, w: number, h: number, r: number) {
  const radio = Math.min(r, w / 2, h);
  const yBase = PAD_TOP + DRAW_H;
  if (h <= 0) return "";
  return `M${x},${yBase} L${x},${y + radio} Q${x},${y} ${x + radio},${y} L${x + w - radio},${y} Q${x + w},${y} ${x + w},${y + radio} L${x + w},${yBase} Z`;
}

export function TrendChart({ data, variant, color, formato, mensajeVacio }: TrendChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [animar, setAnimar] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const clipId = useId();
  const formatValor = formato === "moneda" ? formatoMonedaCompacta : formatoCantidadPedidos;

  useEffect(() => {
    setAnimar(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const frame1 = requestAnimationFrame(() => {
      const frame2 = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame2);
    });
    return () => cancelAnimationFrame(frame1);
  }, []);

  const total = data.reduce((acc, d) => acc + d.valor, 0);
  if (total <= 0) {
    return (
      <div className="flex h-[180px] flex-col items-center justify-center gap-1 text-center">
        <p className="text-sm text-muted">{mensajeVacio}</p>
      </div>
    );
  }

  const n = data.length;
  const maxVal = nicerMax(Math.max(...data.map((d) => d.valor)));

  const x = (i: number) => PAD_LEFT + (n <= 1 ? DRAW_W / 2 : (i / (n - 1)) * DRAW_W);
  const y = (v: number) => PAD_TOP + DRAW_H - (v / maxVal) * DRAW_H;

  const puntos = data.map((d, i) => ({ ...d, cx: x(i), cy: y(d.valor) }));
  const lineaPath = puntos.map((p, i) => `${i === 0 ? "M" : "L"}${p.cx},${p.cy}`).join(" ");
  const areaPath = `${lineaPath} L${puntos[puntos.length - 1].cx},${PAD_TOP + DRAW_H} L${puntos[0].cx},${PAD_TOP + DRAW_H} Z`;

  const barWidth = Math.min(24, (DRAW_W / n) * 0.55);

  function manejarMovimiento(clientX: number) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const fraccion = (clientX - rect.left) / rect.width;
    const svgX = fraccion * VIEW_W;
    const i = Math.round(((svgX - PAD_LEFT) / DRAW_W) * (n - 1));
    setHover(Math.min(Math.max(i, 0), n - 1));
  }

  const activo = hover !== null ? puntos[hover] : null;
  const etiquetasEje =
    n <= 1
      ? [0]
      : Array.from(new Set([0, Math.floor((n - 1) / 2), n - 1]));

  return (
    <div className="relative" style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-full w-full touch-none"
        onPointerMove={(e) => manejarMovimiento(e.clientX)}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <rect
              x={0}
              y={0}
              width={animar ? (visible ? 1 : 0) : 1}
              height={1}
              style={{ transition: animar ? "width 900ms cubic-bezier(0.22, 1, 0.36, 1)" : "none" }}
            />
          </clipPath>
        </defs>

        {[0, 0.5, 1].map((t) => (
          <line
            key={t}
            x1={PAD_LEFT}
            x2={PAD_LEFT + DRAW_W}
            y1={PAD_TOP + DRAW_H * t}
            y2={PAD_TOP + DRAW_H * t}
            stroke="var(--border)"
            strokeWidth={1}
          />
        ))}

        <text x={PAD_LEFT} y={PAD_TOP - 6} fontSize="10" fill="var(--muted)">
          {formatValor(maxVal)}
        </text>

        {variant === "area" && (
          <g clipPath={`url(#${clipId})`}>
            <path d={areaPath} fill={color} fillOpacity={0.1} stroke="none" />
            <path d={lineaPath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          </g>
        )}

        {variant === "bar" &&
          puntos.map((p, i) => {
            const alturaBarra = PAD_TOP + DRAW_H - p.cy;
            const baseY = PAD_TOP + DRAW_H;
            return (
              <g
                key={i}
                style={{
                  transform: `translate(${p.cx}px, ${baseY}px) scaleY(${animar ? (visible ? 1 : 0) : 1}) translate(${-p.cx}px, ${-baseY}px)`,
                  transition: animar ? `transform 500ms cubic-bezier(0.22, 1, 0.36, 1) ${Math.min(i * 25, 300)}ms` : "none",
                }}
              >
                <path d={roundedTopBarPath(p.cx - barWidth / 2, p.cy, barWidth, alturaBarra, 4)} fill={color} />
              </g>
            );
          })}

        {activo && (
          <line
            x1={activo.cx}
            x2={activo.cx}
            y1={PAD_TOP}
            y2={PAD_TOP + DRAW_H}
            stroke="var(--muted)"
            strokeWidth={1}
            strokeOpacity={0.5}
          />
        )}
        {activo && variant === "area" && (
          <circle cx={activo.cx} cy={activo.cy} r={4} fill={color} stroke="var(--background)" strokeWidth={2} />
        )}

        {etiquetasEje.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={VIEW_H - 6}
            fontSize="10"
            fill="var(--muted)"
            textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
          >
            {data[i].etiqueta}
          </text>
        ))}
      </svg>

      {activo && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+8px)] whitespace-nowrap rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${(activo.cx / VIEW_W) * 100}%`,
            top: `${(activo.cy / VIEW_H) * 100}%`,
          }}
        >
          <p className="font-semibold text-foreground">{formatValor(activo.valor)}</p>
          <p className="text-muted">{activo.etiqueta}</p>
        </div>
      )}
    </div>
  );
}
