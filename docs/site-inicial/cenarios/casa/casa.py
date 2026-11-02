# Casa à volta da escada do site, para render em Cycles. As medidas da escada são as de index.html.
# Uso: blender -b -P casa.py -- <assets> <saida> <pose|frame> [largura] [amostras]
import bpy, bmesh, math, sys, os
from math import cos, sin, pi
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
AS, OUT, WHAT = argv[0], argv[1], argv[2]
WIDTH = int(argv[3]) if len(argv) > 3 else 1280
SPP = int(argv[4]) if len(argv) > 4 else 128

STEPS, RISE, TURN = 14, 3.08 / 15, 150 * pi / 180
DTH = TURN / STEPS
RI, RO, TREAD_T, UP, DN = .52, 1.84, .06, .95, .32
LANDING = STEPS * RISE
X0, X1, Z0, Z1, H = -6.5, 6.5, -7, 5.5, 5.4   # z do site; aqui Y = -z
line_y = lambda th: RISE * (th / DTH + .5)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
col = scene.collection

def mesh(name, verts, faces, mat, smooth=False):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    if smooth: me.shade_smooth()
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me); col.objects.link(ob); return ob

def box(name, c, s, mat, rz=0):
    x, y, z = [v / 2 for v in s]
    vs = [(a, b, d) for a in (-x, x) for b in (-y, y) for d in (-z, z)]
    ob = mesh(name, vs, [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)], mat)
    ob.location = c; ob.rotation_euler[2] = rz; return ob

def pbr(name, tex, scale, rough=None, tint=None, nor=1.0, flat=0.):
    m = bpy.data.materials.new(name); m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links; b = n['Principled BSDF']
    tc = n.new('ShaderNodeTexCoord'); mp = n.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = scale
    l.new(tc.outputs['Object'], mp.inputs['Vector'])
    def im(f, data=False):
        t = n.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(f'{AS}/tex/{tex}/{f}.jpg')
        t.projection = 'BOX'; t.projection_blend = .2
        if data: t.image.colorspace_settings.name = 'Non-Color'
        l.new(mp.outputs[0], t.inputs[0]); return t
    c = im('cor')
    if flat:  # tira manchas à fotografia da textura, mantendo o grão
        hs = n.new('ShaderNodeBrightContrast'); hs.inputs['Contrast'].default_value = -flat; l.new(c.outputs[0], hs.inputs[0]); c = hs
    if tint:
        g = n.new('ShaderNodeMixRGB'); g.blend_type = 'MULTIPLY'; g.inputs[0].default_value = 1
        g.inputs[2].default_value = (*tint, 1); l.new(c.outputs[0], g.inputs[1]); l.new(g.outputs[0], b.inputs['Base Color'])
    else: l.new(c.outputs[0], b.inputs['Base Color'])
    r = im('rugosidade', True); mr = n.new('ShaderNodeMath'); mr.operation = 'MULTIPLY'; mr.inputs[1].default_value = rough or 1
    l.new(r.outputs[0], mr.inputs[0]); l.new(mr.outputs[0], b.inputs['Roughness'])
    nm = n.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nor
    l.new(im('normal', True).outputs[0], nm.inputs['Color']); l.new(nm.outputs[0], b.inputs['Normal'])
    return m

def plain(name, color, rough=.5, metal=0., emit=None, power=1.):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = power
    return m

