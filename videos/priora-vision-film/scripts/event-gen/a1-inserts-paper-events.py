# Generates compositions/a1-inserts.events.json and a1-paper.events.json from the same timing
# rules the scenes use (92 BPM grid, shared cut rule), anchored to the nearest narration cue.
import json, math, sys, os
T = sys.argv[1]
R = json.load(open(os.path.join(T, 'cues/resolved.json')))
C = R['cues']
L = json.load(open(os.path.join(T, 'narration/timing.json')))['lines']
BEAT = 60 / 92
def word(line, w, which='start', occ=1):
    ws = L[line]['words']
    n = 0
    for x in ws:
        if x['w'].strip('.,:;?!').lower() == w.lower():
            n += 1
            if n == occ: return x[which]
    raise KeyError(line + ':' + w)
def snap(abs_t, mode='next', sub=1):
    q = BEAT / sub; k = abs_t / q
    k = math.floor(k + 1e-6) if mode == 'prev' else (round(k) if mode == 'near' else math.ceil(k - 1e-6))
    return k * q
def cut(abs_t): return snap(abs_t - 0.12, 'near', 2)
def rel(t, cue):
    off = t - C[cue]
    s = 'cue:' + cue
    if abs(off) >= 0.0005: s += ('+' if off > 0 else '') + ('%.3f' % off)
    return s
def relw(t, line, w, which='start'):
    base = word(line, w, which)
    off = t - base
    s = '%s:%s.%s' % (line, w, which)
    if abs(off) >= 0.0005: s += ('+' if off > 0 else '') + ('%.3f' % off)
    return s
r3 = lambda v: round(v, 3)

# ---------------------------------------------------------------- a1-inserts
L07end = L['L07']['end']
ev = []
lo0, lo1 = cut(C['equipment']), cut(C['workMoves'])
we0, we1 = cut(C['hotWork']), cut(C['certificate'])
sz0, sz1 = cut(C['then']), cut(L07end + 0.25)
tw0 = lo0 + BEAT * 0.25; tw1 = lo0 + BEAT
tagLand = tw1 + 0.03 + 0.24
ev += [
  {"name": "loto-cut-in", "at": rel(lo0, 'equipment'), "kind": "cut", "material": "paper", "gain_db": -12, "what": "S3b: cut to the LOTO valve close-up"},
  {"name": "loto-handwheel", "at": rel(tw0, 'equipment'), "kind": "handwheel", "gain_db": -10, "dur": r3(tw1 - tw0), "what": "a quarter turn, closing"},
  {"name": "loto-tag", "at": rel(tagLand, 'isolated'), "kind": "tick", "gain_db": -12, "what": "the LOTO tag drops on its string and the string goes taut"},
  {"name": "loto-cut-out", "at": rel(lo1, 'workMoves'), "kind": "cut", "material": "paper", "gain_db": -12, "what": "back to the site on 'Work moves'"},
  {"name": "weld-cut-in", "at": rel(we0, 'hotWork'), "kind": "cut", "material": "felt", "gain_db": -12, "what": "S7b: cut to the welder close-up"},
  {"name": "weld-arc", "at": rel(we0, 'hotWork'), "kind": "arc", "gain_db": -16, "dur": r3(we1 - we0), "what": "the arc point flickering while the torch travels along the seam"},
  {"name": "weld-cut-out", "at": rel(we1, 'certificate'), "kind": "cut", "material": "felt", "gain_db": -12, "what": "back to Roof 03 on 'every'"},
  {"name": "sz3-cut-in", "at": rel(sz0, 'then'), "kind": "cut", "material": "paper", "gain_db": -12, "what": "S8a: cut to the Sprinkler Zone 3 control valve"},
  {"name": "sz3-handwheel", "at": rel(C['sprinkler'] - 0.06, 'sprinkler'), "kind": "handwheel", "gain_db": -10, "dur": r3(C['offline'] - (C['sprinkler'] - 0.06)), "what": "the handwheel turns closed over 'sprinkler zone', the rising stem runs in"},
  {"name": "sz3-valve-clunk", "at": rel(C['offline'], 'offline'), "kind": "valve-clunk", "gain_db": -6, "what": "the gate seats on 'offline': muted, mechanical, no alarm"},
  {"name": "sz3-gauge", "at": rel(C['offline'] + 0.3, 'offline'), "kind": "gauge", "gain_db": -12, "dur": r3((C['offline'] + 0.3) - (word('L07', 'goes') + 0.05)), "what": "the needle falls from 7.2 bar on 'goes offline' and ticks on the zero stop (the fall began dur seconds earlier)"},
  {"name": "sz3-cut-out", "at": 'L07.end+%.3f' % (sz1 - L07end), "kind": "cut", "material": "paper", "gain_db": -14, "what": "to the zone 3 roof (S8b)"},
]
ins = {"note": "a1-inserts (S3b, S7b, S8a): the sounds the three close-up inserts make, anchored to the cues the tweens use. Shared cut times follow FL.cutAt (the half beat nearest to 0.12 s before the word); offsets here are those cut times relative to the word under the current narration. The inserts are story-scrubbed: in the rewind the SZ3 insert plays backwards (tag lifts, needle rises, handwheel turns back) inside a1-world's rewind sound; no separate events are declared for the reversal.", "events": ev}
json.dump(ins, open(os.path.join(T, 'compositions/a1-inserts.events.json'), 'w'), indent=2, ensure_ascii=False)

