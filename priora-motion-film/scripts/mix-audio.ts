// Mixes the recorded audio in "audio sources" into the film's two stems on the 90 BPM grid of
// "narration script.md": public/audio/narration.wav (both voices) and public/audio/sound.wav (music and
// effects). Each line is trimmed of its silence and starts exactly on its beat; the worker's line goes
// through a telephone band; the music sits under the voice and ducks while anyone speaks; the two stems
// together reach -16 LUFS with peaks under -1 dBTP. It also writes src/lib/voice-lengths.ts, so the
// subtitles and narration.srt follow the real recordings. Run with: npm run mix   (needs ffmpeg)
//
// audio sources/voice/<clip>.mp3 (or .wav)  one file per line, named as in VOICE: N1a, N1b, W1, ...
// audio sources/music.mp3                   optional: the bed, cut so its first downbeat is at 0 s
// audio sources/effects/<kind>.mp3          optional: one file per kind in CUES below
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { FILM_FRAMES, VOICE, BEAT } from '../src/lib/timeline';
import { FPS } from '../src/lib/tokens';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = process.env.AUDIO_SOURCES ? path.resolve(process.env.AUDIO_SOURCES) : path.join(ROOT, 'audio sources');
const OUT = path.join(ROOT, 'public/audio');
const TMP = path.join(ROOT, 'out/mix');
const RATE = 48000;
const FILM_S = FILM_FRAMES / FPS;
const sec = (frame: number) => frame / FPS;

// ---------------------------------------------------------------- levels (LUFS / LU)
const VOICE_LUFS = -18; // every line is matched to this before the mix; the final gain lifts all together
const MUSIC_UNDER = 18; // music this far under the voice
const DUCK_DB = 4; // and a further 4 dB down while anyone speaks
const EFFECTS_UNDER = 14; // effects quiet and close
const TARGET_LUFS = -16;
const TARGET_TP = -1;

// ---------------------------------------------------------------- effects, from "sound cues.md"
type Cue = { at: number; kind: string; db?: number; until?: number };
const CUES: Cue[] = [
  // Sequence 1: the silhouettes settle, the agents introduce a few higher notes
  { at: 100, kind: 'paper' }, { at: 124, kind: 'paper' }, { at: 148, kind: 'paper' },
  ...[188, 192, 196, 200, 204].map((at) => ({ at, kind: 'note', db: -4 })),
  // Sequence 2: the listening thread, the phrases lifted and set down, the request, the photo
  { at: 304, kind: 'thread' }, { at: 506, kind: 'paper', db: -3 }, { at: 538, kind: 'paper', db: -3 },
  { at: 558, kind: 'thread' }, { at: 598, kind: 'thread' }, { at: 640, kind: 'card' },
  // Sequence 3: the summons, each agent settling, the case on the table
  ...[786, 804, 822, 840, 858].map((at) => ({ at, kind: 'thread', db: -3 })),
  { at: 840, kind: 'card', db: -3 }, { at: 858, kind: 'felt' }, { at: 876, kind: 'tick' }, { at: 894, kind: 'wood', db: -4 }, { at: 912, kind: 'felt' },
  { at: 950, kind: 'felt' },
  // Sequence 4: the findings settle, the ring locks, the welding, the record mark
  { at: 1219, kind: 'felt', db: -4 }, { at: 1222, kind: 'felt', db: -4 }, { at: 1228, kind: 'felt', db: -4 },
  { at: 1234, kind: 'tone' }, { at: 1292, kind: 'weld', db: -8, until: 1391 }, { at: 1322, kind: 'paper', db: -4 },
  // Sequence 5: the arc separates, the packet is carried, the human line arrives
  { at: 1444, kind: 'tick' }, { at: 1584, kind: 'paper', db: -4 }, { at: 1650, kind: 'wood' },
  // Sequence 6: the rooms print, the human line at each threshold, the comparisons, the copies out and back
  { at: 1700, kind: 'paper', db: -4 }, { at: 1706, kind: 'paper', db: -4 }, { at: 1733, kind: 'paper', db: -4 },
  { at: 1850, kind: 'wood' }, { at: 1894, kind: 'felt' }, { at: 1970, kind: 'wood' },
  { at: 2026, kind: 'note', db: -4 }, { at: 2086, kind: 'note', db: -4 },
  { at: 2212, kind: 'wood' }, { at: 2242, kind: 'tone', db: -6 }, { at: 2262, kind: 'tone', db: -6 },
  // Sequence 8: the final record mark
  { at: 2554, kind: 'paper', db: -6 },
];

// ---------------------------------------------------------------- helpers
const run = (args: string[]) => execFileSync('ffmpeg', ['-nostdin', '-hide_banner', '-nostats', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'pipe', 'inherit'] });
const stderrOf = (args: string[]) => spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-nostats', ...args], { encoding: 'utf8' }).stderr;
const duration = (file: string) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim());
/** Integrated loudness and true peak of a file, from ffmpeg's loudnorm analysis. Padding with silence lets
 *  a sound shorter than the 0.4 s measuring block be measured too (silence is gated out). */
