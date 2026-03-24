#!/usr/bin/env python3
"""
SOMA ID - Export Generator (ezdxf + numpy-stl)
Generates DXF floor plan, elevations, and STL model.
"""
import ezdxf
import numpy as np
from stl import mesh as stl_mesh
import json, os, math

OUT = "/root/projetos/soma-id/tests/sabrina-parkland"

with open(f"{OUT}/01_parsed_briefing.json") as f:
    briefing = json.load(f)
with open(f"{OUT}/02_bill_of_materials.json") as f:
    bom = json.load(f)

ROOM_W = 5130
ROOM_D = 3640
ROOM_H = 3000
WALL_T = 150
DOOR_W = 900
MDP_T = 18

# ─── DXF: Planta Baixa ───
print("Generating planta_baixa.dxf...")
doc = ezdxf.new(dxfversion='R2010')
msp = doc.modelspace()

# Layers
doc.layers.add('PAREDES', color=7)
doc.layers.add('PORTA', color=1)
doc.layers.add('CLOSET_HER', color=6)
doc.layers.add('ILHA', color=2)
doc.layers.add('MAKEUP', color=5)
doc.layers.add('ARMAS', color=8)
doc.layers.add('CLOSET_HIS', color=4)
doc.layers.add('COTAS', color=3)
doc.layers.add('TEXTO', color=7)

# Room outline
msp.add_lwpolyline([(0,0), (ROOM_W,0), (ROOM_W,ROOM_D), (0,ROOM_D), (0,0)],
                     dxfattribs={'layer': 'PAREDES', 'const_width': 150})

# Walls (thick lines)
# North
msp.add_lwpolyline([(0,ROOM_D), (ROOM_W,ROOM_D)], dxfattribs={'layer': 'PAREDES', 'const_width': WALL_T})
# South (with door gap)
door_start = (ROOM_W - DOOR_W) / 2
msp.add_lwpolyline([(0,0), (door_start,0)], dxfattribs={'layer': 'PAREDES', 'const_width': WALL_T})
msp.add_lwpolyline([(door_start+DOOR_W,0), (ROOM_W,0)], dxfattribs={'layer': 'PAREDES', 'const_width': WALL_T})
# Door swing arc
msp.add_arc((door_start, 0), DOOR_W, 0, 90, dxfattribs={'layer': 'PORTA'})
# East/West
msp.add_lwpolyline([(ROOM_W,0), (ROOM_W,ROOM_D)], dxfattribs={'layer': 'PAREDES', 'const_width': WALL_T})
msp.add_lwpolyline([(0,0), (0,ROOM_D)], dxfattribs={'layer': 'PAREDES', 'const_width': WALL_T})

# Closet Her (north wall furniture, depth 600)
her_depth = 600
msp.add_lwpolyline([(0, ROOM_D-her_depth), (ROOM_W, ROOM_D-her_depth)],
                     dxfattribs={'layer': 'CLOSET_HER'})
# Zone labels
msp.add_text('CLOSET HER', dxfattribs={'layer': 'TEXTO', 'height': 120}).set_placement((ROOM_W/2, ROOM_D-300))

# Sections within Closet Her
sections_her = [
    (0, 1500, 'Vestidos'),
    (1500, 3500, 'Cabides duplo'),
    (3500, 4300, 'Prateleiras'),
    (4300, 5130, 'Vitrines bolsas'),
]
for x1, x2, label in sections_her:
    msp.add_line((x1, ROOM_D-her_depth), (x1, ROOM_D), dxfattribs={'layer': 'CLOSET_HER'})
    msp.add_text(label, dxfattribs={'layer': 'TEXTO', 'height': 60}).set_placement(((x1+x2)/2, ROOM_D-100))

# Shoe rack area
msp.add_lwpolyline([(500, ROOM_D-300), (2050, ROOM_D-300), (2050, ROOM_D-her_depth), (500, ROOM_D-her_depth)],
                     dxfattribs={'layer': 'CLOSET_HER'})
msp.add_text('Sapateira', dxfattribs={'layer': 'TEXTO', 'height': 50}).set_placement((1200, ROOM_D-450))

# Ilha Central
ilha_w, ilha_d = 1200, 600
ilha_x = (ROOM_W - ilha_w) / 2
ilha_z = (ROOM_D - ilha_d) / 2
msp.add_lwpolyline([
    (ilha_x, ilha_z), (ilha_x+ilha_w, ilha_z),
    (ilha_x+ilha_w, ilha_z+ilha_d), (ilha_x, ilha_z+ilha_d), (ilha_x, ilha_z)
], dxfattribs={'layer': 'ILHA'})
msp.add_text('ILHA CENTRAL', dxfattribs={'layer': 'TEXTO', 'height': 80}).set_placement((ROOM_W/2, ROOM_D/2))

