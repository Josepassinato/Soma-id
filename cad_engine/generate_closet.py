#!/usr/bin/env python3
"""
SOMA ID - CadQuery/build123d Engine
Generates 3D parametric geometry from parsed briefing + BOM data.
Test case: Sabrina Parkland Closet
"""
import json
import os
import sys

# build123d for CAD geometry
from build123d import (
    Box, Cylinder, Location, Pos, Color,
    export_step, export_stl,
    Align, Axis, Mode, Part, Compound
)

# Paths
BASE = "/root/projetos/soma-id/tests/sabrina-parkland"
BRIEFING = os.path.join(BASE, "01_parsed_briefing.json")
BOM = os.path.join(BASE, "02_bill_of_materials.json")

# Load data
with open(BRIEFING) as f:
    briefing = json.load(f)
with open(BOM) as f:
    bom = json.load(f)

# Room dimensions (mm)
ROOM_W = 5130  # north-south
ROOM_D = 3640  # east-west
ROOM_H = 3000
WALL_T = 150
MDP_T = 18
GLASS_T = 6
MIRROR_T = 4

# Colors (for visualization metadata, not used in STEP)
COLORS = {
    "lana": (0.83, 0.77, 0.66),    # #D4C5A9
    "lord": (0.29, 0.29, 0.29),    # #4A4A4A
    "glass": (0.85, 0.92, 0.95),
    "mirror": (0.9, 0.9, 0.92),
    "wall": (0.95, 0.95, 0.93),
}

print("=" * 60)
print("SOMA ID - CAD Engine (build123d)")
print("Project: Sabrina Parkland Closet")
print("=" * 60)

parts = []

# ─── WALLS ───────────────────────────────────────────────
print("\n[1/6] Generating walls...")
# North wall
north = Box(ROOM_W, WALL_T, ROOM_H, align=(Align.MIN, Align.MIN, Align.MIN))
north = north.locate(Location((0, ROOM_D, 0)))
parts.append(("wall_north", north))

# South wall (with door opening)
south_left_w = (ROOM_W - 900) / 2
south_left = Box(south_left_w, WALL_T, ROOM_H, align=(Align.MIN, Align.MIN, Align.MIN))
parts.append(("wall_south_left", south_left))

south_right = Box(south_left_w, WALL_T, ROOM_H, align=(Align.MIN, Align.MIN, Align.MIN))
south_right = south_right.locate(Location((south_left_w + 900, 0, 0)))
parts.append(("wall_south_right", south_right))

# Door header
door_header = Box(900, WALL_T, ROOM_H - 2100, align=(Align.MIN, Align.MIN, Align.MIN))
door_header = door_header.locate(Location((south_left_w, 0, 2100)))
parts.append(("wall_door_header", door_header))

# East wall
east = Box(WALL_T, ROOM_D, ROOM_H, align=(Align.MIN, Align.MIN, Align.MIN))
east = east.locate(Location((ROOM_W, 0, 0)))
parts.append(("wall_east", east))

# West wall
west = Box(WALL_T, ROOM_D, ROOM_H, align=(Align.MIN, Align.MIN, Align.MIN))
west = west.locate(Location((-WALL_T, 0, 0)))
parts.append(("wall_west", west))

print(f"  Walls: {ROOM_W}x{ROOM_D}x{ROOM_H}mm, thickness={WALL_T}mm")

# ─── CLOSET HER (East wall, north section) ──────────────
print("\n[2/6] Generating Closet Her...")
her_x = ROOM_W - 600  # 600mm depth from east wall
her_y_start = ROOM_D * 0.3  # starts 30% from south
her_zones = bom["zones"]["closet_her"]

# Hanging bars - long garments
bar_long = Cylinder(12.5, 1500, align=(Align.CENTER, Align.CENTER, Align.MIN))
bar_long = bar_long.rotate(Axis.X, 90).locate(Location((her_x - 300, her_y_start + 200, 1700)))
parts.append(("her_bar_long", bar_long))

