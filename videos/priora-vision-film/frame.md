---
name: Priora vision film
format: 1920x1080
fps: 30
colors:
  paper: "#F5F3EE"
  paper-2: "#EFECE5"
  paper-3: "#EAE6DD"
  paper-hi: "#FBFAF7"
  ink: "#111111"
  ink-2: "#2A2A2A"
  charcoal: "#34332F"
  graphite: "#3B3A36"
  grey-1: "#5E5D59"
  grey-2: "#6A6863"
  grey-3: "#9C9994"
  grey-4: "#A9A6A0"
  rule: "#CFCBC3"
  rule-soft: "#E1DCD1"
  signal: "#1F47D6"
  signal-ink: "#1838A8"
  signal-soft: "#DCE2F5"
typography:
  sans: "IBM Plex Sans"
  mono: "IBM Plex Mono"
  weights:
    sans: [300, 400, 500, 600]
    mono: [400, 500, 600]
  scale:
    statement: "300, 88 to 104px, line-height 1.08, tracking -0.02em"
    heading: "400, 56 to 64px, line-height 1.12, tracking -0.015em"
    ui-body: "400, 24 to 30px"
    label: "IBM Plex Mono 500, 16 to 20px, uppercase, tracking 0.12em"
    metadata: "IBM Plex Mono 400, 14 to 16px, decorative only, never required reading"
    minimum-readable: "18px"
corners: "0 to 2px on drawing elements; the interface keeps the demo's own radii (cards 10 to 12px, chips 2 to 4px)"
depth: "flat. No shadows except the demo interface's own card shadow, softened for video. No gradients, no glass, no glow."
lines:
  pencil: "graphite #3B3A36, 1.2 to 1.8px, slight jitter and overdraw, construction overshoot 4 to 10px"
  precise: "ink #111111, 1 to 1.5px at 1080p (hairlines scaled so they survive H.264)"
  signal: "cobalt #1F47D6, 2px, used only for a live connection, a changed condition, or a decision state"
motion:
  default-ease: "power2.inOut for camera, power3.out for entrances, expo.out for snaps into precision"
  banned: "bounce, elastic, back overshoot on UI, glitch, template zooms, gratuitous parallax, infinite loops"
---

# Priora vision film: frame spec

## Overview

One drawing, told twice. Act I is an architectural working drawing of the Nordhavn Bioprocessing site made by capable people: graphite linework, slightly imperfect, overlapping, translated from hand to hand. Acts II and III are the same drawing made precise: the lines align, the typography resolves, the relationships become explicit, and the drawing is revealed to be the Priora interface. Stay in one visual universe from first frame to last.

## The frame

- Ground: warm paper #F5F3EE with a subtle static grain and a very faint vignette. Never pure white, never dark.
- Registration marks and fine rules at the frame edges give depth. Time codes and evidence metadata are set in IBM Plex Mono.
- Safe area: keep required reading inside 96px from every edge.

## Colour doctrine

About 90 percent paper, 9 percent ink and greys, at most 1 to 3 percent signal blue. Blue means exactly one of three things: a live connection being traced, a condition that changed, or a decision state. If a shot uses blue for any other reason, it is wrong. Act I contains no blue at all.

## Typography

IBM Plex Sans and IBM Plex Mono only, self hosted from assets/fonts. Statements in Sans Light. Every figure, time, id and label in Mono. Sentence case for statements; uppercase only for labels and tier words. No exclamation marks.

## Composition rules

- Lead the eye: one focal element, one supporting element, fine metadata as the third layer.
- Hold frames. Alternate dense passages with still ones. The boundary crossing and the final chain get silence and screen time.
- Interface shots are composed, not screen-recorded: components at 1.4x to 1.8x the demo's size for close-ups; wide system views enlarge text so nothing meant to be read is under 18px.

## Do not

Stock footage, generic factories, glossy 3D, cartoon people, whiteboard hands, neon on black, purple or cyan gradients, glassmorphism, identical rounded SaaS card grids, dashboards unrelated to the demo, flames, disasters, frightened people, handshakes, shields, locks, floating documents with drop shadows, future calendar dates, the word "uninsured", any retired product name.
