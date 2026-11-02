#!/bin/bash
# Renderiza os degraus a acender (15 imagens) e o percurso (160), de 8 em 8 e depois a preencher. Retoma onde parou.
# Uso: render.sh <blender> <assets> <saida> [largura] [amostras]
B=$1; A=$2; O=$3; W=${4:-1440}; S=${5:-64}; D=$(dirname "$0"); mkdir -p "$O"
for k in $(seq 0 14); do f=$(printf "$O/a%02d.jpg" $k); [ -f "$f" ] || ACESAS=$k "$B" -b -P "$D/casa.py" -- "$A" "$f" loja $W $S >/dev/null 2>&1; done
for p in 8 4 2 1; do for i in $(seq 0 $p 159) 159; do f=$(printf "$O/f%03d.jpg" $i); [ -f "$f" ] || "$B" -b -P "$D/casa.py" -- "$A" "$f" $i $W $S >/dev/null 2>&1; done; done
echo terminado
