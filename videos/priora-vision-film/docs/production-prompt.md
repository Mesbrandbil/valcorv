# Claude Code production prompt — Priora vision film

Build a finished, premium, website-embeddable vision film for **Priora**, the product made by Valcorv.

Work autonomously from this prompt. Do not stop after a plan or storyboard. Carry the project through voice generation, animation, sound design, rendering, and verification. Ask only if a genuinely required credential is missing and cannot be accessed from the environment.

## Read these sources before doing anything else

Treat the following files as authoritative, in this order:

1. `VISION.md` — the current company and product source of truth.
2. `STATUS.md` — what exists today versus what remains conceptual.
3. `01 Product/Capture engine.md` — current capture workflow and product boundaries.
4. `01 Product/Hot work workflow.md` — the hot-work wedge, conditions, and evidence model.
5. `priora-end-state-demo.html` — the visual destination and conceptual end-state interface.
6. `Priora vision film treatment.md` — useful background, but this prompt supersedes its earlier linear structure wherever the two disagree.

Older archived strategy must not override the current source-of-truth files. Priora is the product. Valcorv is the company. Do not reintroduce retired product names.

## Deliverable

Create a polished **16:9, 1920×1080, 30 fps** launch film with a locked target runtime of **90 seconds**. An 88–94 second final cut is acceptable if required by the natural ElevenLabs performance; do not let it drift toward two minutes. The film must be suitable for embedding on a company website and showing privately to customers, partners, carriers, investors, and prospective team members.

Use **HyperFrames** as the production framework. Follow the installed HyperFrames skills and project contracts rather than inventing a parallel video framework. Create the film in a new, clearly named project directory. Do not destructively edit `priora-end-state-demo.html`; preserve it as source material and create any film-specific adaptation or theme override separately.

Final deliverables:

- Finished H.264 MP4 suitable for web embedding.
- WebM if the render pipeline supports it cleanly.
- Complete HyperFrames source project.
- Final narration script and ElevenLabs audio.
- Word- or sentence-level narration timing data used by the animation.
- Mixed master audio and separated voice, music, and sound-effect stems.
- Storyboard or shot-plan document matching the finished cut.
- A contact sheet or representative stills for visual verification.

Do not return placeholders, pseudo-code, an unfinished storyboard, or a silent animation. Finish the film.

## The one idea

**Today, the gap between physical work and insurance conditions is often discovered afterwards. Priora makes the connection live, so the decision exists when the risk changes.**

The film must make this understandable to a normal intelligent viewer who knows nothing about Valcorv, Priora, industrial insurance, or hot work.

By the first 20 seconds, the viewer must understand that this is for industrial sites, HSE teams, risk owners, operations leaders, and the people responsible when physical work changes risk.

By the end, the viewer should be able to say:

> Priora connects live physical activity to the conditions under which risk has been accepted. Today that creates prevention and proof. Over time it can turn a change in risk into an explicit decision, price, and connection to capacity.

## Narrative structure: the same site twice

Tell one continuous story on the fictional **Nordhavn Bioprocessing** site. We experience the site first without Priora, then rewind to the critical moment and replay it with Priora.

### Act I — The world today

The site wakes up. Contractors arrive. Maintenance, inspections, lifting, electrical work, production work, and hot work begin across the facility.

The company is insured and takes risk seriously. Show competent HSE and operational teams reading policy documents, translating conditions into procedures, permits, training, briefings, site walks, and checklists. Do not caricature them as careless or incompetent.

The problem is structural: the site changes faster than any person or static process can continuously connect every activity, contractor, location, safeguard, and policy condition.

Follow one hot-work activity on Roof 03. Everything initially appears correct. Elsewhere, Sprinkler Zone 3 is taken offline while the hot work continues. Nothing visibly dramatic happens. No one sees the relationship. The work has quietly moved outside one of the conditions under which the risk was accepted.

Later, imply that something has gone wrong. Keep this restrained; do not create disaster spectacle. Now the company must reconstruct the past from policy language, forms, photos, timestamps, permits, calls, and memories. Only afterwards does it discover that its insurance position may have changed earlier.

Do **not** state categorically that there is no coverage. A failed condition can affect a deductible, terms, cover, or another economic consequence. Use language such as “the insurance position may have changed” or “the activity moved outside the accepted conditions.”

Land the idea:

**Today, the gap is often discovered afterwards.**

### Signature transition — Rewind

Make the rewind the film’s signature visual and sonic moment.

The evidence fragments, phone calls, checklists, site movements, and drawn lines reverse through themselves. Sound falls away, then travels backward with the image. Return precisely to the instant before Sprinkler Zone 3 went offline.

