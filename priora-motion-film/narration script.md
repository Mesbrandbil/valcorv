# Narration script

The voice for the Priora film, written to a musical pulse so the narration, the music and the picture move together.

## Tempo

**90 beats per minute.** It sits inside the 82 to 92 range, and at 30 frames a second one beat is exactly 20 frames (0.667 s) and one bar of four is 80 frames. Every line below starts on a beat, so the music can be cut on bar lines and the voice always lands in time with it.

How it stays natural: the beat governs where each sentence *starts* and how long each pause lasts, never the speech inside a sentence. Inside a sentence the voice speaks freely, at a calm 2.3 to 2.6 words a second, which puts one stressed syllable on roughly every beat. Pauses between sentences are whole beats. Nothing is stretched or squeezed to hit a grid.

## Voices

| Voice | Who | Direction |
|---|---|---|
| Narrator | close and composed (storyboard) | warm, unhurried, mid to low register; a thoughtful guide, not an announcer. No upward inflection at line ends; lists stay level |
| Worker | the phone message | a real person on site, slightly hurried and casual, recorded on a phone. Processed afterwards with a narrow telephone band so it sounds like a voice note |

ElevenLabs settings (Text to Speech): model **Eleven Multilingual v2**; Stability 0.55, Similarity 0.75, Style 0.15, Speaker boost on, Speed 0.95 for the narrator and 1.05 for the worker. Suggested voices from the default library: narrator **George** (or Daniel, or Alice for a female narrator); worker **Liam** (or Charlie). One voice and one setting for every narrator line, so the film sounds like one take.

Generate **each clip separately** and keep the takes where the line ends falling, not rising. File names are the clip names (for example `N1a.mp3`).

## The lines

Frames are absolute film frames at 30 fps; a beat is 20 frames. **Bold** marks the stressed syllables that fall near the beats. "Ends by" is the last frame the clip may run to before it would overlap the next line or a camera move that needs quiet.

| Clip | Starts (beat, frame) | Ends by | Text (exactly as the storyboard) | With the picture |
|---|---|---|---|---|
| N1a | beat 1, F0020 | F0150 | **Real** work in the **mid**dle: a **work**er, a **site**, a **risk** owner. | "a worker" as the worker lands (F0080 to F0100), then the site (F0104) and the risk owner (F0128) |
| N1b | beat 8, F0160 | F0236 | **Pri**ora **pla**ces **a**gents a**round** it. | Priora appears (F0152), the five agents arrive (F0176 to F0204) |
| W1 | beat 14, F0280 | F0490 | Hey, the **brack**et by the **pack**ing line has **cracked** again. We're **go**ing to **weld** it be**fore** the **night** shift. | the worker's own voice, the waveform and words grow with it |
| N2 | beat 25, F0500 | F0620 | **Pri**ora **hears** the **job**, and **asks** for a **pho**to. | "a photo" just before the request appears (F0596) |
| N3a | beat 38, F0760 | F0899 | **Next**, it **sum**mons **on**ly the **spe**cialists this **site** and **job** need. | the summons begin (F0782) |
| N3b | beat 50, F1000 | F1100 | **Each checks** its own con**di**tions and re**ports back**. | the checks (F1016 to F1084) |
| N4a | beat 60, F1200 | F1270 | When **ev**erything **holds**, the **route o**pens. | "holds" as the ring locks (F1234), "the route opens" as it draws (F1244) |
| N4b | beat 64, F1280 | F1420 | **Work** goes **on**, the **rec**ord is **kept**, no one is dis**turbed**. | the spark (F1292), the record mark (F1322), NO ONE DISTURBED (F1346) |
| N5a | beat 72, F1440 | F1560 | One con**di**tion **slips**: the **fire** watch is **half** the **pol**icy. | "slips" as the arc loosens (F1440), then the two rulers (F1470 to F1514) |
| N5b | beat 80, F1600 | F1660 | **Pri**ora **brings** it to the **risk** owner. | the packet is carried to the desk (F1584 to F1644) |
| N5c | beat 84, F1680 | F1760 | **A**gents pre**pare**, the **hu**man de**cides**. | the black line has closed round the packet; the rooms begin to print |
| N6Ra | beat 89, F1780 | F1850 | Re**tain** is **nev**er a de**fault**. | the camera arrives at Retain |
| N6Rb | beat 93, F1860 | F1940 | **Risk** is kept on **pur**pose, with its **terms** ex**plic**it. | the four terms appear (F1892 to F1906) |
| N6M | beat 100, F2000 | F2150 | **Mit**igate com**pares** **safe**guards, and **checks** whether the **work** is back in**side**. | "back inside" with BACK INSIDE (F2134) |
| N6T | beat 110, F2200 | F2350 | **Trans**fer, **sim**ulated for **now**, asks **out**side ca**pa**city for **terms** and a **price**. | "terms and a price" with the returning answers (F2286 to F2298) |
| N7a | beat 118, F2360 | F2440 | **Pri**ora **car**ries the **case** be**tween rooms**. | the packet visits the doorways |
| N7b | beat 123, F2460 | F2530 | The **risk** owner **stays** in con**trol**. | "control" as the black line closes (F2465 to F2485) |
| N8 | beat 132, F2640 | F2800 | **Pri**ora **turns phys**ical **work** into ex**plic**it **risk** de**ci**sions, while the **work hap**pens. | the closing statement (F2640 to F2808) |

If a recorded clip runs longer than its window, the picture waits for the voice: the following beats move later by whole beats, and the film grows by the same amount. If it runs shorter, the silence after it is simply longer.

## Music

One instrumental bed at **90 BPM**, generated with ElevenLabs Music and then cut on bar lines (one bar is 80 frames) to fit the film:

> Calm, intimate instrumental at 90 BPM, 4/4, for a thoughtful product film. Felt piano and soft muted mallets over a low warm pad, with a dry wooden tick on some beats. Sparse and restrained; no drums, no build-ups, no big drops. It opens almost empty, settles into a gentle repeating pattern, warms into one sustained chord, thins to leave a small unresolved space, then resolves softly and ends nearly silent.

Where it changes, on bar lines (from `sound cues.md`): the pattern begins under the assembled case (bar 8, F0640); the warmer sustained chord as the route opens (bar 16, F1280); the unresolved space as the condition slips (bar 18, F1440); the interval settles when the black line closes (bar 31, F2480); the soft resolution from bar 33 (F2640); near silence from F2824.

## Sound effects

ElevenLabs Sound Effects, one short sound each, placed on the frames in `sound cues.md`: a soft paper contact; a dry wooden tick; a fine plucked thread; a muted felt landing; a soft card landing on paper; a faint, local welding crackle (looping, very quiet); a soft, clear bell-like tone for the ring locking; a low wooden note for the human line.

## Mix

Narration in front and centred; the worker's voice note through a telephone band (about 300 to 3400 Hz) with a little room; music about 18 dB under the voice and ducked a further 4 dB while anyone speaks; effects quiet and close. Loudness about -16 LUFS integrated with peaks under -1 dBTP, so it plays well online.
