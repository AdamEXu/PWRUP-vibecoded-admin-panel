#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

SOURCE_ROOT="${SOURCE_ROOT:-${HOME}/Developer/FIR/src/2026Rebuilt/src/main/deploy/pathplanner}"
DEST_ROOT="${DEST_ROOT:-${REPO_ROOT}/apps/comp/public/pathplanner}"

APPLY_CHANGES=false
AUTOS_ONLY=false

print_help() {
  cat <<'EOF'
Sync PathPlanner files from FIR into this dashboard repo.

Usage:
  ./scripts/sync-pathplanner-from-fir.sh [--apply] [--autos-only]

Flags:
  --apply       Perform the copy (default is dry-run).
  --autos-only  Sync only autos (skip paths).
  --help        Show this help.

Env overrides:
  SOURCE_ROOT   Defaults to ~/Developer/FIR/src/2026Rebuilt/src/main/deploy/pathplanner
  DEST_ROOT     Defaults to apps/comp/public/pathplanner in this repo
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply)
      APPLY_CHANGES=true
      shift
      ;;
    --autos-only)
      AUTOS_ONLY=true
      shift
      ;;
    --help|-h)
      print_help
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      print_help >&2
      exit 1
      ;;
  esac
done

if [[ ! -d "${SOURCE_ROOT}" ]]; then
  echo "Source root not found: ${SOURCE_ROOT}" >&2
  exit 1
fi

mkdir -p "${DEST_ROOT}/autos"
mkdir -p "${DEST_ROOT}/paths"

rsync_flags=(-avh --delete)
if [[ "${APPLY_CHANGES}" == false ]]; then
  rsync_flags+=(-n -c)
fi

sync_dir() {
  local name="$1"
  local src="${SOURCE_ROOT}/${name}/"
  local dest="${DEST_ROOT}/${name}/"

  if [[ ! -d "${src}" ]]; then
    echo "Missing source directory: ${src}" >&2
    exit 1
  fi

  echo "Syncing ${name}: ${src} -> ${dest}"
  rsync "${rsync_flags[@]}" "${src}" "${dest}"
}

if [[ "${APPLY_CHANGES}" == false ]]; then
  echo "Running in dry-run mode. Use --apply to copy files."
fi

sync_dir "autos"
if [[ "${AUTOS_ONLY}" == false ]]; then
  sync_dir "paths"
fi

if [[ "${APPLY_CHANGES}" == false ]]; then
  echo "Dry-run complete."
else
  echo "Sync complete."
fi
