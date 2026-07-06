import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

interface BarData {
  name: string;
  value: number;
  unit?: string;
}

interface Props {
  data: BarData[];
  duration?: number;
  accent?: string;
}

export function BarChartMotion({
  data,
  duration,
  accent = "#3B82F6",
}: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationFrames = duration ?? fps * 2;
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 32,
        height: 480,
        width: "100%",
        borderBottom: "2px solid rgba(255,255,255,0.15)",
        paddingBottom: 0,
      }}
    >
      {data.map((d, i) => {
        const delay = i * 4;
        const progress = spring({
          frame: frame - delay,
          fps,
          config: { damping: 18, stiffness: 80, mass: 0.8 },
        });
        const barHeight = interpolate(progress, [0, 1], [0, (d.value / maxValue) * 420]);
        const opacity = interpolate(frame - delay, [0, 10], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={d.name}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 12,
              opacity,
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
                fontSize: 36,
                color: "#EAF2FF",
              }}
            >
              {d.value}
              {d.unit ?? ""}
            </span>
            <div
              style={{
                width: "100%",
                height: barHeight,
                borderRadius: "12px 12px 0 0",
                background: accent,
                boxShadow: `0 8px 32px ${accent}44`,
              }}
            />
            <span
              style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontWeight: 600,
                fontSize: 28,
                color: "#EAF2FF",
                textAlign: "center",
                marginTop: 8,
              }}
            >
              {d.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
