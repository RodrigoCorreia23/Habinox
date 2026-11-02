#!/bin/bash
# Movimento de câmara da loja como vídeo: renderiza o troço do percurso em passos de 1/4 de imagem, interpola e monta o vaivém.
# Uso: video.sh <blender> <assets> <imagens do render.sh> <pasta temporária> <saida.mp4> [largura] [amostras]
B=$1; A=$2; F=$3; O=$4; V=$5; W=${6:-1440}; S=${7:-64}; D=$(cd "$(dirname "$0")" && pwd); mkdir -p "$O/m"
for i in $(seq 0 65); do
  x=$(python3 -c "print(81.5 + $i * .25)"); f=$(printf "$O/v%03d.jpg" $i)
  [ -f "$f" ] && continue
  case "$x" in *.0) cp "$F/f$(printf %03d ${x%.0}).jpg" "$f";; *) "$B" -b -P "$D/casa.py" -- "$A" "$f" "$x" $W $S >/dev/null 2>&1;; esac
done
[ "$(ls "$O"/v*.jpg | wc -l)" = 66 ] || { echo "faltam imagens"; exit 1; }
# 1/128 de imagem entre cada passo; depois escolhe, para cada instante de 24 s a 24 i/s, o passo de 89.6 + 8 sin(2πt/24)
ffmpeg -y -v error -framerate 24 -i "$O/v%03d.jpg" -vf "tpad=stop=2:stop_mode=clone,minterpolate=fps=768:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=none" -q:v 2 "$O/m/%05d.jpg"
python3 - "$O/m" <<'P'
import sys, os, math
d = sys.argv[1]; n = len(os.listdir(d))
with open(d + '/../lista.txt', 'w') as l:
    for k in range(576):
        idx = 89.6 + 8 * math.sin(2 * math.pi * k / 576)
        l.write("file '%s/%05d.jpg'\nduration %.6f\n" % (d, min(n, max(1, round((idx - 81.5) * 128) + 1)), 1 / 24))
P
ffmpeg -y -v error -f concat -safe 0 -i "$O/lista.txt" -r 24 -vf "tmix=frames=3:weights=1 2 1" -c:v libx264 -preset slow -crf 20 -x264-params keyint=288:scenecut=0:ipratio=1.0:pbratio=1.0 -pix_fmt yuv420p -movflags +faststart -an "$V"
ls -la "$V"; echo terminado
