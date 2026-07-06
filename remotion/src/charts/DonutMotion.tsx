import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

interface Props {
  percent: number;
  label?: string;
  duration?: number;
  accent?: string;
  size?: number;
}

export function DonutMotion({
  percent,
  label = "",
  duration,
  accent = "#3B82F6",
  size = 360,
}: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationFrames = duration ?? fps * 2;

  const progress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 60, mass: 1 },
    durationInFrames: durationFrames,
  });

  const r = size / 2 - 24;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const drawn = interpolate(progress, [0, 1], [0, (percent / 100) * circumference]);
  const offset = circumference - drawn;

  const numOpacity = interpolate(frame, [10, durationFrames * 0.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={28}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={accent}
          strokeWidth={28}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: numOpacity,
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            fontSize: size * 0.22,
            color: "#EAF2FF",
            lineHeight: 1,
          }}
        >
          {Math.round(progress * percent)}%
        </span>
        {label && (
          <span
            style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: size * 0.072,
              color: "#EAF2FF",
              marginTop: 8,
              opacity: 0.6,
            }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
