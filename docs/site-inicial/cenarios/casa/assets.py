# Descarrega do Poly Haven (CC0) o céu, as texturas e a mobília da casa. Uso: assets.py <pasta>
import json, os, sys, urllib.request as u
out = sys.argv[1]
def get(url, path):
    path = os.path.join(out, path); os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path): return
    r = u.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    open(path, 'wb').write(u.urlopen(r, timeout=120).read())
def files(i):
    r = u.Request('https://api.polyhaven.com/files/' + i, headers={'User-Agent': 'Mozilla/5.0'})
    return json.load(u.urlopen(r, timeout=60))
get(files('kiara_9_dusk')['hdri']['4k']['exr']['url'], 'hdri/ceu.exr')
for t in ['concrete_floor_02', 'grey_plaster_02', 'oak_veneer_01']:
    f = files(t)
    for k, n in [('Diffuse', 'cor'), ('nor_gl', 'normal'), ('Rough', 'rugosidade')]:
        get(f[k]['2k']['jpg']['url'], f'tex/{t}/{n}.jpg')
for m in ['sofa_03', 'modern_arm_chair_01', 'modern_coffee_table_01', 'calathea_orbifolia_01', 'side_table_01']:
    g = files(m)['gltf']['2k']['gltf']
    get(g['url'], f'mod/{m}/{m}.gltf')
    for p, v in g['include'].items(): get(v['url'], f'mod/{m}/{p}')
    print(m, flush=True)
