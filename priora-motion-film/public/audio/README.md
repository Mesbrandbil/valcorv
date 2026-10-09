The film's audio, as two stems that both start at frame 0:

- `narration.wav` for the voice (narrator and the worker's phone message)
- `sound.wav` for the music and the sound effects

`npm run mix` writes both from the recordings in `audio sources` (see "narration script.md"): each line trimmed and started on its beat, the worker's line through a telephone band, the music under the voice and ducked while anyone speaks, the two together at -16 LUFS with peaks under -1 dBTP. It also writes `src/lib/voice-lengths.ts`; run `npm run srt` after it.

`npm run render:film` and `npm run render:review` check this folder and play whichever of these files is present with the film; with neither here, the film renders silent.

In Remotion Studio, set the composition's `narration` and `sound` props to the file names to hear them.
