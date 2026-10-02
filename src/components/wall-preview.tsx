/**
 * Parede desenhada em escala: área de margem hachurada e a obra em moldura de latão.
 * Comunica o encaixe antes dos números. Dimensões em cm.
 */
export function WallPreview({
  wallW,
  wallH,
  artW,
  artH,
  margin,
  className = "",
  title,
}: {
  wallW: number;
  wallH: number;
  artW?: number | null;
  artH?: number | null;
  margin: number;
  className?: string;
  title?: string;
}) {
  const W = Number(wallW);
  const H = Number(wallH);
  const m = Math.min(Number(margin), W / 2, H / 2);
  const hasArt = artW != null && artH != null;
  const aw = hasArt ? Number(artW) : 0;
  const ah = hasArt ? Number(artH) : 0;
  const fits = hasArt && aw <= W - 2 * m && ah <= H - 2 * m;
  const stroke = Math.max(W, H) / 220;
  const id = `hatch-${Math.round(W)}-${Math.round(H)}-${Math.round(m)}`;

  return (
    <svg
      viewBox={`${-stroke * 2} ${-stroke * 2} ${W + stroke * 4} ${H + stroke * 4}`}
      className={className}
      role="img"
      aria-label={title ?? `Parede de ${W / 100} por ${H / 100} metros`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <pattern id={id} width={stroke * 6} height={stroke * 6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2={stroke * 6} stroke="#c9cec6" strokeWidth={stroke} />
        </pattern>
      </defs>
      {/* parede */}
      <rect x="0" y="0" width={W} height={H} fill={`url(#${id})`} stroke="#b9bfb6" strokeWidth={stroke} />
      {/* área útil (dentro da margem) */}
      <rect x={m} y={m} width={W - 2 * m} height={H - 2 * m} fill="#f4f5f1" />
      {hasArt && (
        <g>
          <rect
            x={(W - aw) / 2}
            y={(H - ah) / 2}
            width={aw}
            height={ah}
            fill={fits ? "#e9e3d4" : "#f7e2df"}
            stroke={fits ? "#a57f2c" : "#b23a2e"}
            strokeWidth={stroke * 2.2}
          />
          <rect
            x={(W - aw) / 2 + stroke * 5}
            y={(H - ah) / 2 + stroke * 5}
            width={Math.max(aw - stroke * 10, 0)}
            height={Math.max(ah - stroke * 10, 0)}
            fill="none"
            stroke={fits ? "#cdbb8f" : "#d98a80"}
            strokeWidth={stroke * 0.8}
          />
        </g>
      )}
    </svg>
  );
}
