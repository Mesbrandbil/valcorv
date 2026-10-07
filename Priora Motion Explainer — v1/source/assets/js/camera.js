/*
  camera.js: the one camera track of the film (owner: the director).

  [cx, cy, w] in world units; the frame height is w * 9 / 16. 1920 is the whole sheet.
  Moves are chained: each starts from the previous rect. Section builders read the
  camera with PK.cam.rectAt(t), PK.cam.zoomAt(t) and PK.cam.px(t, screenPx) and never
  move it themselves. To change a shot, change it here and re-check the neighbours.
*/
(function () {
  var D = "sine.inOut"; // drifts
  var M = "power2.inOut"; // moves
  PK.cam.keys = {
    start: [960, 652, 900],
    moves: [
      // s1 the real world: a slow push
      { t0: 0.0, t1: 7.7, to: [960, 646, 862], ease: D },
      // s2 voice note and case
      { t0: 7.7, t1: 9.3, to: [945, 562, 930], ease: M },
      { t0: 9.3, t1: 21.6, to: [950, 558, 905], ease: D },
      // s3 the site panel
      { t0: 21.7, t1: 23.6, to: [560, 500, 1060], ease: M },
      { t0: 23.6, t1: 29.3, to: [548, 505, 1020], ease: D },
      { t0: 29.3, t1: 30.8, to: [425, 512, 860], ease: M },
      { t0: 30.8, t1: 40.3, to: [420, 514, 846], ease: D },
      // s4 inside the conditions: the route to the real world
      { t0: 40.3, t1: 42.2, to: [700, 560, 1300], ease: M },
      { t0: 42.2, t1: 46.8, to: [706, 562, 1282], ease: D },
      // s5 a deviation, the packet, escalation
      { t0: 46.9, t1: 48.2, to: [430, 520, 900], ease: M },
      { t0: 48.2, t1: 52.2, to: [432, 520, 884], ease: D },
      { t0: 52.2, t1: 54.4, to: [920, 560, 1340], ease: M },
      { t0: 54.4, t1: 55.8, to: [926, 560, 1322], ease: D },
      // s6 three decision rooms
      { t0: 55.8, t1: 57.6, to: [1420, 510, 1060], ease: M },
      { t0: 57.6, t1: 59.2, to: [1422, 510, 1048], ease: D },
      { t0: 59.2, t1: 60.4, to: [1530, 330, 640], ease: M },
      { t0: 60.4, t1: 65.8, to: [1532, 330, 624], ease: D },
      { t0: 65.8, t1: 66.8, to: [1530, 508, 640], ease: M },
      { t0: 66.8, t1: 71.6, to: [1532, 508, 624], ease: D },
      { t0: 71.6, t1: 72.6, to: [1530, 686, 640], ease: M },
      { t0: 72.6, t1: 77.2, to: [1532, 686, 624], ease: D },
      // s7 the rooms cooperate
      { t0: 77.2, t1: 78.8, to: [1360, 510, 1180], ease: M },
      { t0: 78.8, t1: 82.8, to: [1364, 510, 1162], ease: D },
      // s8 the complete system
      { t0: 82.8, t1: 84.6, to: [960, 540, 1920], ease: M },
    ],
  };
})();
