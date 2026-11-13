#!/usr/bin/env bash
# Sets up one Python environment a model (their requirements clash) and reads John 1 with
# each. Run it from this folder on the machine that will do the work:
#
#   huggingface-cli login          # once; see README.md for the two pages to accept first
#   bash run.sh                    # all three models, the whole chapter
#   bash run.sh parler             # one model
#   VERSES=1-5 bash run.sh         # a short trial
#   THREADS=64 bash run.sh svara   # more processor threads
#
# Anything after the model names goes to compare.py for every model run, for example:
#   bash run.sh f5 -- --ref-audio reader.wav --ref-text "ആദിയിൽ വചനം ഉണ്ടായിരുന്നു"
set -euo pipefail
cd "$(dirname "$0")"

models=()
extra=()
while [ $# -gt 0 ]; do
  if [ "$1" = "--" ]; then shift; extra=("$@"); break; fi
  models+=("$1"); shift
done
[ ${#models[@]} -gt 0 ] || models=(parler svara f5)

# Without a graphics card, the processor-only build of PyTorch is much the smaller download.
if command -v nvidia-smi >/dev/null 2>&1; then torch_index=""; else torch_index="--index-url https://download.pytorch.org/whl/cpu"; fi

setup() {
  local model=$1 env=".venv-$1"
  [ -x "$env/bin/python" ] && return
  echo "== setting up $model"
  python3 -m venv "$env"
  "$env/bin/pip" install --quiet --upgrade pip
  # shellcheck disable=SC2086
  "$env/bin/pip" install --quiet torch torchaudio $torch_index
  case $model in
    parler) "$env/bin/pip" install --quiet numpy sentencepiece git+https://github.com/huggingface/parler-tts.git ;;
    svara)  "$env/bin/pip" install --quiet numpy transformers accelerate snac ;;
    f5)     "$env/bin/pip" install --quiet numpy git+https://github.com/ai4bharat/IndicF5.git ;;
    *) echo "unknown model $model (parler, svara or f5)"; exit 2 ;;
  esac
}

failed=()
for model in "${models[@]}"; do
  setup "$model"
  echo "== reading with $model"
  if ! ".venv-$model/bin/python" compare.py "$model" --verses "${VERSES:-1-51}" --threads "${THREADS:-32}" ${extra[@]+"${extra[@]}"}; then
    failed+=("$model")
    echo "== $model did not finish; going on"
  fi
done

echo
for report in out/*/report.json; do
  [ -f "$report" ] && python3 -c "
import json,sys
r=json.load(open(sys.argv[1]))
print(f\"{r['model']:7s} {r['seconds_of_sound']:7.0f} s of sound, {r['seconds_taken']:7.0f} s taken, {r['times_real_time']} times real time\")" "$report"
done
[ ${#failed[@]} -eq 0 ] || { echo "did not finish: ${failed[*]}"; exit 1; }