const measure = (file: string) => {
  const out = stderrOf(['-i', file, '-af', 'apad=pad_dur=1,loudnorm=print_format=json', '-f', 'null', '-']);
  const json = JSON.parse(out.slice(out.lastIndexOf('{'), out.lastIndexOf('}') + 1));
  const lufs = Number(json.input_i);
  if (!Number.isFinite(lufs)) throw new Error(`${path.basename(file)} is silent`);
  return { lufs, tp: Number(json.input_tp) };
};
const find = (dir: string, name: string) => ['.wav', '.mp3', '.flac', '.m4a'].map((e) => path.join(dir, name + e)).find((f) => fs.existsSync(f));
const db = (x: number) => Math.pow(10, x / 20);

fs.mkdirSync(TMP, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------- 1. the lines, trimmed and matched
const missing = VOICE.filter((v) => !find(path.join(SRC, 'voice'), v.id)).map((v) => v.id);
if (missing.length) {
  console.error(`missing in "audio sources/voice": ${missing.join(', ')}`);
  process.exit(1);
}
// trim leading and trailing silence, so each line's first syllable is its beat
const TRIM = 'silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.12,areverse';
// the worker's voice note: a telephone band, a little squeeze and a small room
const PHONE = 'highpass=f=300:poles=2,highpass=f=300:poles=2,lowpass=f=3400:poles=2,lowpass=f=3400:poles=2,acompressor=threshold=-22dB:ratio=3:attack=5:release=80,aecho=0.85:0.5:23|37:0.14|0.08';
const lines = VOICE.map((v) => {
  const trimmed = path.join(TMP, `${v.id} trimmed.wav`);
  const chain = ['who' in v ? PHONE : 'anull', TRIM, `aresample=${RATE}`].join(',');
  run(['-i', find(path.join(SRC, 'voice'), v.id)!, '-af', chain, '-ac', '1', trimmed]);
  const { lufs } = measure(trimmed);
  const matched = path.join(TMP, `${v.id}.wav`);
  run(['-i', trimmed, '-af', `volume=${(VOICE_LUFS - lufs).toFixed(2)}dB`, '-ac', '1', matched]);
  const frames = Math.ceil(duration(matched) * FPS);
  const from = v.beat * BEAT;
  return { ...v, file: matched, from, frames, end: from + frames - 1, slack: v.by - (from + frames - 1) };
});

console.log('line   start  frames  end    by     slack');
for (const l of lines) console.log(`${l.id.padEnd(6)} F${String(l.from).padStart(4, '0')}  ${String(l.frames).padStart(5)}  F${String(l.end).padStart(4, '0')}  F${String(l.by).padStart(4, '0')}  ${l.slack >= 0 ? '+' : ''}${l.slack}`);
const over = lines.filter((l) => l.slack < 0);
if (over.length) {
  // the picture waits for the voice by whole beats; that is a timeline change, so it is reported, not done here
  for (const l of over) console.error(`${l.id} runs ${-l.slack} frames past F${l.by}: about ${Math.ceil(-l.slack / BEAT)} beat(s) later for what follows, or a slightly quicker take`);
  if (!process.argv.includes('--allow-overrun')) process.exit(1);
}

// ---------------------------------------------------------------- 2. the voice stem
const voiceRaw = path.join(TMP, 'voice raw.wav');
{
  const inputs = lines.flatMap((l) => ['-i', l.file]);
  const placed = lines.map((l, i) => `[${i}]adelay=${Math.round(sec(l.from) * 1000)}:all=1[v${i}]`);
  const graph = `${placed.join(';')};${lines.map((_, i) => `[v${i}]`).join('')}amix=inputs=${lines.length}:normalize=0,apad=whole_dur=${FILM_S},atrim=0:${FILM_S},pan=stereo|c0=c0|c1=c0[out]`;
  run([...inputs, '-filter_complex', graph, '-map', '[out]', '-ar', String(RATE), '-c:a', 'pcm_s24le', voiceRaw]);
}

// ---------------------------------------------------------------- 3. the music and effects stem
const speaking = lines.map((l) => [sec(l.from), sec(l.end + 1)] as const);
// the duck: down by DUCK_DB with 0.25 s ramps in and 0.5 s out round every line
const duckExpr = speaking
  .map(([a, b]) => `clip(min((t-${(a - 0.25).toFixed(3)})/0.25\\,(${(b + 0.5).toFixed(3)}-t)/0.5)\\,0\\,1)`)
  .reduce((acc, e) => `max(${acc}\\,${e})`);
const soundParts: string[] = [];
const soundInputs: string[] = [];
let inputCount = 0;
/** Adds an input file and returns its index in the filter graph. */
const input = (...args: string[]) => {
  soundInputs.push(...args);
  return inputCount++;
};
const music = find(SRC, 'music');
if (music) {
  const { lufs } = measure(music);
  const gain = VOICE_LUFS - MUSIC_UNDER - lufs;
  const fadeOut = sec(2824);
  const i = input('-i', music);
  soundParts.push(
    `[${i}]aresample=${RATE},aformat=channel_layouts=stereo,atrim=0:${FILM_S},apad=whole_dur=${FILM_S},` +
      `volume=${gain.toFixed(2)}dB,volume='pow(10\\,-${DUCK_DB}*(${duckExpr})/20)':eval=frame,` +
      `afade=t=in:d=1.5,afade=t=out:st=${(fadeOut - 2).toFixed(3)}:d=${(FILM_S - fadeOut + 2).toFixed(3)}:curve=qsin[music]`,
  );
} else console.log('no music.mp3: the sound stem has the effects only');
const kinds = [...new Set(CUES.map((c) => c.kind))];
const absent = kinds.filter((k) => !find(path.join(SRC, 'effects'), k));
if (absent.length) console.log(`no effect files for: ${absent.join(', ')} (their cues are left out)`);
const effectGain = new Map<string, number>();
for (const k of kinds) {
  const f = find(path.join(SRC, 'effects'), k);
  if (!f) continue;
  effectGain.set(k, VOICE_LUFS - EFFECTS_UNDER - measure(f).lufs);
}
const cues = CUES.filter((c) => effectGain.has(c.kind));
for (const c of cues) {
  const f = find(path.join(SRC, 'effects'), c.kind)!;
  const gain = effectGain.get(c.kind)! + (c.db ?? 0);
  if (c.until) {
    // a looping effect (the welding), faded in and out over its span
    const d = sec(c.until - c.at);
    const i = input('-stream_loop', '-1', '-i', f);
    soundParts.push(`[${i}]aresample=${RATE},aformat=channel_layouts=stereo,atrim=0:${d.toFixed(3)},afade=t=in:d=0.6,afade=t=out:st=${(d - 1).toFixed(3)}:d=1,volume=${gain.toFixed(2)}dB,adelay=${Math.round(sec(c.at) * 1000)}:all=1[e${i}]`);
  } else {
    const i = input('-i', f);
    soundParts.push(`[${i}]aresample=${RATE},aformat=channel_layouts=stereo,volume=${gain.toFixed(2)}dB,adelay=${Math.round(sec(c.at) * 1000)}:all=1[e${i}]`);
  }
}
const soundRaw = path.join(TMP, 'sound raw.wav');
const labels = soundParts.map((p) => p.slice(p.lastIndexOf('[')));
if (labels.length) {
  const graph = `${soundParts.join(';')};${labels.join('')}amix=inputs=${labels.length}:normalize=0,apad=whole_dur=${FILM_S},atrim=0:${FILM_S}[out]`;
  run([...soundInputs, '-filter_complex', graph, '-map', '[out]', '-ar', String(RATE), '-c:a', 'pcm_s24le', soundRaw]);
} else {
  run(['-f', 'lavfi', '-i', `anullsrc=r=${RATE}:cl=stereo`, '-t', String(FILM_S), '-c:a', 'pcm_s24le', soundRaw]);
}

// ---------------------------------------------------------------- 4. one gain for both, to -16 LUFS under -1 dBTP
const sumOf = (a: string, b: string, out: string) => run(['-i', a, '-i', b, '-filter_complex', '[0][1]amix=inputs=2:normalize=0[o]', '-map', '[o]', '-c:a', 'pcm_s24le', out]);
const sum = path.join(TMP, 'sum.wav');
sumOf(voiceRaw, soundRaw, sum);
const before = measure(sum);
let gain = TARGET_LUFS - before.lufs;
// the voice carries the peaks: a transparent limiter on it keeps them under the ceiling after the gain
const write = (g: number) => {
  run(['-i', voiceRaw, '-af', `volume=${g.toFixed(2)}dB,alimiter=limit=${db(TARGET_TP - 1.5).toFixed(4)}:attack=2:release=60:level=disabled`, '-c:a', 'pcm_s16le', path.join(OUT, 'narration.wav')]);
  run(['-i', soundRaw, '-af', `volume=${g.toFixed(2)}dB`, '-c:a', 'pcm_s16le', path.join(OUT, 'sound.wav')]);
  sumOf(path.join(OUT, 'narration.wav'), path.join(OUT, 'sound.wav'), sum);
  return measure(sum);
};
let after = write(gain);
if (after.tp > TARGET_TP) {
  gain -= after.tp - TARGET_TP + 0.1;
  after = write(gain);
}
console.log(`mix: ${after.lufs.toFixed(1)} LUFS integrated, ${after.tp.toFixed(1)} dBTP peak (gain ${gain >= 0 ? '+' : ''}${gain.toFixed(1)} dB)`);

// ---------------------------------------------------------------- 5. the recorded lengths, for the subtitles and the SRT
const body = lines.map((l) => `  ${l.id}: ${l.frames},`).join('\n');
fs.writeFileSync(
  path.join(ROOT, 'src/lib/voice-lengths.ts'),
  `// Written by the mix (npm run mix): the length in frames of each recorded line, after its silence is\n// trimmed. Lines not listed here run to their \`by\` frame. Do not edit by hand.\nexport const VOICE_LENGTH: Partial<Record<string, number>> = {\n${body}\n};\n`,
);
console.log('wrote public/audio/narration.wav, public/audio/sound.wav and src/lib/voice-lengths.ts; next: npm run srt');
