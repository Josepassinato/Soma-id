#!/usr/bin/env python3
"""
SOMA ID - 3D Model Generator (CadQuery)
Project: Closet Sabrina Parkland, FL
Generates STEP, STL, and DXF files from parsed briefing data.
"""
import cadquery as cq
import json, os, math

OUT = "/root/projetos/soma-id/tests/sabrina-parkland"

# Load data
with open(f"{OUT}/01_parsed_briefing.json") as f:
    briefing = json.load(f)
with open(f"{OUT}/02_bill_of_materials.json") as f:
    bom = json.load(f)

# Room dimensions (mm)
ROOM_W = 5130  # north-south (X)
ROOM_D = 3640  # east-west (Y)
ROOM_H = 3000  # height (Z)
WALL_T = 150   # wall thickness
DOOR_W = 900   # door width
MDP_T = 18     # MDP thickness
GLASS_T = 6
MIRROR_T = 4
BAR_D = 25     # hanging bar diameter

# ─── ROOM SHELL ───
def make_room():
    """Create room with walls, floor, ceiling, and door opening."""
    # Floor
    floor = cq.Workplane("XY").box(ROOM_W, ROOM_D, 10).translate((ROOM_W/2, ROOM_D/2, -5))

    # Ceiling
    ceiling = cq.Workplane("XY").box(ROOM_W, ROOM_D, 10).translate((ROOM_W/2, ROOM_D/2, ROOM_H + 5))

    # North wall (back, X-axis, at Y=ROOM_D)
    north = cq.Workplane("XY").box(ROOM_W, WALL_T, ROOM_H).translate((ROOM_W/2, ROOM_D + WALL_T/2, ROOM_H/2))

    # South wall (front, X-axis, at Y=0) with door opening
    south_full = cq.Workplane("XY").box(ROOM_W, WALL_T, ROOM_H).translate((ROOM_W/2, -WALL_T/2, ROOM_H/2))
    door_cut = cq.Workplane("XY").box(DOOR_W, WALL_T + 10, 2100).translate((ROOM_W/2, -WALL_T/2, 2100/2))
    south = south_full.cut(door_cut)

    # East wall (at X=ROOM_W)
    east = cq.Workplane("XY").box(WALL_T, ROOM_D, ROOM_H).translate((ROOM_W + WALL_T/2, ROOM_D/2, ROOM_H/2))

    # West wall (at X=0)
    west = cq.Workplane("XY").box(WALL_T, ROOM_D, ROOM_H).translate((-WALL_T/2, ROOM_D/2, ROOM_H/2))

    room = floor.union(ceiling).union(north).union(south).union(east).union(west)
    return room

