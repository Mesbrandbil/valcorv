import React from 'react';
import { Audio, staticFile, useCurrentFrame } from 'remotion';
import { World } from '../world/World';
import { stateAt } from './state';
import { Subtitles } from './Subtitles';

export type FilmProps = {
  /** Burn in the narration as small subtitles (the review version). */
  subtitles?: boolean;
  /** Optional audio, as files in public/audio. With none, the film renders silent. */
  narration?: string | null;
  sound?: string | null;
};

export const Film: React.FC<FilmProps> = ({ subtitles = false, narration = null, sound = null }) => {
  const f = useCurrentFrame();
  const state = stateAt(f);
  return (
    <>
      <World state={{ ...state, screen: subtitles ? <Subtitles f={f} /> : undefined }} />
      {narration ? <Audio src={staticFile(`audio/${narration}`)} /> : null}
      {sound ? <Audio src={staticFile(`audio/${sound}`)} /> : null}
    </>
  );
};