floor_m = pbr('betao', 'concrete_floor_02', (.45, .45, .45), rough=.42, tint=(.62, .62, .62), nor=.2, flat=.55)
wall_m = pbr('reboco', 'grey_plaster_02', (.9, .9, .9), rough=1, tint=(.95, .93, .9), nor=.2, flat=.8)
ceil_m = pbr('teto', 'grey_plaster_02', (.9, .9, .9), rough=1, tint=(1.2, 1.18, 1.15), nor=.1, flat=.85)
oak_m = pbr('carvalho', 'oak_veneer_01', (.5, .5, .5), rough=.8, tint=(.62, .5, .4))
frame_m = plain('caixilho', (.012, .012, .013), .45, .6)
led_m = plain('led', (1, .8, .55), .5, 0, (1, .6, .28), 26)
down_m = plain('foco', (1, 1, 1), .5, 0, (1, .78, .55), 40)
# Vidro fino: não desvia a luz (um plano com refração funcionaria como lente), só reflete a ângulo rasante
glass_m = bpy.data.materials.new('vidro'); glass_m.use_nodes = True
n, l = glass_m.node_tree.nodes, glass_m.node_tree.links; n.remove(n['Principled BSDF'])
tr, gl, mx, fr = n.new('ShaderNodeBsdfTransparent'), n.new('ShaderNodeBsdfGlossy'), n.new('ShaderNodeMixShader'), n.new('ShaderNodeFresnel')
gl.inputs['Roughness'].default_value = .01; fr.inputs['IOR'].default_value = 1.5
l.new(fr.outputs[0], mx.inputs[0]); l.new(tr.outputs[0], mx.inputs[1]); l.new(gl.outputs[0], mx.inputs[2]); l.new(mx.outputs[0], n['Material Output'].inputs[0])
steel_m = plain('aco', (.48, .37, .22), .36, .9)

# Ónix: veios quentes, com luz fraca por dentro como no site
onyx = bpy.data.materials.new('onix'); onyx.use_nodes = True
n, l = onyx.node_tree.nodes, onyx.node_tree.links; b = n['Principled BSDF']
tc = n.new('ShaderNodeTexCoord'); w = n.new('ShaderNodeTexWave'); w.inputs['Scale'].default_value = 2.2
w.inputs['Distortion'].default_value = 9; w.inputs['Detail'].default_value = 7; w.inputs['Detail Roughness'].default_value = .62
l.new(tc.outputs['Object'], w.inputs['Vector'])
ramp = n.new('ShaderNodeValToRGB'); e = ramp.color_ramp.elements
e[0].position = .18; e[0].color = (.62, .42, .22, 1); e[1].position = .85; e[1].color = (.9, .72, .48, 1)
l.new(w.outputs['Fac'], ramp.inputs[0]); l.new(ramp.outputs[0], b.inputs['Base Color']); l.new(ramp.outputs[0], b.inputs['Emission Color'])
b.inputs['Emission Strength'].default_value = .16; b.inputs['Roughness'].default_value = .2; b.inputs['Coat Weight'].default_value = .4

# ---------- casa ----------
def quad(name, a, b_, c, d, m): return mesh(name, [a, b_, c, d], [(0, 1, 2, 3)], m)
YA, YB = -Z1, -Z0   # -5.5 .. 7
quad('chao', (X0, YA, 0), (X1, YA, 0), (X1, YB, 0), (X0, YB, 0), floor_m)
quad('teto', (X0, YA, H), (X0, YB, H), (X1, YB, H), (X1, YA, H), ceil_m)
quad('parede_fundo', (X0, YA, 0), (X0, YA, H), (X1, YA, H), (X1, YA, 0), wall_m)
quad('parede_esq', (X0, YB, 0), (X0, YB, H), (X0, YA, H), (X0, YA, 0), wall_m)
quad('parede_tras', (X1, YB, 0), (X1, YB, H), (X0, YB, H), (X0, YB, 0), wall_m)

# Parede de vidro virada ao exterior (x = X1), caixilhos a cada 2,2 m
n_m = 6
for i in range(n_m + 1):
    box(f'montante{i}', (X1, YA + i * (YB - YA) / n_m, H / 2), (.1, .06, H), frame_m)
for z in (.03, 2.75, H - .03): box(f'travessa{z}', (X1, (YA + YB) / 2, z), (.1, YB - YA, .06), frame_m)
quad('vidro', (X1, YA, H), (X1, YB, H), (X1, YB, 0), (X1, YA, 0), glass_m)
box('terraco', (X1 + 6, (YA + YB) / 2, -.1), (12, 40, .2), plain('terraco_m', (.22, .21, .2), .9))

