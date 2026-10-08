import React from 'react';
import { Composition } from 'remotion';
import { FPS, HEIGHT, WIDTH } from './lib/tokens';
import { loadFonts } from './lib/text';
import { World } from './world/World';
import { SCENES } from './static/scenes';
import { CaseSheet, CastSheet, PeopleSheet } from './static/Sheets';
import { PaperGrainTile, PaperMottle } from './static/Textures';

loadFonts();

const WorldStill: React.FC<{ scene: string }> = ({ scene }) => <World state={SCENES[scene] ?? SCENES.sheet} />;

export const Root: React.FC = () => (
  <>
    {/* Step 2: the static world */}
    <Composition id="world-still" component={WorldStill} durationInFrames={1} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{ scene: 'sheet' }} />
    <Composition id="cast-sheet" component={CastSheet} durationInFrames={1} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="people-sheet" component={PeopleSheet} durationInFrames={1} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="case-sheet" component={CaseSheet} durationInFrames={1} fps={FPS} width={WIDTH} height={HEIGHT} />
    {/* generated once: paper textures */}
    <Composition id="paper-grain-tile" component={PaperGrainTile} durationInFrames={1} fps={FPS} width={1024} height={1024} />
    <Composition id="paper-mottle" component={PaperMottle} durationInFrames={1} fps={FPS} width={1440} height={810} />
  </>
);
