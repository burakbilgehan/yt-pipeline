import React from 'react';
import { AbsoluteFill } from 'remotion';
import { BauhausHeroScene } from '../../../../templates/data-charts/BauhausHeroScene';

const BauhausHeroSceneShowcase: React.FC = () => {
  return (
    <AbsoluteFill>
      <BauhausHeroScene
        topMetaLeft="Item · Category · Year"
        topMetaRight="The World With Numbers"
        accentLabel="Question"
        title={'Why do some\neconomies grow\nwhile others\nshrink?'}
        primary={{
          value: '38',
          label: 'items analyzed',
          sub: 'reference period',
        }}
        secondary={{
          value: '+6.2%',
          label: 'average annual growth\nin top performers',
        }}
        source="Source: Generic Reference · Year"
      />
    </AbsoluteFill>
  );
};

export default BauhausHeroSceneShowcase;