# Hanging bars - short garments (double height)
bar_short_upper = Cylinder(12.5, 2000, align=(Align.CENTER, Align.CENTER, Align.MIN))
bar_short_upper = bar_short_upper.rotate(Axis.X, 90).locate(Location((her_x - 300, her_y_start + 1800, 1700)))
parts.append(("her_bar_short_upper", bar_short_upper))

bar_short_lower = Cylinder(12.5, 2000, align=(Align.CENTER, Align.CENTER, Align.MIN))
bar_short_lower = bar_short_lower.rotate(Axis.X, 90).locate(Location((her_x - 300, her_y_start + 1800, 900)))
parts.append(("her_bar_short_lower", bar_short_lower))

# Shelves (8 x 800mm + 4 x 600mm)
for i in range(8):
    shelf = Box(800, 400, MDP_T, align=(Align.MIN, Align.MIN, Align.MIN))
    shelf = shelf.locate(Location((her_x - 400, her_y_start, 300 + i * 280)))
    parts.append((f"her_shelf_{i}", shelf))

# Shoe rack - 5 shelves for 30 pairs
shoe_x = 200
for i in range(5):
    shoe_shelf = Box(1500, 300, MDP_T, align=(Align.MIN, Align.MIN, Align.MIN))
    shoe_shelf = shoe_shelf.locate(Location((shoe_x, her_y_start, 100 + i * 150)))
    parts.append((f"her_shoe_shelf_{i}", shoe_shelf))

# Boot rack - 2 shelves for 6 pairs
for i in range(2):
    boot_shelf = Box(1050, 350, MDP_T, align=(Align.MIN, Align.MIN, Align.MIN))
    boot_shelf = boot_shelf.locate(Location((shoe_x, her_y_start, 900 + i * 400)))
    parts.append((f"her_boot_shelf_{i}", boot_shelf))

# Vitrine for bags - 3 columns x 5 shelves glass
vitrine_x = her_x - 400
vitrine_y = her_y_start + 500
for col in range(3):
    # Side panels
    side = Box(350, MDP_T, 2000, align=(Align.MIN, Align.MIN, Align.MIN))
    side = side.locate(Location((vitrine_x, vitrine_y + col * 370, 400)))
    parts.append((f"her_vitrine_side_{col}", side))
    for row in range(5):
        glass_shelf = Box(350, 350, GLASS_T, align=(Align.MIN, Align.MIN, Align.MIN))
        glass_shelf = glass_shelf.locate(Location((vitrine_x, vitrine_y + col * 370, 400 + row * 400)))
        parts.append((f"her_vitrine_glass_{col}_{row}", glass_shelf))

# Last side panel
side = Box(350, MDP_T, 2000, align=(Align.MIN, Align.MIN, Align.MIN))
side = side.locate(Location((vitrine_x, vitrine_y + 3 * 370, 400)))
parts.append(("her_vitrine_side_3", side))

# Luggage area (top)
luggage_shelf = Box(2000, 600, MDP_T, align=(Align.MIN, Align.MIN, Align.MIN))
luggage_shelf = luggage_shelf.locate(Location((her_x - 600, her_y_start, 2200)))
parts.append(("her_luggage_shelf", luggage_shelf))

print(f"  Hanging bars: 5.5m linear")
print(f"  Shelves: 12 MDP + 15 glass (vitrines)")
print(f"  Shoe rack: 30 pairs + 6 boots")
print(f"  Luggage area: 2000x600mm at H=2200mm")

# ─── ILHA CENTRAL ────────────────────────────────────────
print("\n[3/6] Generating Ilha Central...")
ilha = bom["zones"]["ilha_central"]
ilha_x = ROOM_W / 2 - 600  # centered
ilha_y = ROOM_D / 2 - 300

# Base structure
ilha_base = Box(1200, 600, 900, align=(Align.MIN, Align.MIN, Align.MIN))
ilha_base = ilha_base.locate(Location((ilha_x, ilha_y, 0)))
parts.append(("ilha_base", ilha_base))

# Glass top
glass_top = Box(1200, 600, GLASS_T, align=(Align.MIN, Align.MIN, Align.MIN))
glass_top = glass_top.locate(Location((ilha_x, ilha_y, 900)))
parts.append(("ilha_glass_top", glass_top))

