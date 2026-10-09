import React, { createContext, useContext } from 'react';
import { HEIGHT, WIDTH } from '../lib/tokens';
import type { Shot } from './shots';

const CameraContext = createContext<Shot>({ x: 0, y: 0, zoom: 1 });

/** The current camera, for anything that needs on-screen sizes (threads, labels, dashes). */
export const useCamera = () => useContext(CameraContext);

/** World units for a given on-screen pixel size at the current zoom. */
export const usePx = () => {
  const { zoom } = useCamera();
  return (px: number) => px / zoom;
};

/** The one transform in the film: everything in the world sits inside it. */
export const Camera: React.FC<{ shot: Shot; children: React.ReactNode }> = ({ shot, children }) => (
  <CameraContext.Provider value={shot}>
    <g transform={`translate(${WIDTH / 2} ${HEIGHT / 2}) scale(${shot.zoom}) translate(${-shot.x} ${-shot.y})`}>{children}</g>
  </CameraContext.Provider>
);

/** For contact sheets: draw world-space content at a given zoom, placed anywhere on screen. */
export const ZoomBox: React.FC<{ at: [number, number]; zoom: number; children: React.ReactNode }> = ({ at, zoom, children }) => (
  <CameraContext.Provider value={{ x: 0, y: 0, zoom }}>
    <g transform={`translate(${at[0]} ${at[1]}) scale(${zoom})`}>{children}</g>
  </CameraContext.Provider>
);