# Mezanino (o mesmo contorno do site)
A = (RI * cos(TURN), RI * sin(TURN)); B = (X0, A[1] + (X0 - A[0]) * math.tan(TURN))
SL = .3
pts = [A, B, (X0, YA), (A[0], YA)]
vs = [(x, y, LANDING - SL) for x, y in pts] + [(x, y, LANDING) for x, y in pts]
mesh('mezanino', vs, [(3, 2, 1, 0), (4, 5, 6, 7), (0, 1, 5, 4), (3, 0, 4, 7), (1, 2, 6, 5), (2, 3, 7, 6)], wall_m)
quad('mezanino_chao', (*A, LANDING + .002), (*B, LANDING + .002), (X0, YA, LANDING + .002), (A[0], YA, LANDING + .002), oak_m)
for k, (p, q) in enumerate([((RO * cos(TURN), RO * sin(TURN)), B), (A, (A[0], YA))]):
    ln = math.dist(p, q); ang = math.atan2(q[1] - p[1], q[0] - p[0]); c = ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2)
    box(f'guarda_vidro{k}', (*c, LANDING + .52), (ln, .012, 1), glass_m, ang)
    box(f'guarda_topo{k}', (*c, LANDING + 1.02), (ln, .05, .035), steel_m, ang)
    box(f'guarda_base{k}', (*c, LANDING + .035), (ln, .05, .07), steel_m, ang)
    box(f'led_rebordo{k}', (c[0], c[1], LANDING - SL - .006), (ln, .02, .012), led_m, ang)

# Painel de carvalho por baixo do mezanino, com porta
for i in range(26):
    box(f'ripa{i}', (A[0] - .08 - i * .22, YA + .04, (LANDING - SL) / 2), (.16, .05, LANDING - SL), oak_m)
box('porta', (-3.1, YA + .08, 1.1), (1, .04, 2.2), frame_m)

# Focos encastrados
def spot(name, loc, power, angle=70, color=(1, .84, .68)):
    d = bpy.data.lights.new(name, 'SPOT'); d.energy = power; d.color = color; d.spot_size = math.radians(angle); d.spot_blend = .7; d.shadow_soft_size = .03
    o = bpy.data.objects.new(name, d); col.objects.link(o); o.location = loc; return o
for x, y in [(1.5, -3.6), (3.8, -3.6), (1.5, 3.2), (3.8, 3.2), (-2.5, 3.8), (3.8, -.2)]:
    spot('foco', (x, y, H - .01), 170)
    box('aro', (x, y, H - .004), (.09, .09, .005), down_m)
for x in (-1.6, -3, -4.4):
    for y in (-1.6, -3.8): spot('foco_baixo', (x, y, LANDING - SL - .01), 45)

def area(loc, s, power):
    d = bpy.data.lights.new('teto', 'AREA'); d.size = s; d.energy = power; d.color = (1, .88, .76)
    o = bpy.data.objects.new('teto', d); col.objects.link(o); o.location = loc; o.visible_glossy = False; o.visible_camera = False
area((2.5, 0, H - .1), 7, 150); area((-3, -3, LANDING - SL - .05), 3, 28); area((-3, 4, H - .1), 5, 60)

# ---------- escada ----------
ACESAS = int(os.environ.get('ACESAS', STEPS))  # degraus acesos, de baixo para cima
led_off = plain('led_off', (.5, .47, .42), .5)
onyx_off = onyx.copy(); onyx_off.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 0
for k in range(STEPS):
    a0, a1 = k * DTH, TURN if k == STEPS - 1 else (k + 1) * DTH + .025
    top, N = (k + 1) * RISE, 18
    arc = [a0 + (a1 - a0) * i / N for i in range(N + 1)]
    ring = [(RO * cos(a), RO * sin(a)) for a in arc] + [(RI * cos(a), RI * sin(a)) for a in reversed(arc)]
    vs = [(x, y, top - TREAD_T) for x, y in ring] + [(x, y, top) for x, y in ring]
    c = len(ring); f = [tuple(range(c - 1, -1, -1)), tuple(range(c, 2 * c))] + [(i, (i + 1) % c, (i + 1) % c + c, i + c) for i in range(c)]
    o = mesh(f'degrau{k}', vs, f, onyx if k < ACESAS else onyx_off)
    o.modifiers.new('b', 'BEVEL').width = .004
    th = a0 + .08; r = (RI + RO) / 2
    box(f'led{k}', (r * cos(th), r * sin(th), top - TREAD_T - .005), (RO - RI - .04, .025, .008), led_m if k < ACESAS else led_off, th)

