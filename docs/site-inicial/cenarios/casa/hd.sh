#!/bin/bash
# Versão de alta qualidade (2560 px, 128 amostras). Retoma onde parou.
# Uso: hd.sh loja|percurso <blender> <assets> <saida>
# loja: degraus a acender + vídeo; percurso: o resto das imagens (render.sh salta as que já existem).
E=$1; B=$2; A=$3; O=$4; D=$(cd "$(dirname "$0")" && pwd); W=2560; S=128; mkdir -p "$O/frames"
if [ "$E" = loja ]; then
  for k in $(seq 0 14); do f=$(printf "$O/frames/a%02d.jpg" $k); [ -f "$f" ] || ACESAS=$k "$B" -b -P "$D/casa.py" -- "$A" "$f" loja $W $S >/dev/null 2>&1; done
  for i in $(seq 82 97); do f=$(printf "$O/frames/f%03d.jpg" $i); [ -f "$f" ] || "$B" -b -P "$D/casa.py" -- "$A" "$f" $i $W $S >/dev/null 2>&1; done
  "$D/video.sh" "$B" "$A" "$O/frames" "$O/video" "$O/balanco.mp4" $W $S
else
  "$D/render.sh" "$B" "$A" "$O/frames" $W $S
fi
