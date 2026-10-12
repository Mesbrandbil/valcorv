#!/usr/bin/env bash
# Installs what the ElevenLabs finish and its checks need, once: a Python environment at .venv-audio with numpy,
# scipy, soundfile, Pillow and sherpa-onnx, and the Parakeet TDT 0.6b v2 recogniser (CC-BY-4.0) in
# ~/.cache/priora (or PRIORA_ASR_MODEL). ffmpeg and node must already be on the PATH.
set -euo pipefail
cd "$(dirname "$0")/../.."
command -v ffmpeg >/dev/null || { echo 'ffmpeg is needed on the PATH'; exit 1; }
[ -x .venv-audio/bin/python ] || python3 -m venv .venv-audio
.venv-audio/bin/pip install -q --disable-pip-version-check numpy scipy soundfile pillow sherpa-onnx
model="${PRIORA_ASR_MODEL:-$HOME/.cache/priora/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8}"
if [ ! -f "$model/tokens.txt" ]; then
  mkdir -p "$(dirname "$model")"
  tmp="$(mktemp -d)"
  curl -sSL -o "$tmp/model.tar.bz2" https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8.tar.bz2
  tar -xjf "$tmp/model.tar.bz2" -C "$(dirname "$model")"
  rm -rf "$tmp"
fi
echo "audio tools ready: .venv-audio, recogniser in $model"
