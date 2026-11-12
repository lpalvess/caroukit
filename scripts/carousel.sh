#!/usr/bin/env bash
# Runs CarouKit inside a throwaway, locked-down container.
#
#   scripts/carousel.sh setup                                   install dependencies (the only step with network)
#   scripts/carousel.sh validate <slides.json> [--preset <name>] [--size <WIDTHxHEIGHT>]
#   scripts/carousel.sh render   <slides.json> [--out <dir>] [--preset <name>] [--size <WIDTHxHEIGHT>]
#   (presets: instagram, tiktok, linkedin, generic; --size alone means generic)
#   (--facts <file> is deprecated: it only prints a warning and the file is ignored)
#   scripts/carousel.sh selftest                                prove the isolation works
#
# validate and render run with no network, a read-only root filesystem, no Linux
# capabilities, the code mounted read-only, and only the output directory writable.
# Exit codes: 0 done, 1 validation errors, 2 bad arguments or unreadable file,
# 3 render, pdf or write failure, 4 the container could not be started.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Pinned by digest so the base image cannot change underneath you. Override with CAROUSEL_IMAGE.
IMAGE="${CAROUSEL_IMAGE:-oven/bun@sha256:ec06c3b6cea04192ae6770c434f668ca41d343ad19fa6472216c7b48be39c598}"

die() { echo "error: $*" >&2; exit 2; }

command -v docker >/dev/null 2>&1 || { echo "error: docker is required" >&2; exit 4; }

# Absolute path of an existing file or directory. Rejects characters that would break --mount.
abspath() {
  local p="$1"
  case "$p" in *,* | *$'\n'*) die "path contains a comma or newline: $p" ;; esac
  [ -e "$p" ] || die "cannot read $p: not found"
  if [ -d "$p" ]; then (cd "$p" && pwd); else echo "$(cd "$(dirname "$p")" && pwd)/$(basename "$p")"; fi
}

bind() { echo "type=bind,src=$1,dst=$2$3"; }

SECURE=(
  --rm
  --network none
  --read-only
  --cap-drop ALL
  --security-opt no-new-privileges
  --pids-limit 256
  --memory 1g
  --tmpfs /tmp:rw,noexec,nosuid,size=128m
  --user "$(id -u):$(id -g)"
  -e HOME=/tmp
  --workdir /app
)

need_deps() {
  [ -d "$ROOT/node_modules" ] || { echo "error: dependencies are not installed, run: scripts/carousel.sh setup" >&2; exit 2; }
}

cmd="${1:-}"
[ $# -gt 0 ] && shift

case "$cmd" in
  setup)
    # The only step that may use the network. Install scripts stay disabled and the lockfile is frozen.
    exec docker run --rm --cap-drop ALL --security-opt no-new-privileges --user "$(id -u):$(id -g)" \
      -e HOME=/tmp --workdir /app --mount "$(bind "$ROOT" /app "")" "$IMAGE" \
      bun install --frozen-lockfile --ignore-scripts
    ;;

  selftest)
    need_deps
    out="$(mktemp -d)"
    trap 'rm -rf "$out"' EXIT
    docker run "${SECURE[@]}" \
      --mount "$(bind "$ROOT" /app ,readonly)" --mount "$(bind "$out" /out "")" "$IMAGE" \
      bun scripts/selftest.ts
    ;;

  validate | render)
    need_deps
    slides="" facts_given="" out="" preset="" size="" preset_given="" size_given=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --facts)
          # Legacy option: only warns. The value is never read, resolved or mounted, and not forwarded.
          [ $# -ge 2 ] || die "--facts needs a value (deprecated and ignored)"
          case "$2" in --*) die "--facts needs a value (deprecated and ignored), got option: $2" ;; esac
          facts_given=1; shift 2 ;;
        --out)
          [ "$cmd" = render ] || die "--out only works with render"
          [ $# -ge 2 ] || die "--out needs a directory"
          case "$2" in --*) die "--out needs a directory, got option: $2" ;; esac
          out="$2"; shift 2 ;;
        --preset | --size)
          opt="$1"
          [ $# -ge 2 ] || die "$opt needs a value"
          case "$2" in --*) die "$opt needs a value, got option: $2" ;; esac
          if [ "$opt" = --preset ]; then
            [ -z "$preset_given" ] || die "--preset was given more than once"
            preset="$2"; preset_given=1
          else
            [ -z "$size_given" ] || die "--size was given more than once"
            size="$2"; size_given=1
          fi
          shift 2 ;;
        --*) die "unknown option: $1" ;;
        *) [ -z "$slides" ] || die "unexpected argument: $1"; slides="$1"; shift ;;
      esac
    done
    [ -n "$slides" ] || die "missing slides file. usage: scripts/carousel.sh $cmd <slides.json>$([ "$cmd" = render ] && echo ' [--out <dir>]') [--preset <name>] [--size <WxH>]"

    slides_abs="$(abspath "$slides")"
    [ -f "$slides_abs" ] || die "cannot read $slides: not a file"
    mounts=(--mount "$(bind "$ROOT" /app ,readonly)" --mount "$(bind "$(dirname "$slides_abs")" /in/slides ,readonly)")
    args=("$cmd" "/in/slides/$(basename "$slides_abs")")

    # Values are validated by the CLI inside the container; they are only forwarded here.
    [ -z "$preset_given" ] || args+=(--preset "$preset")
    [ -z "$size_given" ] || args+=(--size "$size")

    if [ -n "$facts_given" ]; then
      echo "warning: --facts is deprecated and ignored; numbers are no longer checked. Remove this option. It will be rejected in 2.0.0." >&2
    fi

    if [ "$cmd" = render ]; then
      out="${out:-out}"
      case "$out" in *,* | *$'\n'*) die "path contains a comma or newline: $out" ;; esac
      mkdir -p "$out"
      out_abs="$(cd "$out" && pwd)"
      mounts+=(--mount "$(bind "$out_abs" /out "")")
      args+=(--out /out)
    fi

    rc=0
    docker run "${SECURE[@]}" "${mounts[@]}" "$IMAGE" bun src/cli.ts "${args[@]}" || rc=$?
    if [ "$rc" -eq 0 ] && [ "$cmd" = render ]; then
      echo "Output directory: $out_abs"
    fi
    exit "$rc"
    ;;

  *)
    echo "usage: scripts/carousel.sh <setup|validate|render|selftest> ..." >&2
    exit 2
    ;;
esac
