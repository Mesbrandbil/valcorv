// The brief: the Transfer room keeps its SIMULATED label every time it is on screen. In the pans between
// the room close-ups a sliver of Transfer can be in frame while the label's own place above the room is
// not, so in the film the label holds just inside the frame edge, as near its place as it can, for as long
// as any of the room is in frame. In a still frame of the film it is always in its place.
import { HEIGHT, MONO_TRACKING_EM, WIDTH } from './tokens';
import { ROOM, roomCentre } from './layout';
import type { Pt } from './geometry';

type Cam = { x: number; y: number; zoom: number };

/** Clear of the frame edge by the 40 px margin, with a little to spare. */
export const SIMULATED_MARGIN_PX = 44;
/** The label fades in this far (screen px) before the room's edge reaches the frame, and out as far after. */
const LEAD_PX = 16;

const clamp = (v: number, a: number, b: number) => (a > b ? (a + b) / 2 : Math.max(a, Math.min(b, v)));

/** IBM Plex Mono advances 600/1000 em per character, plus the label tracking. */
export const monoWidth = (text: string, size: number) => size * (0.6 * text.length + MONO_TRACKING_EM * Math.max(0, text.length - 1));

/** How far the room's outer edge reaches into the frame, in screen px; negative while it is still outside. */
export const transferReach = (cam: Cam) => {
  const [cx, cy] = roomCentre('transfer');
  const hw = WIDTH / 2 / cam.zoom;
  const hh = HEIGHT / 2 / cam.zoom;
  const dx = Math.max(cam.x - hw - cx, 0, cx - (cam.x + hw));
  const dy = Math.max(cam.y - hh - cy, 0, cy - (cam.y + hh));
  return (ROOM.r + ROOM.band / 2 - Math.hypot(dx, dy)) * cam.zoom;
};

/** 1 while any of the room is in frame, fading to 0 just after it has gone. */
export const transferInFrame = (cam: Cam) => Math.max(0, Math.min(1, transferReach(cam) / LEAD_PX + 1));

/** Where a middle anchored label of width w and size s sits: its home, held inside the frame edge. */
export const simulatedAt = (cam: Cam, home: Pt, w: number, s: number): Pt => {
  const m = SIMULATED_MARGIN_PX / cam.zoom;
  const hw = WIDTH / 2 / cam.zoom;
  const hh = HEIGHT / 2 / cam.zoom;
  return [clamp(home[0], cam.x - hw + m + w / 2, cam.x + hw - m - w / 2), clamp(home[1], cam.y - hh + m + 0.72 * s, cam.y + hh - m - 0.22 * s)];
};
