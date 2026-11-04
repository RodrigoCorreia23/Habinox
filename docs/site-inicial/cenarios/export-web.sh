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

# Luzes dos degraus a acender, ao abrir a loja (a00–a14).
for i in $(seq 0 14); do
  n=$(printf "%02d" "$i")
  "$ffmpeg" -v error -y -i "$here/img/casa-hd/a$n.jpg" -vf "scale=1920:-2" -c:v libwebp -quality 70 "$out/1920/a$n.webp"
  "$ffmpeg" -v error -y -i "$here/img/casa-hd/a$n.jpg" -vf "scale=900:-2" -c:v libwebp -quality 72 "$out/900/a$n.webp"
done

# Câmara parada na loja: o vaivém em vídeo (sem som, em ciclo).
"$ffmpeg" -v error -y -i "$here/img/casa-hd/balanco.mp4" -vf "scale=1920:-2" -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart -an "$out/1920/balanco.mp4"
"$ffmpeg" -v error -y -i "$here/img/casa-hd/balanco.mp4" -vf "scale=960:-2" -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -movflags +faststart -an "$out/900/balanco.mp4"

# Fotografias das categorias: PROVISÓRIAS (Unsplash, ilustrativas, não são obras da Habinox).
mkdir -p "$out/provisorio"
for f in "$here"/img/*.jpg; do
  name=$(basename "$f" .jpg)
  "$ffmpeg" -v error -y -i "$f" -vf "scale='min(1200,iw)':-2" -c:v libwebp -quality 74 "$out/provisorio/$name.webp"
done
echo "Luzes, vídeo e fotografias provisórias exportados"
