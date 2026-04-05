import React from "react";
import { AbsoluteFill } from "remotion";
import { HookPunchline } from "../../../../templates/data-charts/HookPunchline";

const HookPunchlineShowcase: React.FC = () => (
  <AbsoluteFill>
    <HookPunchline
      chart={{
        type: "hook-punchline",
        questionText: "So why doesn't it feel that way?",
        aboveLine: ["Eggs", "Coffee"],
        belowLine: ["Chips", "Milk", "Peanut Butter", "Ice Cream"],
      } as any}
      brandColor="#E88CA5"
      fontFamily="Inter, sans-serif"
    />
  </AbsoluteFill>
);

export default HookPunchlineShowcase;
