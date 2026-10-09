Drop the recorded audio here when it exists:

- `narration.wav` for the voice (narrator and the worker's phone message)
- `sound.wav` for the sound design and music

`npm run render:film` and `npm run render:review` check this folder and play whichever of these files is present with the film; with neither here, the film renders silent. Both files start at frame 0 of the film. `narration.srt` and `sound cues.md` give the frames to record and mix to.

In Remotion Studio, set the composition's `narration` and `sound` props to the file names to hear them.
