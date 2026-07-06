import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

const NAVY2 = "#0A1532";
const BLUE = "#3B82F6";
const CYAN = "#60A5FA";
const LAVENDER = "#A5B4FC";

type Props = { accent?: string };

export function AnimatedBackground({ accent = BLUE }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const TWO_PI = Math.PI * 2;

  // Cycles 4–6s → in 2s scenes blobs traverse 33–50% of cycle = clearly visible
  // Phase offsets ensure non-zero velocity at frame=0 for every blob
  const s1 = Math.sin((frame / fps) * (TWO_PI / 4));                           // 4s, phase=0   → cos(0)=1, max velocity
  const s2 = Math.sin((frame / fps) * (TWO_PI / 5) + Math.PI / 3);             // 5s, phase=π/3 → cos=0.5
  const s3 = Math.sin((frame / fps) * (TWO_PI / 4.5) + Math.PI / 6);           // 4.5s, phase=π/6 → cos≈0.87
  const s4 = Math.sin((frame / fps) * (TWO_PI / 5.5) + (TWO_PI * 2) / 3);     // 5.5s, phase=2π/3 → cos=-0.5

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Layer 1+2: Exact radial-gradient formula from frame-chart-bars HyperFrames template
          Blue glow top-right (0.22) + purple glow top-left (0.16), base #0A1532 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: [
            "radial-gradient(120% 80% at 84% 8%, rgba(59,130,246,.22), transparent 52%)",
            "radial-gradient(90% 70% at 10% 0%, rgba(168,85,247,.16), transparent 55%)",
            NAVY2,
          ].join(", "),
        }}
      />

      {/* Layer 3: Animated blobs — frame-driven sin, 4–6s cycles */}

      {/* Blob 1 — blue, top-left quadrant */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          top: -80,
          left: -60,
          background: BLUE,
          borderRadius: "50%",
          mixBlendMode: "screen",
          filter: "blur(85px)",
          opacity: 0.35,
          transform: `translate(${s1 * 55}px, ${s1 * -45}px)`,
        }}
      />

      {/* Blob 2 — cyan, mid-right */}
      <div
        style={{
          position: "absolute",
          width: 460,
          height: 460,
          top: "28%",
          right: -80,
          background: CYAN,
          borderRadius: "50%",
          mixBlendMode: "screen",
          filter: "blur(75px)",
          opacity: 0.3,
          transform: `translate(${s2 * -65}px, ${s2 * 50}px)`,
        }}
      />

      {/* Blob 3 — per-scene accent, bottom-center */}
      <div
        style={{
          position: "absolute",
          width: 440,
          height: 440,
          bottom: -100,
          left: "25%",
          background: accent,
          borderRadius: "50%",
          mixBlendMode: "screen",
          filter: "blur(90px)",
          opacity: 0.32,
          transform: `translate(${s3 * 45}px, ${s3 * 60}px)`,
        }}
      />

      {/* Blob 4 — lavender, mid-left */}
      <div
        style={{
          position: "absolute",
          width: 380,
          height: 380,
          top: "55%",
          left: "5%",
          background: LAVENDER,
          borderRadius: "50%",
          mixBlendMode: "screen",
          filter: "blur(65px)",
          opacity: 0.26,
          transform: `translate(${s4 * 60}px, ${s4 * -35}px)`,
        }}
      />

      {/* Layer 4: Grid — full-screen coverage, 64px, 4% white, NO mask (matches liquid-bg-hero) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: [
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "64px 64px",
        }}
      />

      {/* Layer 5: Lightweight readability scrim (0.18 — down from 0.5) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(5,13,31,0.18) 0%, transparent 80%)",
        }}
      />
    </div>
  );
}
