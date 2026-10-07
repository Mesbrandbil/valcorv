/*
  camera.js: the one camera track of the film (owner: the director).

  [cx, cy, w] in world units; the frame height is w * 9 / 16. 1920 is the whole sheet.
  Moves are chained: each starts from the previous rect. Between moves the camera holds
  perfectly still (cut 2: slow drifts made hairlines and small type step by a pixel).
  Section builders read the camera with PK.cam.rectAt(t), PK.cam.zoomAt(t) and
  PK.cam.px(t, screenPx) and never move it themselves.

  Rule: a camera move never overlaps a movement the viewer must read. Moves are short
  (1.0 to 1.3 s) and happen between beats.
*/
(function () {
  var D = "sine.inOut"; // the opening push
  var M = "power2.inOut"; // moves
  PK.cam.keys = {
    start: [960, 652, 900],
    moves: [
      // s1 the real world: one slow push while the forms print
      { t0: 0.0, t1: 7.6, to: [960, 646, 862], ease: D },
      // s2 voice note and case (Priora's flight from the orbit rides this move)
      { t0: 7.6, t1: 8.6, to: [950, 548, 980], ease: M },
      // s3 the site panel (Priora carries the case to the door during this move); held through s3
      { t0: 22.3, t1: 23.9, to: [540, 514, 1090], ease: M },
      // s4 inside the conditions: the route starts on "opens" in the still close frame; the camera pulls out
      // after it, following the route to the real world
      { t0: 40.35, t1: 41.25, to: [700, 560, 1300], ease: M },
      // s5 a deviation: back to the panel, with the site window still in frame
      { t0: 46.9, t1: 48.1, to: [540, 514, 1090], ease: M },
      // assemble happens in this still frame; the pan right follows the packet to the risk owner,
      // and the decision is held in the still frame it lands on (owner and packet larger than in cut 2)
      { t0: 53.35, t1: 54.35, to: [930, 600, 1020], ease: M },
      // the decision holds still; then the rooms
      { t0: 56.95, t1: 57.95, to: [1420, 515, 1060], ease: M },
      // s6 the three rooms, each held still
      { t0: 59.2, t1: 60.2, to: [1475, 330, 760], ease: M },
      { t0: 66.1, t1: 67.0, to: [1475, 508, 760], ease: M },
      { t0: 71.3, t1: 72.2, to: [1475, 686, 760], ease: M },
      // s7 the rooms cooperate
      { t0: 77.85, t1: 78.95, to: [1420, 515, 1170], ease: M },
      // s8 the complete system, 1:1
      { t0: 83.3, t1: 84.5, to: [960, 540, 1920], ease: M },
    ],
  };
})();
