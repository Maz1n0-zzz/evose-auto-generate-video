import React from "react";
import { AbsoluteFill, Series, useVideoConfig } from "remotion";
import { BarChartMotion } from "./charts/BarChartMotion";
import { LineChartMotion } from "./charts/LineChartMotion";
import { DonutMotion } from "./charts/DonutMotion";
import { NumberCounter } from "./charts/NumberCounter";
import { AnimatedBackground } from "./backgrounds/AnimatedBackground";
import { PipelineDiagram } from "./scenes/PipelineDiagram";

// Evose brand palette — 1 accent per scene
const BLUE = "#3B82F6";
const CYAN = "#60A5FA";
const TEAL = "#14B8A6";
const LAVENDER = "#A5B4FC";
const TEXT = "#EAF2FF";

const EVOSE_DATA = [
  { name: "Nhanh", value: 80, unit: "%" },
  { name: "Tự động", value: 95, unit: "%" },
  { name: "Chuyên nghiệp", value: 90, unit: "%" },
];

const LINE_DATA = [
  { label: "T1", value: 60 },
  { label: "T2", value: 72 },
  { label: "T3", value: 68 },
  { label: "T4", value: 85 },
  { label: "T5", value: 95 },
];

function SceneLabel({ text, accent }: { text: string; accent: string }) {
  return (
    <p
      style={{
        fontFamily: "'Hanken Grotesk', sans-serif",
        fontWeight: 700,
        fontSize: 28,
        color: accent,
        letterSpacing: 3,
        textTransform: "uppercase",
        margin: 0,
        opacity: 0.92,
      }}
    >
      {text}
    </p>
  );
}

function ContentLayer({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 100px",
        gap: 52,
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}

export function ChartDemo() {
  const { fps } = useVideoConfig();
  const sceneDur = fps * 2;  // 60 frames = 2s per chart scene
  const diagDur = fps * 3;   // 90 frames = 3s for diagram scene

  return (
    <Series>
      {/* Scene 1 — Bar chart */}
      <Series.Sequence durationInFrames={sceneDur}>
        <AbsoluteFill>
          <AnimatedBackground accent={BLUE} />
          <ContentLayer>
            <SceneLabel text="So sánh hiệu suất" accent={BLUE} />
            <BarChartMotion
              data={EVOSE_DATA}
              accent={BLUE}
              duration={sceneDur - 10}
            />
          </ContentLayer>
        </AbsoluteFill>
      </Series.Sequence>

      {/* Scene 2 — NumberCounter */}
      <Series.Sequence durationInFrames={sceneDur}>
        <AbsoluteFill>
          <AnimatedBackground accent={CYAN} />
          <ContentLayer>
            <SceneLabel text="Chỉ số nổi bật" accent={CYAN} />
            <NumberCounter
              target={95}
              suffix="%"
              duration={sceneDur - 10}
              color={CYAN}
            />
            <p
              style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: 34,
                color: TEXT,
                margin: 0,
                opacity: 0.7,
              }}
            >
              Tự động hoá
            </p>
          </ContentLayer>
        </AbsoluteFill>
      </Series.Sequence>

      {/* Scene 3 — Donut */}
      <Series.Sequence durationInFrames={sceneDur}>
        <AbsoluteFill>
          <AnimatedBackground accent={TEAL} />
          <ContentLayer>
            <SceneLabel text="Tỉ lệ hoàn thành" accent={TEAL} />
            <DonutMotion
              percent={90}
              label="Chuyên nghiệp"
              accent={TEAL}
              size={400}
              duration={sceneDur - 10}
            />
          </ContentLayer>
        </AbsoluteFill>
      </Series.Sequence>

      {/* Scene 4 — Line chart */}
      <Series.Sequence durationInFrames={sceneDur}>
        <AbsoluteFill>
          <AnimatedBackground accent={LAVENDER} />
          <ContentLayer>
            <SceneLabel text="Xu hướng tăng trưởng" accent={LAVENDER} />
            <LineChartMotion
              data={LINE_DATA}
              accent={LAVENDER}
              width={900}
              height={420}
              duration={sceneDur - 10}
            />
          </ContentLayer>
        </AbsoluteFill>
      </Series.Sequence>

      {/* Scene 5 — Pipeline diagram (90 frames / 3s) */}
      <Series.Sequence durationInFrames={diagDur}>
        <PipelineDiagram />
      </Series.Sequence>
    </Series>
  );
}
