// Written by scripts/place-subtitles.py from the rendered master: where each review subtitle sits (bottom or
// top), how far from the frame edge, and how it breaks into rows, chosen so its panel cuts no drawing in any
// frame of its line. Do not edit by hand; lines not listed sit at the bottom on one row.
export const SUBTITLE_PLACES: Partial<Record<string, { at: 'bottom' | 'top'; edge: number; rows: string[] }>> = {
  N1a: { at: 'bottom', edge: 28, rows: ["Real work in the middle: a worker, a site, a risk owner."] },
  N1b: { at: 'bottom', edge: 28, rows: ["Priora places agents around it."] },
  W1: { at: 'bottom', edge: 28, rows: ["Worker: Hey, the bracket by the packing line has cracked again. We’re going to weld it before the night shift."] },
  N2: { at: 'bottom', edge: 28, rows: ["Priora hears the job,", "and asks for a photo."] },
  N3a: { at: 'bottom', edge: 28, rows: ["Next, it summons only the specialists this site and job need."] },
  N3b: { at: 'bottom', edge: 28, rows: ["Each checks its own conditions and reports back."] },
  N4a: { at: 'bottom', edge: 28, rows: ["When everything holds, the route opens."] },
  N4b: { at: 'bottom', edge: 28, rows: ["Work goes on, the record is kept, no one is disturbed."] },
  N5a: { at: 'bottom', edge: 28, rows: ["One condition slips: the fire watch is half the policy."] },
  N5b: { at: 'bottom', edge: 28, rows: ["Priora brings it to the risk owner."] },
  N5c: { at: 'bottom', edge: 28, rows: ["Agents prepare, the human decides."] },
  N6Ra: { at: 'bottom', edge: 14, rows: ["Retain is never", "a default."] },
  N6Rb: { at: 'bottom', edge: 28, rows: ["Risk is kept on purpose, with its terms explicit."] },
  N6M: { at: 'bottom', edge: 28, rows: ["Mitigate compares safeguards, and checks whether the work is back inside."] },
  N6T: { at: 'bottom', edge: 28, rows: ["Transfer, simulated for now, asks", "outside capacity for terms and a price."] },
  N7a: { at: 'bottom', edge: 28, rows: ["Priora carries the case between rooms."] },
  N7b: { at: 'bottom', edge: 28, rows: ["The risk owner stays in control."] },
  N8: { at: 'bottom', edge: 28, rows: ["Priora turns physical work into explicit risk decisions, while the work happens."] },
};
