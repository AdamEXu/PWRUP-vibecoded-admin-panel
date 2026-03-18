#!/usr/bin/env bash
# Optimize Robot-Full.gltf for Three.js rendering
# Converts embedded base64 GLTF → binary GLB, deduplicates meshes,
# simplifies geometry, and quantizes vertex attributes.
#
# Usage: cd apps/comp && bash scripts/optimize-model.sh

set -euo pipefail

CAD_DIR="$(cd "$(dirname "$0")/../public/cad" && pwd)"
SRC="$CAD_DIR/Robot-Full.gltf"
OUT="$CAD_DIR/Robot-Full.glb"

if [ ! -f "$SRC" ]; then
  echo "Error: $SRC not found"
  echo "Copy the source GLTF there first: cp cad-assets/Robot-Full.gltf public/cad/"
  exit 1
fi

echo "==> Converting GLTF (base64) → GLB (binary)..."
npx --yes @gltf-transform/cli copy "$SRC" "$CAD_DIR/_step1.glb"

echo "==> Deduplicating mesh instances..."
npx --yes @gltf-transform/cli instance "$CAD_DIR/_step1.glb" "$CAD_DIR/_step2.glb"

echo "==> Simplifying geometry (50% reduction)..."
npx --yes @gltf-transform/cli simplify "$CAD_DIR/_step2.glb" "$CAD_DIR/_step3.glb" --ratio 0.5 || {
  echo "Warning: simplify failed (may need meshoptimizer). Skipping..."
  cp "$CAD_DIR/_step2.glb" "$CAD_DIR/_step3.glb"
}

echo "==> Quantizing vertex attributes..."
npx --yes @gltf-transform/cli quantize "$CAD_DIR/_step3.glb" "$OUT" || {
  echo "Warning: quantize failed. Using previous step..."
  cp "$CAD_DIR/_step3.glb" "$OUT"
}

# Clean up intermediates
rm -f "$CAD_DIR/_step1.glb" "$CAD_DIR/_step2.glb" "$CAD_DIR/_step3.glb"

# Remove the source GLTF (it was only needed for conversion)
rm -f "$SRC"

FINAL_SIZE=$(du -h "$OUT" | cut -f1)
echo "==> Done! Output: $OUT ($FINAL_SIZE)"
