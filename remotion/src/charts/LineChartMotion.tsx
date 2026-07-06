import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

interface Point {
  label: string;
  value: number;
}

interface Props {
  data: Point[];
  duration?: number;
  accent?: string;
  width?: number;
  height?: number;
}

export function LineChartMotion({
  data,
  duration,
  accent = "#3B82F6",
  width = 840,
  height = 400,
}: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationFrames = duration ?? fps * 2;

  const pad = { t: 40, r: 20, b: 60, l: 20 };
  const W = width - pad.l - pad.r;
  const H = height - pad.t - pad.b;

  const minVal = Math.min(...data.map((d) => d.value));
  const maxVal = Math.max(...data.map((d) => d.value));
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => ({
    x: pad.l + (i / (data.length - 1)) * W,
    y: pad.t + H - ((d.value - minVal) / range) * H,
    label: d.label,
    value: d.value,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const totalLength = 1200;
  const drawn = interpolate(frame, [0, durationFrames], [totalLength, 0], {
    extrapolateRight: "clamp",
  });

  const dotsOpacity = interpolate(
    frame,
    [durationFrames * 0.7, durationFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <svg width={width} height={height}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={accent} stopOpacity={0.7} />
          <stop offset="100%" stopColor={accent} />
        </linearGradient>
      </defs>

      <path
        d={pathD}
        fill="none"
        stroke="url(#lineGrad)"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={totalLength}
        strokeDashoffset={drawn}
      />

      {points.map((p, i) => (
        <g key={i} opacity={dotsOpacity}>
          <circle cx={p.x} cy={p.y} r={8} fill={accent} />
          <text
            x={p.x}
            y={p.y - 20}
            textAnchor="middle"
            fontFamily="'JetBrains Mono', monospace"
            fontWeight={700}
            fontSize={24}
            fill="#EAF2FF"
          >
            {p.value}
          </text>
          <text
            x={p.x}
            y={pad.t + H + 36}
            textAnchor="middle"
            fontFamily="'Hanken Grotesk', sans-serif"
            fontWeight={600}
            fontSize={22}
            fill="#EAF2FF"
          >
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