# Makeup Area (east wall)
mk_w = 1190
mk_d = 500
mk_z = ROOM_D - 1200 - mk_d/2
msp.add_lwpolyline([
    (ROOM_W-mk_w, mk_z), (ROOM_W, mk_z),
    (ROOM_W, mk_z+mk_d), (ROOM_W-mk_w, mk_z+mk_d), (ROOM_W-mk_w, mk_z)
], dxfattribs={'layer': 'MAKEUP'})
msp.add_text('MAKEUP', dxfattribs={'layer': 'TEXTO', 'height': 80}).set_placement((ROOM_W-mk_w/2, mk_z+mk_d/2))

# Area Armas (west wall)
arm_d = 600
arm_w = 1360
arm_z = (ROOM_D - arm_w) / 2
msp.add_lwpolyline([
    (0, arm_z), (arm_d, arm_z),
    (arm_d, arm_z+arm_w), (0, arm_z+arm_w), (0, arm_z)
], dxfattribs={'layer': 'ARMAS'})
msp.add_text('ARMAS', dxfattribs={'layer': 'TEXTO', 'height': 80}).set_placement((arm_d/2, ROOM_D/2))

# Closet His (south wall)
his_depth = 600
msp.add_lwpolyline([(100, his_depth), (4130, his_depth)],
                     dxfattribs={'layer': 'CLOSET_HIS'})
his_modules = [(100, 900), (900, 1700), (1700, 2900), (2900, 4130)]
for x1, x2 in his_modules:
    msp.add_line((x1, 0), (x1, his_depth), dxfattribs={'layer': 'CLOSET_HIS'})
msp.add_line((4130, 0), (4130, his_depth), dxfattribs={'layer': 'CLOSET_HIS'})
msp.add_text('CLOSET HIS', dxfattribs={'layer': 'TEXTO', 'height': 100}).set_placement((2100, 300))

# Dimensions
doc.styles.add('DIM_STYLE', font='Arial')
dim_style = doc.dimstyles.new('SOMA')
dim_style.dxf.dimtxt = 80
dim_style.dxf.dimasz = 60

# Room width
msp.add_linear_dim(base=(ROOM_W/2, -300), p1=(0, 0), p2=(ROOM_W, 0),
                    dxfattribs={'layer': 'COTAS'}).render()
# Room depth
msp.add_linear_dim(base=(-300, ROOM_D/2), p1=(0, 0), p2=(0, ROOM_D), angle=90,
                    dxfattribs={'layer': 'COTAS'}).render()

# Title block
msp.add_text('SOMA ID - Closet Sabrina Parkland', dxfattribs={'layer': 'TEXTO', 'height': 150}).set_placement((ROOM_W/2, -600))
msp.add_text('Planta Baixa - Escala 1:1 (mm)', dxfattribs={'layer': 'TEXTO', 'height': 80}).set_placement((ROOM_W/2, -850))

doc.saveas(f"{OUT}/planta_baixa.dxf")
print(f"  -> {OUT}/planta_baixa.dxf")

# ─── DXF: Elevations ───
def make_elevation(filename, title, wall_width, wall_height, furniture_rects):
    """Generate a simple elevation DXF."""
    d = ezdxf.new(dxfversion='R2010')
    m = d.modelspace()
    d.layers.add('PAREDE', color=7)
    d.layers.add('MOVEL', color=2)
    d.layers.add('TEXTO', color=7)

    # Wall outline
    m.add_lwpolyline([(0,0), (wall_width,0), (wall_width,wall_height), (0,wall_height), (0,0)],
                       dxfattribs={'layer': 'PAREDE'})

    # Furniture pieces
    for rect in furniture_rects:
        x, y, w, h, label = rect
        m.add_lwpolyline([(x,y), (x+w,y), (x+w,y+h), (x,y+h), (x,y)],
                           dxfattribs={'layer': 'MOVEL'})
        m.add_text(label, dxfattribs={'layer': 'TEXTO', 'height': 40}).set_placement((x+w/2, y+h/2))

    m.add_text(title, dxfattribs={'layer': 'TEXTO', 'height': 100}).set_placement((wall_width/2, -200))
    d.saveas(f"{OUT}/{filename}")
    print(f"  -> {OUT}/{filename}")

print("Generating elevations...")

# Norte (Closet Her - back wall)
make_elevation('elevacao_norte.dxf', 'Eleva\u00e7\u00e3o Norte - Closet Her', ROOM_W, ROOM_H, [
    (0, 0, 1500, 2400, 'Vestidos'),
    (1500, 0, 2000, 2400, 'Cabides'),
    (3500, 0, 800, 2400, 'Prateleiras'),
    (4300, 0, 830, 2000, 'Vitrines'),
    (500, 2200, 2000, 600, 'Malas'),
])

