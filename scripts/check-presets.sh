#!/usr/bin/env bash
# Smoke test through the public offline wrapper; retains both runs for inspection.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:?usage: bash scripts/check-presets.sh <output-directory>}"
mkdir -p "$OUT"
OUT="$(cd "$OUT" && pwd)"
for preset in instagram tiktok linkedin generic; do
  extra=()
  case "$preset" in
    instagram) input=tutorial; count=5 ;;
    tiktok) input=educational; count=5 ;;
    linkedin) input=project; count=6 ;;
    generic) input=project; count=6; extra=(--size 1440x1080) ;;
  esac
  for run in first second; do
    bash "$ROOT/scripts/carousel.sh" render "$ROOT/examples/$input.json" --preset "$preset" "${extra[@]}" --out "$OUT/$preset/$run"
  done
  pngs=("$OUT/$preset/first/"*.png)
  test "${#pngs[@]}" -eq "$count"
  test -s "$OUT/$preset/first/carousel.pdf"
  for file in "${pngs[@]}" "$OUT/$preset/first/carousel.pdf"; do
    cmp "$file" "$OUT/$preset/second/$(basename "$file")"
  done
  echo "verified $preset: $count PNGs + PDF; both runs byte-identical"
done
