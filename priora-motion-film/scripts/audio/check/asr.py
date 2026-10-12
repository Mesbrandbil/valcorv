"""Transcribes audio with NVIDIA Parakeet TDT 0.6b v2 (CC-BY-4.0) through sherpa-onnx, for checking the narration.
Prints JSON: the text and the words with start and end seconds. Its word starts tend to read up to about 0.2 s
early, and over inputs longer than about 15 s it can drop words, so callers transcribe short pieces.

Usage: python -I asr.py <audio file> [offset seconds] [duration seconds]
The model folder is PRIORA_ASR_MODEL, or ~/.cache/priora/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8
(scripts/audio/setup-tools.sh downloads it there)."""
import json, subprocess, sys, os
import numpy as np
import sherpa_onnx

M = os.environ.get('PRIORA_ASR_MODEL') or os.path.expanduser('~/.cache/priora/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8')
_rec = None
def recognizer():
    global _rec
    if _rec is None:
        _rec = sherpa_onnx.OfflineRecognizer.from_transducer(
            encoder=f'{M}/encoder.int8.onnx', decoder=f'{M}/decoder.int8.onnx', joiner=f'{M}/joiner.int8.onnx',
            tokens=f'{M}/tokens.txt', model_type='nemo_transducer', num_threads=4)
    return _rec

def load(path, offset=0.0, duration=None):
    cmd = ['ffmpeg', '-nostdin', '-v', 'error', '-ss', str(offset), '-i', path]
    if duration: cmd += ['-t', str(duration)]
    cmd += ['-ac', '1', '-ar', '16000', '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, dtype=np.float32)

def transcribe(path, offset=0.0, duration=None):
    x = load(path, offset, duration)
    s = recognizer().create_stream()
    s.accept_waveform(16000, x)
    recognizer().decode_stream(s)
    r = s.result
    words = []
    toks, ts = list(r.tokens), list(r.timestamps)
    durs = list(getattr(r, 'durations', []) or [])
    for i, (t, at) in enumerate(zip(toks, ts)):
        end = at + (durs[i] if i < len(durs) and durs[i] > 0 else 0.08)
        if t.startswith('▁') or t.startswith(' ') or not words:
            words.append({'w': t.lstrip('▁ '), 'start': at + offset, 'end': end + offset})
        else:
            words[-1]['w'] += t
            words[-1]['end'] = end + offset
    words = [w for w in words if w['w']]
    return {'text': r.text.strip(), 'words': words}

if __name__ == '__main__':
    a = sys.argv[1:]
    print(json.dumps(transcribe(a[0], float(a[1]) if len(a) > 1 else 0.0, float(a[2]) if len(a) > 2 else None), indent=1))
