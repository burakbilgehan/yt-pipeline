import React from "react";
import { AbsoluteFill } from "remotion";
import { ClosingSequence } from "../../../../templates/data-charts/ClosingSequence";

const ClosingSequenceShowcase: React.FC = () => (
  <AbsoluteFill>
    <ClosingSequence
      chart={{
        type: "closing-sequence",
        textSequence: [
          { text: "What does the data really say?" },
          { text: "Same numbers. Same charts. Different lens." },
          { text: "Different conclusion." },
        ],
        channelName: "Demo Channel",
        showSubscribe: true,
      }}
      brandColor="#E88CA5"
      fontFamily="Inter, sans-serif"
    />
  </AbsoluteFill>
);

export default ClosingSequenceShowcase;
