import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

interface Props {
  target: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  color?: string;
}

export function NumberCounter({
  target,
  suffix = "%",
  prefix = "",
  duration,
  color = "#EAF2FF",
}: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationFrames = duration ?? fps * 1.5;

  const value = interpolate(frame, [0, durationFrames], [0, target], {
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 700,
        fontSize: 120,
        color,
        lineHeight: 1,
        letterSpacing: -2,
      }}
    >
      {prefix}
      {Math.round(value)}
      {suffix}
    </div>
  );
}
