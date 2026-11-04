#!/usr/bin/env bash
# Exporta as imagens do percurso da página inicial para a app (WebP).
# Só o troço que o scroll percorre (imagens 40 a 144, ver AT em index.html).
# Computador: 1920 px; telemóvel: 900 px. Fonte: img/casa-hd (2560 px).
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
out="$(cd "$here/../.." && pwd)/public/home"
ffmpeg="${FFMPEG:-ffmpeg}"
mkdir -p "$out/1920" "$out/900"
for i in $(seq 40 144); do
  n=$(printf "%03d" "$i")
  "$ffmpeg" -v error -y -i "$here/img/casa-hd/f$n.jpg" -vf "scale=1920:-2" -c:v libwebp -quality 70 "$out/1920/f$n.webp"
  "$ffmpeg" -v error -y -i "$here/img/casa-hd/f$n.jpg" -vf "scale=900:-2" -c:v libwebp -quality 72 "$out/900/f$n.webp"
done
echo "Exportadas $(ls "$out/1920" | wc -l) imagens para $out"
