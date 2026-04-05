import React from "react";
import { AbsoluteFill } from "remotion";
import { LocationMapScene } from "../../../../templates/voiceover-visuals/LocationMapScene";

const LocationMapSceneShowcase: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#2A2A32" }}>
    <LocationMapScene
      chart={{
        type: "location-map",
        location: "Istanbul, Turkey",
        coordinates: "41.0082° N, 28.9784° E",
        pinColor: "#34D399",
      }}
      brandColor="#E88CA5"
      fontFamily="Inter, sans-serif"
    />
  </AbsoluteFill>
);

export default LocationMapSceneShowcase;
