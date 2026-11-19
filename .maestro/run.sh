#!/usr/bin/env bash
# Runs the flows in this folder one by one against the Malayalam app in a booted iPhone
# simulator (the app installed, Maestro on the PATH), and goes on after a flow fails, so
# one broken screen does not hide the rest. After each flow it keeps a screenshot and the
# list of everything on the screen (what Maestro's selectors see), which is how a
# changed label or an alert's text is read afterwards.
#
#   .maestro/run.sh                 every flow
#   .maestro/run.sh 03-word 06-card some of them (07 follows 06 without a relaunch)
#
# Output goes to $OUT (default maestro-out/): results.txt, screens/, hierarchy/, debug/.
set -u
DIR=$(cd "$(dirname "$0")" && pwd)
OUT=${OUT:-$PWD/maestro-out}
mkdir -p "$OUT/screens" "$OUT/hierarchy" "$OUT/debug" "$OUT/logs"
OUT=$(cd "$OUT" && pwd)
: > "$OUT/results.txt"

flows=()
if [ $# -gt 0 ]; then
  for f in "$@"; do flows+=("$DIR/${f%.yaml}.yaml"); done
else
  for f in "$DIR"/[0-9][0-9]-*.yaml; do flows+=("$f"); done
fi

# The labels on screen, one per line, from `maestro hierarchy` (a JSON tree).
labels() {
  python3 -c '
import json, sys
raw = sys.stdin.read()
try:
    tree = json.loads(raw[raw.index("{"):])
except Exception as e:
    print("(no hierarchy: %s)" % e); sys.exit()
seen = []
def walk(n):
    a = n.get("attributes", {})
    for k in ("accessibilityText", "text", "hintText", "resource-id"):
        v = (a.get(k) or "").strip()
        if v and (k, v) not in seen:
            seen.append((k, v))
    for c in n.get("children", []):
        walk(c)
walk(tree)
for k, v in seen:
    print("%-17s %s" % (k, v.replace("\n", " | ")))
'
}

pass=0
fail=0
for flow in "${flows[@]}"; do
  name=$(basename "$flow" .yaml)
  echo "::group::$name"
  # A hung flow (the app frozen, say) is stopped after seven minutes.
  if (cd "$OUT/screens" && perl -e 'alarm shift; exec @ARGV' 420 \
        maestro test --debug-output "$OUT/debug/$name" "$flow") > "$OUT/logs/$name.txt" 2>&1; then
    result=passed
    pass=$((pass + 1))
  else
    result=FAILED
    fail=$((fail + 1))
  fi
  cat "$OUT/logs/$name.txt"
  # The flow's own screenshots, kept by Maestro with its debug output.
  find "$OUT/debug/$name" -name '*.png' -exec cp {} "$OUT/screens/" \; 2>/dev/null || true
  xcrun simctl io booted screenshot "$OUT/screens/$name-end.png" > /dev/null 2>&1 || true
  perl -e 'alarm shift; exec @ARGV' 120 maestro hierarchy > "$OUT/hierarchy/$name.json" 2> /dev/null || true
  labels < "$OUT/hierarchy/$name.json" > "$OUT/hierarchy/$name.txt"
  echo "--- on screen after $name:"
  head -120 "$OUT/hierarchy/$name.txt"
  echo "::endgroup::"
  # The step that failed, from Maestro's own output.
  why=$(grep -E "FAILED|Assertion is false|not found|Element not found|Timeout|Exception" "$OUT/logs/$name.txt" | grep -v "^\s*$" | head -3 | tr '\n' ' ' | cut -c1-300)
  printf '%-26s %s %s\n' "$name" "$result" "${why:+($why)}" | tee -a "$OUT/results.txt"
done

echo "$pass passed, $fail failed" | tee -a "$OUT/results.txt"
[ "$fail" -eq 0 ]