# Sul (Closet His)
make_elevation('elevacao_sul.dxf', 'Eleva\u00e7\u00e3o Sul - Closet His', ROOM_W, ROOM_H, [
    (100, 0, 800, 2400, 'Prat 1'),
    (900, 0, 800, 2400, 'Prat 2'),
    (1700, 0, 1200, 2400, 'Cabide'),
    (2900, 0, 1230, 2400, 'Sapateira'),
    ((ROOM_W-DOOR_W)/2, 0, DOOR_W, 2100, 'PORTA'),
])

# Leste (Vitrines + Makeup)
make_elevation('elevacao_leste.dxf', 'Eleva\u00e7\u00e3o Leste - Vitrines + Makeup', ROOM_D, ROOM_H, [
    (100, 0, 1080, 2000, 'Vitrines Bolsas'),
    (ROOM_D-1200-250, 0, 1190, 750, 'Bancada Makeup'),
    (ROOM_D-1200-250+195, 800, 800, 1000, 'Espelho'),
])

# Oeste (Area Armas)
make_elevation('elevacao_oeste.dxf', 'Eleva\u00e7\u00e3o Oeste - \u00c1rea Armas', ROOM_D, ROOM_H, [
    ((ROOM_D-1360)/2, 0, 1360, 2400, 'Arm\u00e1rio Armas'),
    ((ROOM_D-1360)/2 + 18, 250, 1324, 350, 'Prat 1'),
    ((ROOM_D-1360)/2 + 18, 600, 1324, 350, 'Prat 2'),
    ((ROOM_D-1360)/2 + 18, 950, 1324, 350, 'Prat 3'),
    ((ROOM_D-1360)/2 + 18, 1300, 1324, 350, 'Prat 4'),
    ((ROOM_D-1360)/2 + 18, 1650, 1324, 350, 'Prat 5'),
    ((ROOM_D-1360)/2 + 18, 2000, 1324, 350, 'Prat 6'),
])

# ─── STL: Simple 3D model ───
print("Generating 3d_model.stl...")

def box_to_triangles(cx, cy, cz, wx, wy, wz):
    """Return 12 triangles (faces) for an axis-aligned box centered at (cx,cy,cz)."""
    hx, hy, hz = wx/2, wy/2, wz/2
    verts = [
        [cx-hx, cy-hy, cz-hz], [cx+hx, cy-hy, cz-hz], [cx+hx, cy+hy, cz-hz], [cx-hx, cy+hy, cz-hz],
        [cx-hx, cy-hy, cz+hz], [cx+hx, cy-hy, cz+hz], [cx+hx, cy+hy, cz+hz], [cx-hx, cy+hy, cz+hz],
    ]
    faces = [
        (0,1,2), (0,2,3),  # bottom
        (4,6,5), (4,7,6),  # top
        (0,4,5), (0,5,1),  # front
        (2,6,7), (2,7,3),  # back
        (0,3,7), (0,7,4),  # left
        (1,5,6), (1,6,2),  # right
    ]
    return [(verts[a], verts[b], verts[c]) for a,b,c in faces]

all_triangles = []

# Room floor
all_triangles += box_to_triangles(ROOM_W/2, ROOM_D/2, -5, ROOM_W, ROOM_D, 10)

# Closet Her - simplified main panels
her_boxes = [
    (750, 300, 1200, 1500, 600, 2400),      # Vestidos section
    (2500, 300, 1200, 2000, 600, 2400),      # Cabides section
    (3900, 300, 1200, 800, 600, 2400),       # Prateleiras
    (ROOM_W-415, 540, 1000, 830, 1080, 2000),# Vitrines
]
for bx in her_boxes:
    all_triangles += box_to_triangles(*bx)

# Ilha Central
all_triangles += box_to_triangles(ROOM_W/2, ROOM_D/2, 450, 1200, 600, 900)

# Makeup
all_triangles += box_to_triangles(ROOM_W-595, ROOM_D-1200-250+250, 375, 1190, 500, 750)

# Area Armas
all_triangles += box_to_triangles(300, ROOM_D/2, 1200, 600, 1360, 2400)

# Closet His modules
his_x = 100
for w in [800, 800, 1200, 1230]:
    all_triangles += box_to_triangles(his_x + w/2, 300, 1200, w, 600, 2400)
    his_x += w

# Create STL mesh
stl_data = np.zeros(len(all_triangles), dtype=stl_mesh.Mesh.dtype)
for i, (v0, v1, v2) in enumerate(all_triangles):
    stl_data['vectors'][i] = np.array([v0, v1, v2])

model = stl_mesh.Mesh(stl_data)
model.save(f"{OUT}/3d_model.stl")
print(f"  -> {OUT}/3d_model.stl ({len(all_triangles)} triangles)")

print("\nAll exports complete!")