The film then restarts from the activity creator’s perspective.

### Act II — Priora today: prevention and proof

The worker speaks naturally:

> “I’m welding on Roof 03 until six.”

Priora understands the activity, location, and time window. It connects the activity to the relevant conditions in the site’s insurance programme and operational rules. It checks the worker’s certificate and surfaces the safeguards and evidence required for this job. Show the hot-work example concretely: certificate, fire watch, clear area, extinguishing equipment, and active sprinkler protection.

The worker does not begin with policy language, duplicate paperwork, or a generic checklist. Priora translates the activity into the conditions that matter and creates the record where and when the work happens.

Show the two immediate product outcomes clearly:

- **Prevention:** the relevant conditions are surfaced and checked before and during the work.
- **Proof:** the organisation receives a trustworthy, time- and place-linked record of what was true, who acted, and what evidence existed.

Let this value land before moving into the future vision. The film must work even for a viewer who does not believe in dynamic insurance pricing yet.

### Act III — What trusted state makes possible

Sprinkler Zone 3 goes offline again.

This time Priora sees the relationship immediately. The hot-work activity moves visibly outside the accepted envelope. The product does not default to a hard stop and does not make the decision for the user.

Show three choices belonging to the risk owner:

1. **Change the activity** — restore the protection, add a safeguard, relocate, or postpone until the activity returns inside the accepted conditions.
2. **Retain the incremental risk** — knowingly own the exposure for a named duration, with the decision-maker and rationale recorded. Treat this as a legitimate choice only where appropriate and configured, not as a casual invitation to ignore safety.
3. **Eventually transfer the risk** — package the trusted observed state and share it with a selected group of carriers. Carriers apply their own appetite, return their own terms and prices, and the risk owner chooses. Priora does not invent actuarial prices, rank carriers, or replace the annual programme.

Show any temporary capacity as a precise layer **alongside** the annual insurance programme, not as thousands of disconnected replacement policies.

Pull back to the whole site. Most activities remain inside the accepted envelope and pass quietly. A few become explicit decisions. Each important event joins the trusted record.

End on:

**RECORD → TRUST → DECISION → PRICE → CAPACITY**

Then:

**Priora**  
**Infrastructure for activity-level physical risk**

Include a restrained qualifier in the closing frame:

> Conceptual future-state demonstration. Risk transfer, carrier quotes, prices, people, carriers, and the Nordhavn site are illustrative. Priora today focuses on prevention and proof.

## Visual direction

The film should feel like a premium Silicon Valley product launch: the technical intelligence and momentum of Stripe or Linear, with Apple-like restraint, clarity, and emotional pacing. Do not imitate any company’s exact graphics, trademarks, or film. Use those references only for production quality and attitude.

### Core visual system

- Warm paper background, based on the existing HTML’s `#F5F3EE` family.
- Ink-black and warm charcoal linework.
- A restrained **cobalt/electric blue** signal colour. Replace the HTML demo’s orange signal treatment in the film adaptation without destructively changing the original source file.
- Use one considered blue family; avoid generic cyan, purple gradients, or neon glow.
- Retain the existing HTML’s IBM Plex Sans and IBM Plex Mono typography unless a direct film need justifies a tightly controlled supporting face.
- Fine technical rules, registration marks, time codes, evidence metadata, and spatial diagrams should provide depth without becoming decoration for its own sake.

### The drawing language

The opening is animated linework, but it must not look like a playful whiteboard explainer, cartoon, or hand-drawn corporate training film. Think sophisticated architectural working drawing, technical editorial illustration, and forensic reconstruction.

Before Priora:

- Lines are human, slightly imperfect, overlapping, and visibly translated from one person or document to another.
- The policy becomes a procedure, the procedure becomes a checklist, the checklist becomes a briefing, and the connection weakens across each handoff.
- The site grows faster than the HSE team can visually contain it.
- Evidence fragments accumulate after the incident and begin to crowd the frame.

With Priora:

- Stay in the same visual universe.
- The rough lines become precise rather than switching to an unrelated design style.
- Geometry aligns, typography resolves, relationships become explicit, and the drawing naturally transforms into the actual Priora end-state interface.
- Blue is used meaningfully: to trace a live connection, identify a changed condition, or mark a decision state. Do not spray it across every scene.

### Product presentation

The HTML interface is the film’s destination, not a late dashboard cutaway.

Use `priora-end-state-demo.html` as the basis for genuine product hero shots. Adapt it for video scale: enlarge text and critical elements for 1080p viewing, control information density, and compose deliberate close-ups and wide system views. Do not merely screen-record the demo at desktop scale.