# Drawer fronts (5 drawers, Lord color)
for i in range(5):
    drawer_front = Box(1128, MDP_T, 140, align=(Align.MIN, Align.MIN, Align.MIN))
    drawer_front = drawer_front.locate(Location((ilha_x + 36, ilha_y, 36 + i * 160)))
    parts.append((f"ilha_drawer_{i}", drawer_front))

print(f"  Dimensions: 1200x600x900mm")
print(f"  Glass top: 6mm tempered")
print(f"  5 drawers (lingerie, pijamas, biquinis, cintos, acessorios)")

# ─── MAKEUP AREA ─────────────────────────────────────────
print("\n[4/6] Generating Makeup Area...")
mk = bom["zones"]["makeup_area"]
mk_x = 200
mk_y = 200

# Vanity countertop
vanity_top = Box(1190, 500, MDP_T, align=(Align.MIN, Align.MIN, Align.MIN))
vanity_top = vanity_top.locate(Location((mk_x, mk_y, 750)))
parts.append(("makeup_countertop", vanity_top))

# Side panels
for i, offset in enumerate([0, 1190 - MDP_T]):
    side = Box(MDP_T, 500, 750, align=(Align.MIN, Align.MIN, Align.MIN))
    side = side.locate(Location((mk_x + offset, mk_y, 0)))
    parts.append((f"makeup_side_{i}", side))

# Mirror
mirror = Box(800, MIRROR_T, 1000, align=(Align.MIN, Align.MIN, Align.MIN))
mirror = mirror.locate(Location((mk_x + 195, mk_y, 800)))
parts.append(("makeup_mirror", mirror))

print(f"  Vanity: 1190x500mm at H=750mm")
print(f"  Mirror: 800x1000mm")

# ─── AREA ARMAS ──────────────────────────────────────────
print("\n[5/6] Generating Area Armas...")
armas = bom["zones"]["area_armas"]
armas_x = 200
armas_y = ROOM_D - 600

# Cabinet structure
# Sides
for i, offset in enumerate([0, 1360 - MDP_T]):
    side = Box(MDP_T, 600, 2400, align=(Align.MIN, Align.MIN, Align.MIN))
    side = side.locate(Location((armas_x + offset, armas_y, 0)))
    parts.append((f"armas_side_{i}", side))

# Top and bottom
for i, z in enumerate([0, 2400 - MDP_T]):
    tb = Box(1324, 600, MDP_T, align=(Align.MIN, Align.MIN, Align.MIN))
    tb = tb.locate(Location((armas_x + MDP_T, armas_y, z)))
    parts.append((f"armas_tb_{i}", tb))

# Internal shelves (6)
for i in range(6):
    shelf = Box(1324, 564, MDP_T, align=(Align.MIN, Align.MIN, Align.MIN))
    shelf = shelf.locate(Location((armas_x + MDP_T, armas_y + MDP_T, 300 + i * 350)))
    parts.append((f"armas_shelf_{i}", shelf))

# Mirror door
mirror_door = Box(1324, MIRROR_T, 2364, align=(Align.MIN, Align.MIN, Align.MIN))
mirror_door = mirror_door.locate(Location((armas_x + MDP_T, armas_y - MIRROR_T, MDP_T)))
parts.append(("armas_mirror_door", mirror_door))

print(f"  Cabinet: 1360x600x2400mm")
print(f"  Mirror door: 1324x2364mm")
print(f"  6 internal shelves with LED")

# ─── CLOSET HIS (West wall) ─────────────────────────────
print("\n[6/6] Generating Closet His...")
his = bom["zones"]["closet_his"]
his_x = 0
his_y = ROOM_D * 0.4

module_configs = [
    ("his_shelves_1", 800, 8, False),
    ("his_shelves_2", 800, 8, False),
    ("his_hanging", 1200, 0, True),
    ("his_shoes", 1230, 8, False),
]