# ─── CLOSET HER (North + East walls) ───
def make_closet_her():
    parts = cq.Assembly()
    x_start = 0
    y_back = ROOM_D - 600  # 600mm depth from north wall

    # --- Hanging bars - long garments (vestidos) ---
    bar_long = cq.Workplane("XZ").cylinder(1500, BAR_D/2).rotateAboutCenter((0,1,0), 90)
    bar_long = bar_long.translate((x_start + 750, y_back + 300, 1700))

    # --- Hanging bars - short garments (double height) ---
    bar_upper = cq.Workplane("XZ").cylinder(2000, BAR_D/2).rotateAboutCenter((0,1,0), 90)
    bar_upper = bar_upper.translate((x_start + 1500 + 1000, y_back + 300, 1700))

    bar_lower = cq.Workplane("XZ").cylinder(2000, BAR_D/2).rotateAboutCenter((0,1,0), 90)
    bar_lower = bar_lower.translate((x_start + 1500 + 1000, y_back + 300, 900))

    # --- Shelves (8x 800mm + 4x 600mm) ---
    shelves = cq.Workplane("XY")
    shelf_assembly = None
    shelf_x = 3500
    for i in range(8):
        s = cq.Workplane("XY").box(800, 400, MDP_T).translate((shelf_x + 400, y_back + 200, 300 + i * 300))
        if shelf_assembly is None:
            shelf_assembly = s
        else:
            shelf_assembly = shelf_assembly.union(s)

    for i in range(4):
        s = cq.Workplane("XY").box(600, 400, MDP_T).translate((shelf_x + 800 + 300, y_back + 200, 300 + i * 300))
        shelf_assembly = shelf_assembly.union(s)

    # --- Shoe rack (30 pairs, 5 rows x 6) ---
    shoe_x = 0
    shoe_y = ROOM_D - 300
    shoe_base = None
    for i in range(5):
        s = cq.Workplane("XY").box(1500, 300, MDP_T).translate((shoe_x + 750, shoe_y - 150, 100 + i * 150))
        if shoe_base is None:
            shoe_base = s
        else:
            shoe_base = shoe_base.union(s)

    # --- Boot rack (6 pairs, 2 rows x 3) ---
    boot_x = 1500
    for i in range(2):
        s = cq.Workplane("XY").box(1050, 350, MDP_T).translate((boot_x + 525, shoe_y - 175, 100 + i * 400))
        shoe_base = shoe_base.union(s)

    # --- Vitrines bags (3 cols x 5 shelves, glass) ---
    vit_x = ROOM_W - 1050
    vit_y = ROOM_D - 350
    vit_base = None
    # Side panels
    for dx in [0, 350, 700, 1050]:
        panel = cq.Workplane("XY").box(MDP_T, 350, 2000).translate((vit_x + dx, vit_y - 175, 1000))
        if vit_base is None:
            vit_base = panel
        else:
            vit_base = vit_base.union(panel)
    # Glass shelves
    for i in range(15):
        col = i // 5
        row = i % 5
        gs = cq.Workplane("XY").box(332, 350, GLASS_T).translate((vit_x + 175 + col * 350, vit_y - 175, 200 + row * 400))
        vit_base = vit_base.union(gs)

    # --- Steamer niche ---
    niche = cq.Workplane("XY").box(300, 400, 1800).translate((2600, y_back + 200, 900))

    # --- Luggage area (top shelf) ---
    luggage = cq.Workplane("XY").box(2000, 600, MDP_T).translate((1000, y_back + 300, 2200))

    # Combine
    result = bar_long.union(bar_upper).union(bar_lower)
    result = result.union(shelf_assembly).union(shoe_base).union(vit_base)
    result = result.union(luggage)
    return result

# ─── ILHA CENTRAL ───
def make_ilha():
    x_c = ROOM_W / 2
    y_c = ROOM_D / 2
    w, d, h = 1200, 600, 900

    # Structure
    body = cq.Workplane("XY").box(w, d, h).translate((x_c, y_c, h/2))

    # Glass top
    glass = cq.Workplane("XY").box(w, d, GLASS_T).translate((x_c, y_c, h + GLASS_T/2))

    # Drawer fronts (5 drawers, each 140mm front height)
    drawers = None
    for i in range(5):
        dr = cq.Workplane("XY").box(w - 36, MDP_T, 140).translate((x_c, y_c - d/2 + MDP_T/2, 70 + i * 160))
        if drawers is None:
            drawers = dr
        else:
            drawers = drawers.union(dr)

    result = body.union(glass)
    if drawers:
        result = result.union(drawers)
    return result

# ─── MAKEUP AREA ───
def make_makeup():
    # Against east wall
    x_pos = ROOM_W - 500/2
    y_pos = ROOM_D / 2 - 600

    # Countertop
    counter = cq.Workplane("XY").box(1190, 500, MDP_T).translate((ROOM_W - 595, y_pos, 750))

    # Side panels
    side1 = cq.Workplane("XY").box(MDP_T, 500, 750).translate((ROOM_W - 1190, y_pos, 375))
    side2 = cq.Workplane("XY").box(MDP_T, 500, 750).translate((ROOM_W, y_pos, 375))

    # Mirror
    mirror = cq.Workplane("XY").box(800, MIRROR_T, 1000).translate((ROOM_W - 400, y_pos - 250 + MIRROR_T/2, 750 + 500))

    result = counter.union(side1).union(side2).union(mirror)
    return result

# ─── AREA ARMAS ───
def make_armas():
    # West wall area
    w, d, h = 1360, 600, 2400
    x_pos = d / 2
    y_pos = 800

    # Cabinet structure
    cabinet = cq.Workplane("XY").box(d, w, h).translate((x_pos, y_pos + w/2, h/2))

    # Mirror door (front face)
    mirror_door = cq.Workplane("XY").box(MIRROR_T, w - 36, h - 36).translate((d + MIRROR_T/2, y_pos + w/2, h/2))

    # Internal shelves
    shelves = None
    for i in range(6):
        s = cq.Workplane("XY").box(d - 36, w - 36, MDP_T).translate((x_pos, y_pos + w/2, 300 + i * 350))
        if shelves is None:
            shelves = s
        else:
            shelves = shelves.union(s)

    result = cabinet.union(mirror_door)
    if shelves:
        result = result.union(shelves)
    return result

