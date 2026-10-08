// Named camera shots: centre (x, y) in world units and zoom. Source: plan.md section 6.1.
export type Shot = { x: number; y: number; zoom: number };

export const SHOTS = {
  S1_REAL: { x: 2880, y: 2100, zoom: 1.0 },
  S2_VOICE: { x: 2672, y: 2075, zoom: 1.8 },
  S2_CASE: { x: 2800, y: 1950, zoom: 1.38 },
  S3_PANEL: { x: 1390, y: 1390, zoom: 0.72 },
  S3_TABLE: { x: 1360, y: 1507, zoom: 1.1 },
  S4_CASE: { x: 1300, y: 1500, zoom: 1.75 },
  S4_ROUTE: { x: 2760, y: 2000, zoom: 0.96 },
  S5_GAP: { x: 1930, y: 1720, zoom: 0.82 },
  S5_DESK: { x: 3330, y: 2120, zoom: 1.3 },
  S6_ROOMS: { x: 4190, y: 1555, zoom: 0.62 },
  S6_RETAIN: { x: 3760, y: 1288, zoom: 1.25 },
  S6_MITIGATE: { x: 4440, y: 2110, zoom: 1.25 },
  S6_TRANSFER: { x: 4864, y: 1245, zoom: 1.2 },
  S7_SYSTEM: { x: 4190, y: 1555, zoom: 0.62 },
  S8_SHEET: { x: 2980, y: 1640, zoom: 0.37 },
} satisfies Record<string, Shot>;

export type ShotName = keyof typeof SHOTS;