The transition from drawing to product must feel inevitable: the same site lines, envelope, nodes, and conditions should become the interface’s precise geometry.

Use the accepted risk envelope as a recurring visual metaphor. The moment the hot-work node stretches and crosses that boundary is the primary product reveal.

### Motion and pacing

- Quiet confidence at the opening.
- Accelerating system complexity as the site comes alive.
- Controlled tension when the condition changes unnoticed.
- A brief, emotionally legible aftermath and reconstruction.
- A decisive, elegant rewind.
- Sudden clarity as Priora reconnects activity, condition, and evidence.
- Momentum through the three decision paths.
- A calm, inevitable close.

Avoid constant motion. Alternate dense sequences with held frames. Give the boundary crossing and the final chain enough silence and screen time to register.

Use cinematic camera moves through the drawn site and the product interface: measured pushes, macro close-ups, lateral reveals, and precise reframing. Avoid template zooms, gratuitous parallax, glitch transitions, bouncy easing, or feature-card carousels.

### Explicit visual exclusions

Do not use:

- Stock footage.
- Generic factories generated only as background spectacle.
- Glossy 3D objects.
- Cartoon people or whiteboard-animation hands.
- Neon-on-black “AI” aesthetics.
- Purple-blue gradients.
- Glassmorphism.
- Identical rounded SaaS card grids.
- Fake dashboards unrelated to the supplied HTML.
- Flames, disasters, or frightened people as emotional shortcuts.
- Handshake imagery, shields, locks, floating documents, or other insurance clichés.

## Narration and ElevenLabs

Use **ElevenLabs** to generate the finished voice-over.

Voice direction:

- Female.
- Clear international British English.
- Warm, intelligent, composed, and credible.
- Calm authority without sounding aristocratic, theatrical, breathy, sentimental, or like a commercial announcer.
- Natural conversational cadence with deliberate pauses around the condition failure, rewind, and final chain.
- Underplay the vision. Confidence should come from precision, not hype.

Use an available ElevenLabs integration or the current official API/CLI supported by the environment. Do not fabricate successful generation. If credentials are genuinely unavailable, stop only for that credential; otherwise select the best matching voice and proceed.

Generate timing metadata and make the edit follow the actual spoken performance. Do not animate against estimated reading time and replace the voice later.

### Narration script

Use the following as the locked narrative substance. You may make small edits for breath, timing, and natural British delivery, but do not change the argument, add claims, or turn it into marketing hype.

> Every industrial site changes by the hour.
>
> Contractors arrive. Equipment is isolated. Work moves.
>
> Insurance sets conditions under which risk is accepted.
>
> Good teams translate them into permits, briefings and checklists.
>
> But no one can hold a moving site in their head.
>
> On Roof 03, hot work begins. The certificate and safeguards are in place.
>
> Then a sprinkler zone goes offline.
>
> Nothing looks different. Work continues. But the conditions have changed, and nobody sees it.
>
> If something goes wrong, questions begin afterwards:
>
> What was happening? Which condition applied? Can you prove what was true?
>
> Today, the gap is often discovered too late.
>
> What if the decision existed when the risk changed?
>
> “I’m welding on Roof 03 until six.”
>
> Priora connects the activity to the conditions that matter, verifies the certificate and safeguards, and creates the record while work happens.
>
> Prevention before the work. Proof as it happens.
>
> When the sprinkler goes offline again, Priora sees it immediately.
>
> Now the risk owner can change the activity, knowingly retain the exposure, or eventually ask selected carriers whether they will cover it.
>
> Most work remains ordinary. A few changes become explicit decisions.
>
> Record becomes trust. Trust enables decisions. Decisions can carry price. Price can connect to capacity.
>
> Priora. Infrastructure for activity-level physical risk.

The spoken worker declaration may use a subtly different close-mic treatment from the narrator, but it should still be generated or recorded cleanly and sound like a real worker rather than an actor performing a slogan.

## Suggested shot and timing spine

Treat these as target beats, then adjust to the real ElevenLabs performance while preserving the total runtime and narrative proportions.