# ─── CLOSET HIS (South wall) ───
def make_closet_his():
    modules = bom["zones"]["closet_his"]["modules"]
    x_pos = 600  # start after armas area
    result = None

    for mod in modules:
        w = mod["width_mm"]
        h = mod["height_mm"]
        d = mod["depth_mm"]

        # Side panels
        left = cq.Workplane("XY").box(MDP_T, d, h).translate((x_pos, d/2, h/2))
        right = cq.Workplane("XY").box(MDP_T, d, h).translate((x_pos + w, d/2, h/2))

        body = left.union(right)

        # Shelves
        n_shelves = mod.get("shelves", mod.get("shoe_shelves", 0))
        for i in range(n_shelves):
            s = cq.Workplane("XY").box(w - 36, d - 20, MDP_T).translate((x_pos + w/2, d/2, 200 + i * ((h - 200) / max(n_shelves, 1))))
            body = body.union(s)

        # Hanging bar
        if mod.get("hanging_bar"):
            bar = cq.Workplane("XZ").cylinder(w - 50, BAR_D/2).rotateAboutCenter((0,1,0), 90)
            bar = bar.translate((x_pos + w/2, d/2, mod["bar_height_mm"]))
            body = body.union(bar)

        if result is None:
            result = body
        else:
            result = result.union(body)

        x_pos += w

    return result

# ─── GENERATE ───
print("Generating room...")
room = make_room()

print("Generating Closet Her...")
closet_her = make_closet_her()

print("Generating Ilha Central...")
ilha = make_ilha()

print("Generating Makeup Area...")
makeup = make_makeup()

print("Generating Area Armas...")
armas = make_armas()

print("Generating Closet His...")
closet_his = make_closet_his()

# Combine all
print("Combining all parts...")
full_model = room.union(closet_her).union(ilha).union(makeup).union(armas).union(closet_his)

# Export STEP
print("Exporting STEP...")
cq.exporters.export(full_model, f"{OUT}/3d_model.step")
print(f"  -> {OUT}/3d_model.step")

# Export STL
print("Exporting STL...")
cq.exporters.export(full_model, f"{OUT}/3d_model.stl")
print(f"  -> {OUT}/3d_model.stl")

# Export DXF - planta baixa (XY projection at Z=500)
print("Exporting DXF planta baixa...")
try:
    section_plane = cq.Workplane("XY").workplane(offset=500)
    planta = full_model.section(500)
    cq.exporters.export(planta, f"{OUT}/planta_baixa.dxf")
    print(f"  -> {OUT}/planta_baixa.dxf")
except Exception as e:
    print(f"  DXF planta baixa failed: {e}")
    # Fallback: export using ezdxf directly
    try:
        import ezdxf
        doc = ezdxf.new()
        msp = doc.modelspace()
        # Draw room outline
        msp.add_lwpolyline([(0,0), (ROOM_W,0), (ROOM_W,ROOM_D), (0,ROOM_D), (0,0)])
        # Door opening
        door_x1 = (ROOM_W - DOOR_W) / 2
        msp.add_line((door_x1, 0), (door_x1 + DOOR_W, 0), dxfattribs={"color": 1})
        doc.saveas(f"{OUT}/planta_baixa.dxf")
        print(f"  -> {OUT}/planta_baixa.dxf (fallback ezdxf)")
    except Exception as e2:
        print(f"  DXF fallback also failed: {e2}")

# Export elevation DXFs
print("Exporting elevation DXFs...")
for wall_name, plane, offset in [
    ("norte", "XZ", ROOM_D),
    ("sul", "XZ", 0),
    ("leste", "YZ", ROOM_W),
    ("oeste", "YZ", 0)
]:
    try:
        elev = full_model.section(offset) if plane == "XZ" else full_model.section(offset)
        cq.exporters.export(elev, f"{OUT}/elevacao_{wall_name}.dxf")
        print(f"  -> {OUT}/elevacao_{wall_name}.dxf")
    except Exception as e:
        print(f"  elevacao_{wall_name}.dxf failed: {e}")

print("\nDone! All files generated.")
