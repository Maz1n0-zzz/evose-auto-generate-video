import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { AnimatedBackground } from "../backgrounds/AnimatedBackground";

const BLUE = "#3B82F6";
const CYAN = "#60A5FA";
const TEXT = "#EAF2FF";
const DIM = "rgba(234,242,255,0.56)";

const STEPS = [
  { label: "Nhập link", sub: "URL bài báo / tài liệu nguồn" },
  { label: "AI phân tích", sub: "Trích xuất & tóm tắt nội dung chính" },
  { label: "Sinh kịch bản", sub: "Tạo script 8–12 scene tự động" },
  { label: "Dựng frame", sub: "Render HTML template → PNG/MP4" },
  { label: "Ghép + lồng tiếng", sub: "FFmpeg + OmniVoice TTS local" },
  { label: "Xuất video 9:16", sub: "1080×1920, 30fps, MP4" },
];

const LEFT = 120;
const WIDTH = 840;
const NODE_H = 160;
const ARROW_H = 52;
const NODES_TOP = 320;
const ARROW_LINE_LEN = ARROW_H - 12;

function nodeDelay(i: number) {
  return 5 + i * 8;
}
function arrowDelay(i: number) {
  return nodeDelay(i) + 10;
}

type NodeProps = {
  step: (typeof STEPS)[number];
  index: number;
  frame: number;
  fps: number;
};

function PipelineNode({ step, index, frame, fps }: NodeProps) {
  const delay = nodeDelay(index);
  const nodeSpring = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, stiffness: 90 },
  });
  const nodeOpacity = interpolate(frame - delay, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const accent = index % 2 === 0 ? BLUE : CYAN;
  const top = NODES_TOP + index * (NODE_H + ARROW_H);

  return (
    <div
      style={{
        position: "absolute",
        top,
        left: LEFT,
        width: WIDTH,
        height: NODE_H,
        borderRadius: 20,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(165,180,252,0.22)",
        display: "flex",
        alignItems: "center",
        padding: "0 32px",
        gap: 28,
        boxSizing: "border-box",
        opacity: nodeOpacity,
        transform: `translateY(${(1 - nodeSpring) * 36}px)`,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: accent,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 24px ${accent}66`,
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            fontSize: 28,
            color: TEXT,
          }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span
          style={{
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 34,
            color: TEXT,
            lineHeight: 1,
          }}
        >
          {step.label}
        </span>
        <span
          style={{
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: 24,
            color: DIM,
            lineHeight: 1.2,
          }}
        >
          {step.sub}
        </span>
      </div>
    </div>
  );
}

type ArrowProps = {
  index: number;
  frame: number;
};

function PipelineArrow({ index, frame }: ArrowProps) {
  const delay = arrowDelay(index);
  const arrowProgress = interpolate(frame - delay, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const arrowTop = NODES_TOP + index * (NODE_H + ARROW_H) + NODE_H;
  const cx = LEFT + WIDTH / 2;
  const lineEnd = ARROW_LINE_LEN * arrowProgress;
  const headOpacity = Math.min(1, Math.max(0, (arrowProgress - 0.75) * 4));

  return (
    <svg
      style={{
        position: "absolute",
        top: arrowTop,
        left: cx - 16,
        overflow: "visible",
      }}
      width={32}
      height={ARROW_H}
    >
      <line
        x1={16}
        y1={0}
        x2={16}
        y2={lineEnd}
        stroke={BLUE}
        strokeWidth={2}
        strokeOpacity={0.6}
        strokeLinecap="round"
      />
      <path
        d={`M 8 ${ARROW_LINE_LEN - 8} L 16 ${ARROW_LINE_LEN + 6} L 24 ${ARROW_LINE_LEN - 8}`}
        stroke={BLUE}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={headOpacity}
      />
    </svg>
  );
}

export function PipelineDiagram() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 80 },
  });

  return (
    <AbsoluteFill>
      <AnimatedBackground accent={BLUE} />
      <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
        {/* Title block */}
        <div
          style={{
            position: "absolute",
            top: 120,
            left: LEFT,
            right: LEFT,
            opacity: Math.min(1, titleSpring * 1.5),
            transform: `translateY(${(1 - titleSpring) * 28}px)`,
          }}
        >
          <p
            style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 26,
              color: BLUE,
              letterSpacing: 3,
              textTransform: "uppercase",
              margin: 0,
              opacity: 0.92,
            }}
          >
            Pipeline Evose
          </p>
          <p
            style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontWeight: 800,
              fontSize: 54,
              color: TEXT,
              letterSpacing: -1.5,
              margin: "10px 0 0",
              lineHeight: 1.1,
            }}
          >
            Quy trình tự động
          </p>
        </div>

        {/* Nodes */}
        {STEPS.map((step, i) => (
          <PipelineNode
            key={i}
            step={step}
            index={i}
            frame={frame}
            fps={fps}
          />
        ))}

        {/* Arrows between nodes */}
        {STEPS.slice(0, -1).map((_, i) => (
          <PipelineArrow key={i} index={i} frame={frame} />
        ))}
      </div>
    </AbsoluteFill>
  );
}