def guard(name, r, th0, th1, top, bot, mask):
    W, Hg, segs = r * (th1 - th0), top(th1) + .05, 200
    img = bpy.data.images.load(f'{AS}/mascaras/{mask}.png'); img.colorspace_settings.name = 'Non-Color'
    m = bpy.data.materials.new(name); m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links; out = n['Material Output']; b = n['Principled BSDF']
    b.inputs['Base Color'].default_value = (.48, .37, .22, 1); b.inputs['Metallic'].default_value = .55; b.inputs['Roughness'].default_value = .58
    t = n.new('ShaderNodeTexImage'); t.image = img; t.interpolation = 'Cubic'
    gt = n.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = .5; l.new(t.outputs[0], gt.inputs[0])
    tr = n.new('ShaderNodeBsdfTransparent'); mx = n.new('ShaderNodeMixShader')
    l.new(gt.outputs[0], mx.inputs[0]); l.new(tr.outputs[0], mx.inputs[1]); l.new(b.outputs[0], mx.inputs[2]); l.new(mx.outputs[0], out.inputs[0])
    for off in (0, .006):  # duas faces a 6 mm dão espessura à chapa
        vs, f, uv = [], [], []
        for i in range(segs + 1):
            th = th0 + (th1 - th0) * i / segs; b0 = bot(th); t0 = max(b0, top(th)); rr = r + off
            vs += [(rr * cos(th), rr * sin(th), b0), (rr * cos(th), rr * sin(th), t0)]
            u = r * (th - th0) / W; uv += [(u, b0 / Hg), (u, t0 / Hg)]
            if i < segs: f.append((2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1))
        o = mesh(name, vs, f, m, True)
        ul = o.data.uv_layers.new()
        for p in o.data.polygons:
            for li in p.loop_indices: ul.data[li].uv = uv[o.data.loops[li].vertex_index]

line = line_y
guard('guarda_ext', RO, -.015, TURN + .02, lambda t: line(t) + UP, lambda t: max(0, line(t) - DN), 'exterior')
guard('guarda_int', RI, -.52, TURN + .02, lambda t: min(line(t) + UP, max(0, (t + .62) * 2)), lambda t: max(0, line(t) - DN), 'interior')

# ---------- mobília (digitalizada) ----------
def place(model, loc, rz=0, s=1):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=f'{AS}/mod/{model}/{model}.gltf')
    for o in set(bpy.data.objects) - before:
        if o.parent is None:
            o.location = loc; o.rotation_mode = 'XYZ'; o.rotation_euler = (0, 0, rz); o.scale = (s, s, s)
place('sofa_03', (3.6, -2.0, 0), math.radians(-90))
place('modern_arm_chair_01', (4.2, 1.5, 0), math.radians(205))
place('modern_coffee_table_01', (3.4, -.2, 0))
place('side_table_01', (4.9, -3.9, 0))
place('calathea_orbifolia_01', (5.6, 3.2, 0), 0, 1.5)
place('calathea_orbifolia_01', (5.7, -4.7, 0), 1.2, 1.7)
rug = plain('tapete', (.32, .28, .24), .95); box('tapete', (3.4, -.3, .006), (4.2, 5.2, .012), rug)

