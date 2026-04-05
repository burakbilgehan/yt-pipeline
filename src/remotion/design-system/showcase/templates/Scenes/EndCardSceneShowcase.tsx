import React from "react";
import { AbsoluteFill } from "remotion";
import { EndCardScene } from "../../../../templates/data-charts/EndCardScene";

const EndCardSceneShowcase: React.FC = () => (
  <AbsoluteFill>
    <EndCardScene
      chart={{
        type: "end-card",
        fadeToBlack: false,
        backgroundColor: "#2A2A32",
        watermark: true,
        channelName: "Demo Channel",
        finalQuestion: "What would you do differently?",
        gapLabel: "3.2× — the gap no one talks about",
        youtubeEndScreen: { enabled: false },
      } as any}
      brandColor="#E88CA5"
      fontFamily="Inter, sans-serif"
    />
  </AbsoluteFill>
);

export default EndCardSceneShowcase;