# ---------------------------------------------------------------- a1-paper
acceptedEnd = word('L03', 'accepted', 'end')
tLay = snap(acceptedEnd, 'next', 2); tLaid = tLay + BEAT
tFollow = cut(C['translate']); dFollow = 0.6
Q = lambda t: snap(t, 'near', 4)
tPermit = Q(C['permits'] - 0.25); tBrief = Q(C['briefings'] - 0.2); tCheck = Q(C['checklists'] - 0.2); dWhip = BEAT / 2
tStamp = snap(C['permits'] + 0.1, 'next', 1)
tPull = Q(C['checklists'] + 0.5); dPull = 1.0
tRing = tPull + dPull
tLift = cut(C["noOne"]); dLift = 0.42
pe = [
  {"name": "sheet-lay", "at": relw(tLay, 'L03', 'accepted', 'end'), "kind": "sheet-lay", "gain_db": -9, "dur": r3(tLaid - tLay), "what": "the sheet slides in from the right and lies flat"},
  {"name": "underline", "at": relw(tLaid, 'L03', 'accepted', 'end'), "kind": "ruler", "gain_db": -13, "dur": 0.36, "what": "graphite underline under 'sprinkler protection ... in service'"},
  {"name": "lead-arrow", "at": rel(tFollow, 'translate'), "kind": "pencil", "gain_db": -12, "dur": dFollow, "what": "the underline runs on into an arrow down to the procedure"},
  {"name": "follow", "at": rel(tFollow, 'translate'), "kind": "whip", "gain_db": -20, "dur": dFollow, "what": "the camera follows the arrow to PROCEDURE"},
  {"name": "procedure-line", "at": rel(tFollow + dFollow - 0.2, 'translate'), "kind": "pen", "gain_db": -15, "dur": 0.58, "what": "'Confirm sprinklers in service' written and underlined"},
  {"name": "whip-permit", "at": rel(tPermit, 'permits'), "kind": "whip", "gain_db": -16, "dur": dWhip},
  {"name": "arrow-permit", "at": rel(tPermit - 0.04, 'permits'), "kind": "pencil", "gain_db": -15, "dur": r3(dWhip + 0.05), "what": "solid arrow procedure to permit"},
  {"name": "permit-line", "at": rel(tPermit + dWhip - 0.06, 'permits'), "kind": "pen", "gain_db": -16, "dur": 0.2},
  {"name": "permit-tick", "at": rel(tPermit + dWhip + 0.14, 'permits'), "kind": "tick", "gain_db": -11},
  {"name": "permit-stamp", "at": rel(tStamp, 'permits'), "kind": "stamp", "gain_db": -7, "what": "APPROVED · HSE, on the beat"},
  {"name": "whip-briefing", "at": rel(tBrief, 'briefings'), "kind": "whip", "gain_db": -16, "dur": dWhip},
  {"name": "arrow-briefing", "at": rel(tBrief - 0.04, 'briefings'), "kind": "pencil-scatter", "gain_db": -17, "dur": 0.03, "series": {"count": 10, "every": 0.033}, "what": "dashed arrow permit to briefing"},
  {"name": "briefing-note", "at": rel(tBrief + dWhip - 0.04, 'briefings'), "kind": "pencil", "gain_db": -16, "dur": 0.24, "what": "the speech outline"},
  {"name": "briefing-line", "at": rel(tBrief + dWhip + 0.1, 'briefings'), "kind": "pen", "gain_db": -17, "dur": 0.26, "what": "'sprinklers on', grey"},
  {"name": "whip-checklist", "at": rel(tCheck, 'checklists'), "kind": "whip", "gain_db": -16, "dur": dWhip},
  {"name": "arrow-checklist", "at": rel(tCheck - 0.04, 'checklists'), "kind": "pencil-scatter", "gain_db": -19, "dur": 0.02, "series": {"count": 14, "every": 0.025}, "what": "dotted arrow briefing to checklist"},
  {"name": "checklist-line", "at": rel(tCheck + dWhip - 0.06, 'checklists'), "kind": "pen", "gain_db": -18, "dur": 0.2, "what": "'Sprinklers', pale"},
  {"name": "question-mark", "at": rel(tCheck + dWhip + 0.14, 'checklists'), "kind": "pencil", "gain_db": -13, "dur": 0.18},
  {"name": "pull-back", "at": rel(tPull, 'checklists'), "kind": "pull", "gain_db": -14, "dur": dPull, "what": "the whole sheet: the clause and the four artefacts, the thread thinning across them"},
  {"name": "circle-question", "at": rel(tRing, 'noOne'), "kind": "pencil", "gain_db": -14, "dur": 0.34, "what": "the question mark circled in the hold"},
  {"name": "sheet-lift", "at": rel(tLift, 'noOne'), "kind": "paper-lift", "gain_db": -9, "dur": dLift, "what": "the sheet lifts off to the left, fast and flat, on 'But'"},
]
pap = {"note": "a1-paper (S5): the sounds the sheet makes, anchored to the cues the tweens use. Move starts are snapped to the 92 BPM grid near their words (quarter beats for the whips, the next half beat after 'accepted' for the sheet, the next beat after 'permits' for the stamp); the offsets here are those snapped times relative to the word under the current narration.", "events": pe}
json.dump(pap, open(os.path.join(T, 'compositions/a1-paper.events.json'), 'w'), indent=2, ensure_ascii=False)
print('inserts', [(e['name'], e['at']) for e in ev])
print('paper', [(e['name'], e['at']) for e in pe])
print('abs', dict(tLay=tLay, tFollow=tFollow, tPermit=tPermit, tBrief=tBrief, tCheck=tCheck, tStamp=tStamp, tPull=tPull, tRing=tRing, tLift=tLift, lo=(lo0,lo1), we=(we0,we1), sz=(sz0,sz1)))