# ---------- céu ----------
world = bpy.data.worlds.new('ceu'); scene.world = world; world.use_nodes = True
n, l = world.node_tree.nodes, world.node_tree.links
env = n.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(f'{AS}/hdri/ceu.exr')
tc = n.new('ShaderNodeTexCoord'); mp = n.new('ShaderNodeMapping'); mp.inputs['Rotation'].default_value[2] = math.radians(float(os.environ.get('CEU_ROT', 0)))
l.new(tc.outputs['Generated'], mp.inputs[0]); l.new(mp.outputs[0], env.inputs[0]); l.new(env.outputs[0], n['Background'].inputs['Color'])
n['Background'].inputs['Strength'].default_value = float(os.environ.get('CEU', .16))

# ---------- câmara: as poses do site ----------
POSES = {
    'loja': dict(pos=(-3.7, 1.0, -5.9), tgt=(.0, 2.0, -.4), fov=46, sx=.4, sy=0),
    'inicio': dict(pos=(-1.2, 1.0, -6.2), tgt=(.2, 2.0, -.5), fov=46, sx=.2, sy=0),
    'login': dict(pos=(-5.6, 1.0, -3.4), tgt=(.1, 2.0, -.5), fov=46, sx=-.2, sy=0),
}
cam_d = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cam_d); col.objects.link(cam); scene.camera = cam
cam_d.sensor_fit = 'VERTICAL'; cam_d.sensor_height = 24; cam_d.clip_start = .05
def pose(p):
    pos, tgt = Vector((p['pos'][0], -p['pos'][2], p['pos'][1])), Vector((p['tgt'][0], -p['tgt'][2], p['tgt'][1]))
    cam.location = pos; cam.rotation_mode = 'QUATERNION'; cam.rotation_quaternion = (tgt - pos).to_track_quat('-Z', 'Y')
    cam_d.angle_y = math.radians(p['fov']); cam_d.shift_x = -p['sx'] * 1.0
# Percurso único: de lá do login até à vista do início, sempre em volta da escada.
FRAMES, ARC0, ARC1 = 160, -113., -175.
def path(t):
    keys = [(-121., POSES['login']), (-148., POSES['loja']), (-169., POSES['inicio'])]
    phi = ARC0 + (ARC1 - ARC0) * t
    f = lambda p: (math.hypot(p['pos'][0], p['pos'][2]), p['pos'][1], *p['tgt'], p['fov'], p['sx'])
    if phi >= keys[0][0]: a, b, x = keys[0][1], keys[0][1], 0
    elif phi <= keys[2][0]: a, b, x = keys[2][1], keys[2][1], 0
    else:
        i = 0 if phi > keys[1][0] else 1
        a, b = keys[i][1], keys[i + 1][1]; x = (phi - keys[i][0]) / (keys[i + 1][0] - keys[i][0]); x = x * x * (3 - 2 * x)
    v = [m + (n - m) * x for m, n in zip(f(a), f(b))]
    R, y = v[0], v[1]; rad = math.radians(phi)
    return dict(pos=(R * sin(rad), y, R * cos(rad)), tgt=tuple(v[2:5]), fov=v[5], sx=v[6], sy=0)
pose(POSES[WHAT] if WHAT in POSES else path(float(WHAT) / (FRAMES - 1)))

# ---------- render ----------
r = scene.render; r.engine = 'CYCLES'; r.resolution_x = WIDTH; r.resolution_y = WIDTH * 9 // 16; r.resolution_percentage = 100
c = scene.cycles; c.device = 'CPU'; c.samples = SPP; c.use_denoising = True; c.denoiser = 'OPENIMAGEDENOISE'; c.max_bounces = 10; c.transparent_max_bounces = 24; c.caustics_reflective = False; c.caustics_refractive = False; c.sample_clamp_indirect = 8
scene.view_settings.view_transform = 'AgX'; scene.view_settings.look = 'AgX - Medium High Contrast'; scene.view_settings.exposure = float(os.environ.get('EXPO', 0))
r.image_settings.file_format = 'JPEG'; r.image_settings.quality = 92; r.filepath = OUT
bpy.ops.render.render(write_still=True)