1. **0:00–0:07 — Site wakes up.** One continuous technical drawing establishes an industrial site, people, contractors, and activity. Make the intended audience clear without naming job titles in a list.
2. **0:07–0:17 — Insurance becomes workflow.** A policy and its conditions transform through HSE procedures, permits, briefings, and checklists. Show competence and effort.
3. **0:17–0:27 — Complexity outruns translation.** The site expands into concurrent activity. Follow hot work on Roof 03 while other conditions and systems change elsewhere.
4. **0:27–0:34 — Invisible crossing.** Sprinkler Zone 3 goes offline. The hot-work activity quietly leaves the accepted envelope, but the present-day organisation does not see it.
5. **0:34–0:42 — Afterwards.** Restraint, then forensic reconstruction. Policy, proof, timestamps, calls, and uncertainty crowd the page. Land “the gap is often discovered too late.”
6. **0:42–0:47 — Rewind.** Signature reverse sequence to the moment before the condition changed. Use silence and reverse sound design.
7. **0:47–0:58 — Speak the activity.** The worker’s declaration creates the activity. Priora identifies the relevant conditions and begins verifying the record.
8. **0:58–1:08 — Prevention and proof.** Certificate, fire watch, clear area, extinguisher, and sprinkler protection resolve. Let “Prevention before the work. Proof as it happens.” stand clearly.
9. **1:08–1:16 — Priora sees the change.** The sprinkler goes offline again. This time the node visibly stretches and crosses the envelope. The decision arrives while action is still possible.
10. **1:16–1:24 — Change, retain, transfer.** Show the three choices without implying Priora decides or that transfer exists today. Change should appear as the most ordinary resolution; retain is owned and time-bound; transfer is labelled future state.
11. **1:24–1:30 — Whole-site end state.** Pull back to the living site and build `RECORD → TRUST → DECISION → PRICE → CAPACITY`, then close on the Priora mark and descriptor. If the final voice performance lands slightly under 90 seconds, preserve the final hold rather than padding earlier scenes.

## Sound and music

Sound design is essential to the premium launch-film feel.

- Begin with a sparse industrial atmosphere: ventilation, distant machinery, a radio click, footsteps, paper, pencil, and restrained site texture.
- Give drawing actions tactile but elegant sound—graphite, technical pen, paper movement, ruler contact—not whimsical scribbling.
- As the site becomes complex, build a quiet rhythmic system from operational sounds rather than using a generic corporate beat.
- At the unnoticed condition failure, remove part of the sound bed instead of adding a dramatic alarm.
- Make the rewind distinctive: reversed paper, mechanical state changes, and a controlled suction of the ambience.
- With Priora, introduce greater rhythmic clarity and precise confirmation sounds. Avoid notification pings that make the product feel like a mobile app demo.
- Use a restrained modern score beneath the narration. It should support momentum and emotional resolution without becoming inspirational corporate music.
- Carve and duck the music beneath the voice. Preserve intelligibility and natural dynamics.
- The final chain should have five quiet, materially distinct sonic confirmations, resolving into one clean mechanical latch under the Priora mark.

## Claim and product guardrails

- Priora sells **prevention and proof today**.
- Speech intake, live condition mapping, automatic deviation recognition, retain/transfer flows, carrier quotes, pricing, and capacity are conceptual or designed future state unless current sources explicitly establish otherwise.
- Do not promise savings, guaranteed cover, instant binding, or automatic claim acceptance.
- Do not say policies are deliberately written to benefit insurers.
- Do not imply HSE teams are failing, unnecessary, or replaced by Priora.
- Do not say a failed condition automatically means “uninsured.”
- Do not present Priora as the actuarial pricing engine. Carriers bring appetite, pricing logic, and capital; Priora supplies trusted observed state.
- Do not present Priora as replacing annual insurance programmes.
- Do not use real customer, carrier, or employee claims without explicit source support. Nordhavn Bioprocessing, all people, carriers, quotes, and prices are fictional.
- Do not put a future calendar date in the film.

## Production process and quality bar

1. Inspect the source files and the existing HTML demo.
2. Create the HyperFrames project and write the storyboard/shot plan.
3. Produce or adapt the film design system using the visual direction above.
4. Generate the ElevenLabs narration early, capture timings, and lock the edit to the real performance.
5. Build the animated drawing world, signature rewind, and product-interface transformation.
6. Adapt the Priora HTML into deliberate video-scale compositions; do not use a raw desktop recording.
7. Add music and sound design, with voice-aware mixing.
8. Render representative frames from every major beat and inspect them for hierarchy, text size, contrast, continuity, and brand consistency.
9. Validate the HyperFrames project and fix all errors.
10. Render the complete film.
11. Watch the full output with audio. Verify that the story is understandable without prior knowledge and that current product versus future state is clear.
12. Deliver the final files and a short factual summary of what was produced, including runtime and any unavoidable limitation.

The film should feel inevitable, not explanatory: a broken connection is drawn, Priora restores it, and the restored connection opens the path from record to capacity.