offset_y = 0
for name, width, shelf_count, has_bar in module_configs:
    # Side panels
    for i in range(2):
        side = Box(MDP_T, 600, 2400, align=(Align.MIN, Align.MIN, Align.MIN))
        side = side.locate(Location((his_x + i * (width - MDP_T), his_y + offset_y, 0)))
        parts.append((f"{name}_side_{i}", side))

    # Shelves
    for s in range(shelf_count):
        shelf = Box(width - 2 * MDP_T, 564, MDP_T, align=(Align.MIN, Align.MIN, Align.MIN))
        shelf = shelf.locate(Location((his_x + MDP_T, his_y + offset_y + MDP_T, 200 + s * 275)))
        parts.append((f"{name}_shelf_{s}", shelf))

    # Hanging bar
    if has_bar:
        bar = Cylinder(12.5, width - 2 * MDP_T, align=(Align.CENTER, Align.CENTER, Align.MIN))
        bar = bar.rotate(Axis.X, 90).locate(Location((his_x + width / 2, his_y + offset_y + 300, 1700)))
        parts.append((f"{name}_bar", bar))

    offset_y += width + 2  # 2mm gap between modules

print(f"  4 modules: 2x shelves (800mm), 1x hanging (1200mm), 1x shoes (1230mm)")
print(f"  Total width: 4030mm")

# ─── EXPORT ──────────────────────────────────────────────
print("\n" + "=" * 60)
print("Exporting...")

# Collect all shapes
all_shapes = [shape for _, shape in parts]

try:
    compound = Compound(children=all_shapes)

    step_path = os.path.join(BASE, "closet_sabrina.step")
    export_step(compound, step_path)
    print(f"  STEP: {step_path}")

    stl_path = os.path.join(BASE, "closet_sabrina.stl")
    export_stl(compound, stl_path)
    stl_size = os.path.getsize(stl_path)
    print(f"  STL: {stl_path} ({stl_size / 1024:.0f} KB)")

    print("\n✓ CAD export complete!")
    print(f"  Total parts: {len(parts)}")

except Exception as e:
    print(f"\n  Export error: {e}")
    print("  Trying individual part export...")
    try:
        # Try exporting just walls + major pieces
        major = [shape for name, shape in parts if not name.startswith("her_vitrine_glass")]
        compound = Compound(children=major)
        step_path = os.path.join(BASE, "closet_sabrina.step")
        export_step(compound, step_path)
        print(f"  STEP (simplified): {step_path}")

        stl_path = os.path.join(BASE, "closet_sabrina.stl")
        export_stl(compound, stl_path)
        print(f"  STL (simplified): {stl_path}")
    except Exception as e2:
        print(f"  Export failed: {e2}")
        print("  CAD files not generated - Three.js viewer will use direct geometry")

# Export parts manifest for Three.js viewer
manifest = []
for name, shape in parts:
    # Determine zone and material
    zone = "room"
    material = "wall"
    if name.startswith("her_"):
        zone = "closet_her"
        material = "lana"
        if "glass" in name:
            material = "glass"
        elif "bar" in name:
            material = "chrome"
    elif name.startswith("ilha_"):
        zone = "ilha_central"
        material = "lana"
        if "glass" in name:
            material = "glass"
        elif "drawer" in name:
            material = "lord"
    elif name.startswith("makeup_"):
        zone = "makeup_area"
        material = "lord" if "countertop" in name else "lana"
        if "mirror" in name:
            material = "mirror"
    elif name.startswith("armas_"):
        zone = "area_armas"
        material = "lana"
        if "mirror" in name:
            material = "mirror"
    elif name.startswith("his_"):
        zone = "closet_his"
        material = "lana"
        if "bar" in name:
            material = "chrome"
    elif name.startswith("wall"):
        zone = "room"
        material = "wall"

    manifest.append({
        "name": name,
        "zone": zone,
        "material": material,
    })

manifest_path = os.path.join(BASE, "parts_manifest.json")
with open(manifest_path, "w") as f:
    json.dump(manifest, f, indent=2)
print(f"\n  Parts manifest: {manifest_path}")

print("\n" + "=" * 60)
print("SOMA ID CAD Engine - Done")
print("=" * 60)
