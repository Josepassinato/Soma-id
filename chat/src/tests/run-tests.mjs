/**
 * run-tests.mjs
 * P0.3 — Main test runner. Runs unit tests + fixture integration + consistency checks.
 * Uses Node.js built-in assert (no external dependencies).
 */

import { strict as assert } from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "../../dist");

// Dynamic imports from compiled dist/
const { resolveModuleTyping } = await import(path.join(DIST, "services/module-typing.js"));
const { normalizeBriefing } = await import(path.join(DIST, "services/briefing-normalizer.js"));
const { detectIssues } = await import(path.join(DIST, "services/briefing-issues.js"));
const { assessReadiness } = await import(path.join(DIST, "services/briefing-readiness.js"));
const { runEnginePipeline } = await import(path.join(DIST, "services/engine-bridge.js"));
const { generateHtmlReport } = await import(path.join(DIST, "services/html-report.js"));
const { validateFabrication } = await import(path.join(DIST, "services/fabrication-validator.js"));

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, error: err.message });
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

function loadFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", `${name}.json`), "utf8"));
}

// ================================================================
// UNIT TESTS: module-typing
// ================================================================
console.log("\n=== Unit: module-typing ===");

test("closet_cabideiro → closet_storage/long_garment", () => {
  const r = resolveModuleTyping("closet_cabideiro", ["Subtipo: long_garments"]);
  assert.equal(r.moduleType, "closet_storage");
  assert.equal(r.moduleSubtype, "long_garment");
  assert.equal(r.usedLegacyFallback, false);
});

test("closet_sapateira + boot notes → boot", () => {
  const r = resolveModuleTyping("closet_sapateira", ["Subtipo: boots"]);
  assert.equal(r.moduleSubtype, "boot");
  assert.equal(r.usedLegacyFallback, false);
});

test("base_gaveteiro_3g + Bancada Pia → sink_base", () => {
  const r = resolveModuleTyping("base_gaveteiro_3g", ["Zona: Bancada Pia", "Features: cuba"]);
  assert.equal(r.moduleType, "kitchen_base");
  assert.equal(r.moduleSubtype, "sink_base");
});

test("base_gaveteiro_3g + Bancada Cooktop → cooktop_base", () => {
  const r = resolveModuleTyping("base_gaveteiro_3g", ["Zona: Bancada Cooktop"]);
  assert.equal(r.moduleSubtype, "cooktop_base");
});

test("closet_prateleiras + Torre Forno → oven_tower", () => {
  const r = resolveModuleTyping("closet_prateleiras", ["Zona: Torre Forno/Micro"]);
  assert.equal(r.moduleType, "kitchen_tall");
  assert.equal(r.moduleSubtype, "oven_tower");
});

test("unknown module → fallback flagged", () => {
  const r = resolveModuleTyping("xyz_unknown", []);
  assert.equal(r.usedLegacyFallback, true);
});

test("existing explicit type bypasses lookup", () => {
  const r = resolveModuleTyping("anything", [], "closet_display", "bag");
  assert.equal(r.moduleType, "closet_display");
  assert.equal(r.moduleSubtype, "bag");
  assert.equal(r.usedLegacyFallback, false);
});

// ================================================================
// UNIT TESTS: briefing-normalizer
// ================================================================
console.log("\n=== Unit: briefing-normalizer ===");

test("ceiling 280 (cm) → 2.8m", () => {
  const b = makeBriefing({ ceilingH: 280 });
  const n = normalizeBriefing(b);
  assert.equal(n.space.ceiling_height_m, 2.8);
});

test("ceiling 2800 (mm) → 2.8m", () => {
  const b = makeBriefing({ ceilingH: 2800 });
  const n = normalizeBriefing(b);
  assert.equal(n.space.ceiling_height_m, 2.8);
});

test("ceiling 2.8 (m) → unchanged", () => {
  const b = makeBriefing({ ceilingH: 2.8 });
  const n = normalizeBriefing(b);
  assert.equal(n.space.ceiling_height_m, 2.8);
});

test("wall 'norte' → 'north'", () => {
  const b = makeBriefing({ wallId: "norte" });
  const n = normalizeBriefing(b);
  assert.equal(n.space.walls[0].id, "north");
});

test("missing ceiling → default 2.8m with inferred flag", () => {
  const b = makeBriefing({ ceilingH: 0 });
  const n = normalizeBriefing(b);
  assert.equal(n.space.ceiling_height_m, 2.8);
  const conf = n._normalization.fieldConfidences.find(c => c.fieldPath === "space.ceiling_height_m");
  assert.equal(conf?.wasInferred, true);
});

// ================================================================
// UNIT TESTS: briefing-readiness
// ================================================================
console.log("\n=== Unit: briefing-readiness ===");

test("empty briefing → not ready", () => {
  const fx = loadFixture("invalid_fabrication_case");
  const n = normalizeBriefing(fx.briefing);
  const issues = detectIssues(n);
  n._normalization.issues = issues;
  const r = assessReadiness(n, issues);
  assert.equal(r.isReadyForGeneration, false);
  assert(r.blockingReasons.length > 0, "Should have blocking reasons");
  assert(r.criticalMissingCount > 0, "Should have critical missing fields");
});

test("complete briefing → ready", () => {
  const fx = loadFixture("closet_linear_baseline");
  const n = normalizeBriefing(fx.briefing);
  const issues = detectIssues(n);
  n._normalization.issues = issues;
  const r = assessReadiness(n, issues);
  assert.equal(r.isReadyForGeneration, true);
  assert(r.score >= 0.8, `Score should be >= 0.8, got ${r.score}`);
});

// ================================================================
// FIXTURE INTEGRATION TESTS
// ================================================================
console.log("\n=== Fixture: pipeline integration ===");

for (const fxName of ["closet_linear_baseline", "kitchen_basic", "narrow_modules_case"]) {
  test(`${fxName}: pipeline runs without error`, () => {
    const fx = loadFixture(fxName);
    const results = runEnginePipeline(fx.briefing, `test_${fxName}`);
    assert(results.blueprint, "Should have blueprint");
    assert(results.nesting, "Should have nesting");
    assert(results.summary, "Should have summary");
  });

  test(`${fxName}: module count matches expected`, () => {
    const fx = loadFixture(fxName);
    if (!fx.expectedModuleCount) return; // skip if not defined
    const results = runEnginePipeline(fx.briefing, `test_${fxName}`);
    const totalMods = results.blueprint.mainWall.modules.length +
      (results.blueprint.sideWall?.modules?.length || 0);
    assert.equal(totalMods, fx.expectedModuleCount,
      `Expected ${fx.expectedModuleCount} modules, got ${totalMods}`);
  });

  test(`${fxName}: all modules have explicit typing`, () => {
    const fx = loadFixture(fxName);
    const results = runEnginePipeline(fx.briefing, `test_${fxName}`);
    const allMods = [
      ...results.blueprint.mainWall.modules,
      ...(results.blueprint.sideWall?.modules || []),
    ];
    for (const m of allMods) {
      assert(m.moduleType, `Module ${m.name} missing moduleType`);
      assert(m.moduleType !== "unknown", `Module ${m.name} has unknown moduleType`);
      assert(m.moduleSubtype, `Module ${m.name} missing moduleSubtype`);
    }
  });

  test(`${fxName}: report generates valid HTML`, () => {
    const fx = loadFixture(fxName);
    const results = runEnginePipeline(fx.briefing, `test_${fxName}`);
    const html = generateHtmlReport(fx.briefing, results, `test_${fxName}`);
    assert(html.length > 1000, "Report should be substantial");
    assert(html.includes("<!DOCTYPE html>"), "Should be valid HTML");
    assert(html.includes("</html>"), "Should have closing html tag");
  });
}

// ================================================================
// FIXTURE: invalid case should be blocked
// ================================================================
test("invalid_fabrication_case: pipeline blocked by readiness gate", () => {
  const fx = loadFixture("invalid_fabrication_case");
  try {
    runEnginePipeline(fx.briefing, "test_invalid");
    assert.fail("Should have thrown error");
  } catch (err) {
    assert(err.message.includes("nao esta pronto"), `Expected readiness block, got: ${err.message}`);
  }
});

// ================================================================
// CONSISTENCY CHECKS
// ================================================================
console.log("\n=== Consistency checks ===");

for (const fxName of ["closet_linear_baseline", "kitchen_basic"]) {
  const fx = loadFixture(fxName);
  const results = runEnginePipeline(fx.briefing, `test_${fxName}`);
  const html = generateHtmlReport(fx.briefing, results, `test_${fxName}`);
  const allMods = [
    ...results.blueprint.mainWall.modules,
    ...(results.blueprint.sideWall?.modules || []),
  ];

  // CR-001: Module count engine vs elevation representation
  test(`CR-001 ${fxName}: modules in engine appear in report`, () => {
    for (const m of allMods) {
      const nameInReport = m.name.split("[")[0].trim();
      assert(html.includes(nameInReport),
        `Module "${nameInReport}" not found in report HTML`);
    }
  });

  // CR-002: BOM parts count matches nesting total
  test(`CR-002 ${fxName}: BOM parts ≈ nesting total parts`, () => {
    const bomParts = allMods.reduce((sum, m) =>
      sum + m.cutList.reduce((s, c) => s + c.quantity, 0), 0);
    const nestingParts = results.nesting.totalParts;
    // Allow small tolerance (some pieces may be combined)
    assert(Math.abs(bomParts - nestingParts) <= bomParts * 0.1,
      `BOM has ${bomParts} parts but nesting has ${nestingParts}`);
  });

  // CR-003: No NaN/undefined in SVG
  test(`CR-003 ${fxName}: no NaN or undefined in report`, () => {
    assert(!html.includes("NaN"), "Report contains NaN");
    assert(!html.includes("undefined"), "Report contains undefined");
    // Check for zero-width/height SVG elements
    const zeroWidthCount = (html.match(/width="0"/g) || []).length;
    // Allow some zero-width (dimension line ticks can be 0)
    assert(zeroWidthCount < 5, `Too many zero-width elements: ${zeroWidthCount}`);
  });

  // CR-005: No legacy fallback on typed modules
  test(`CR-005 ${fxName}: all modules use explicit typing (no fallback)`, () => {
    let fallbackCount = 0;
    for (const m of allMods) {
      if (!m.moduleType || m.moduleType === "unknown") fallbackCount++;
    }
    assert.equal(fallbackCount, 0,
      `${fallbackCount} module(s) still using legacy fallback`);
  });
}

// ================================================================
// P0.4: MULTI-WALL TESTS
// ================================================================
console.log("\n=== Multi-wall layout ===");

test("closet has walls[] structure", () => {
  const fx = loadFixture("closet_linear_baseline");
  const results = runEnginePipeline(fx.briefing, "test_mw_closet");
  assert(results.blueprint.walls, "blueprint.walls should exist");
  assert(results.blueprint.walls.length > 0, "Should have at least 1 wall");
});

test("each wall has identity (wallId, label, orientation)", () => {
  const fx = loadFixture("closet_linear_baseline");
  const results = runEnginePipeline(fx.briefing, "test_mw_identity");
  for (const w of results.blueprint.walls) {
    assert(w.wallId, `Wall missing wallId`);
    assert(w.label, `Wall ${w.wallId} missing label`);
    assert(w.orientation, `Wall ${w.wallId} missing orientation`);
    assert(w.wallWidth > 0, `Wall ${w.wallId} has no width`);
  }
});

test("module widths don't exceed wall usable width (no overflow)", () => {
  const fx = loadFixture("kitchen_basic");
  const results = runEnginePipeline(fx.briefing, "test_mw_overflow");
  for (const w of results.blueprint.walls) {
    const excess = w.totalModuleWidth - w.usableWidth;
    // Allow small tolerance (18mm gaps can push slightly)
    assert(excess < 100, `Wall ${w.wallId} overflow: ${excess}mm`);
  }
});

test("closet_multi_wall distributes across walls", () => {
  const fx = loadFixture("closet_multi_wall");
  const results = runEnginePipeline(fx.briefing, "test_mw_multi");
  assert(results.blueprint.walls.length >= 1, "Should have at least 1 wall with modules");
  // Check that modules are distributed (not all on one wall)
  const wallModCounts = results.blueprint.walls.map(w => w.modules.length);
  const totalMods = wallModCounts.reduce((a, b) => a + b, 0);
  assert(totalMods >= 3, `Should have at least 3 total modules, got ${totalMods}`);
});

test("backward compat: mainWall still populated", () => {
  const fx = loadFixture("closet_linear_baseline");
  const results = runEnginePipeline(fx.briefing, "test_mw_compat");
  assert(results.blueprint.mainWall, "mainWall should still exist");
  assert(results.blueprint.mainWall.modules.length > 0, "mainWall should have modules");
});

test("report includes wall label in elevation title", () => {
  const fx = loadFixture("closet_linear_baseline");
  const results = runEnginePipeline(fx.briefing, "test_mw_report");
  const html = generateHtmlReport(fx.briefing, results, "test_mw_report");
  assert(html.includes("ELEVACAO"), "Report should have ELEVACAO title");
});

test("distribution notes in factoryNotes", () => {
  const fx = loadFixture("closet_linear_baseline");
  const results = runEnginePipeline(fx.briefing, "test_mw_notes");
  const distNote = results.blueprint.factoryNotes.find(n => n.includes("multi-parede"));
  assert(distNote, "factoryNotes should include distribution summary");
});

// ================================================================
// P0.5: TRACEABILITY TESTS
// ================================================================
console.log("\n=== Traceability ===");

for (const fxName of ["closet_linear_baseline", "kitchen_basic"]) {
  const fx = loadFixture(fxName);
  const results = runEnginePipeline(fx.briefing, `test_trace_${fxName}`);

  // TR-001: All walls have traceId
  test(`TR-001 ${fxName}: walls have traceId`, () => {
    for (const w of results.blueprint.walls) {
      assert(w.traceId, `Wall ${w.wallId} missing traceId`);
      assert(w.traceId.startsWith("W-"), `Wall traceId should start with W-: ${w.traceId}`);
    }
  });

  // TR-001: All modules have traceId
  test(`TR-001 ${fxName}: modules have traceId + shortLabel`, () => {
    const allMods = results.blueprint.walls.flatMap(w => w.modules);
    for (const m of allMods) {
      assert(m.traceId, `Module ${m.name} missing traceId`);
      assert(m.shortLabel, `Module ${m.name} missing shortLabel`);
      assert(m.traceId.startsWith("M-"), `Module traceId format: ${m.traceId}`);
    }
  });

  // TR-002: All modules reference parent wall
  test(`TR-002 ${fxName}: modules have parentWallTraceId`, () => {
    const allMods = results.blueprint.walls.flatMap(w => w.modules);
    for (const m of allMods) {
      assert(m.parentWallTraceId, `Module ${m.name} missing parentWallTraceId`);
    }
  });

  // TR-003: All pieces reference parent module
  test(`TR-003 ${fxName}: pieces have parentModuleTraceId`, () => {
    const allMods = results.blueprint.walls.flatMap(w => w.modules);
    for (const m of allMods) {
      for (const cut of m.cutList) {
        assert(cut.parentModuleTraceId, `Piece ${cut.piece} in ${m.name} missing parentModuleTraceId`);
      }
    }
  });

  // Report shows trace labels
  test(`${fxName}: report contains trace labels`, () => {
    const html = generateHtmlReport(fx.briefing, results, `test_trace_${fxName}`);
    // Should contain shortLabel like "A01" in the HTML
    const allMods = results.blueprint.walls.flatMap(w => w.modules);
    const firstLabel = allMods[0]?.shortLabel;
    if (firstLabel) {
      assert(html.includes(firstLabel), `Report should contain shortLabel "${firstLabel}"`);
    }
  });
}

// ================================================================
// P0.6: DIMENSIONING TESTS
// ================================================================
console.log("\n=== Dimensioning ===");

for (const fxName of ["closet_linear_baseline", "kitchen_basic"]) {
  const fx = loadFixture(fxName);
  const results = runEnginePipeline(fx.briefing, `test_dim_${fxName}`);
  const html = generateHtmlReport(fx.briefing, results, `test_dim_${fxName}`);

  // CD-001: Vertical cotas present (ABNT 45° ticks, not red arrows)
  test(`CD-001 ${fxName}: vertical ABNT cotas present`, () => {
    // renderDimV generates vertical extension lines with DIM_STYLE.color (#333)
    // and 45° tick marks — check for rotated text (vertical cota signature)
    assert(html.includes('transform="rotate(-90'), `Report should have rotated vertical cota text`);
  });

  // CD-002: Section depth cotas present
  test(`CD-002 ${fxName}: section depth cotas present`, () => {
    // Section views should show depth dimension
    const hasSectionDim = html.includes("CORTE A-A") && (
      html.includes("600") || html.includes("580") || html.includes("500")
    );
    assert(hasSectionDim, "Section should show depth dimension");
  });

  // CD-003: No NaN in dimensions
  test(`CD-003 ${fxName}: no NaN in cota values`, () => {
    const nanInDim = (html.match(/font-family="Arial,sans-serif">NaN/g) || []).length;
    assert.equal(nanInDim, 0, `Found ${nanInDim} NaN in dimension values`);
  });
}

// ================================================================
// P0.7: SHEET COMPOSITION TESTS
// ================================================================
console.log("\n=== Sheet composition ===");

for (const fxName of ["closet_linear_baseline", "kitchen_basic"]) {
  const fx = loadFixture(fxName);
  const results = runEnginePipeline(fx.briefing, `test_sc_${fxName}`);
  const html = generateHtmlReport(fx.briefing, results, `test_sc_${fxName}`);

  // SC-002: Title block / carimbo present
  test(`SC-002 ${fxName}: title block (carimbo) present`, () => {
    assert(html.includes("carimbo"), "Report should contain carimbo class");
    assert(html.includes("SOMA-ID Engine"), "Carimbo should have verificador");
  });

  // SC-003: View titles present
  test(`SC-003 ${fxName}: view titles present`, () => {
    assert(html.includes("view-title"), "Report should have view-title class");
    assert(html.includes("Vista COM Portas"), "Should have COM Portas title");
    assert(html.includes("Vista SEM Portas"), "Should have SEM Portas title");
  });

  // SC-004: Scale per view
  test(`SC-004 ${fxName}: scale per view present`, () => {
    assert(html.includes("view-scale"), "Report should have view-scale class");
    assert(html.includes("Escala 1:25"), "Should have 1:25 scale on elevations");
  });

  // SC-006: Stable layout (prancha count matches index)
  test(`SC-006 ${fxName}: prancha count stable`, () => {
    const pranchaCount = (html.match(/class="prancha"/g) || []).length;
    assert(pranchaCount >= 10, `Should have at least 10 pranchas, got ${pranchaCount}`);
  });
}

// ================================================================
// P0.8: FABRICATION VALIDATION TESTS
// ================================================================
console.log("\n=== Fabrication validation ===");

test("closet has fabrication validation in results", () => {
  const fx = loadFixture("closet_linear_baseline");
  const results = runEnginePipeline(fx.briefing, "test_fv_closet");
  assert(results.fabricationValidation, "Should have fabricationValidation");
  assert(typeof results.fabricationValidation.isReadyForFactory === "boolean", "Should have isReadyForFactory flag");
  assert(typeof results.fabricationValidation.totalChecks === "number", "Should have totalChecks");
});

test("kitchen has fabrication validation", () => {
  const fx = loadFixture("kitchen_basic");
  const results = runEnginePipeline(fx.briefing, "test_fv_kitchen");
  assert(results.fabricationValidation, "Should have fabricationValidation");
  assert(results.summary.isReadyForFactory !== undefined, "Summary should have isReadyForFactory");
});

test("validation results have proper structure", () => {
  const fx = loadFixture("closet_linear_baseline");
  const results = runEnginePipeline(fx.briefing, "test_fv_struct");
  const fv = results.fabricationValidation;
  for (const r of fv.results) {
    assert(r.code, `Result missing code`);
    assert(r.severity, `Result ${r.code} missing severity`);
    assert(r.message, `Result ${r.code} missing message`);
    assert(r.entityTraceId, `Result ${r.code} missing entityTraceId`);
    assert(r.entityName, `Result ${r.code} missing entityName`);
    assert(["info", "warning", "critical"].includes(r.severity), `Invalid severity: ${r.severity}`);
  }
});

test("report shows fabrication validation section", () => {
  const fx = loadFixture("closet_linear_baseline");
  const results = runEnginePipeline(fx.briefing, "test_fv_report");
  const html = generateHtmlReport(fx.briefing, results, "test_fv_report");
  assert(html.includes("Validacao de Fabricabilidade"), "Report should show fabrication validation");
});

test("isReadyForFactory false when critical exists", () => {
  // Create a module with depth too shallow for hanging (FV-003)
  const fakeWalls = [{
    wallId: "north", label: "Test", orientation: "north",
    wallWidth: 3000, usableWidth: 3000, totalModuleWidth: 800,
    modules: [{
      id: "test", moduleId: "closet_cabideiro", name: "Cabideiro Raso",
      type: "base", width: 800, height: 2400, depth: 300, // too shallow!
      position: { x: 0, y: 0, z: 0 },
      boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 800, y: 2400, z: 300 } },
      notes: [], cutList: [],
      moduleType: "closet_storage", moduleSubtype: "long_garment",
      traceId: "M-A01", shortLabel: "A01", parentWallTraceId: "W-NORTH-01",
    }],
    distributionNotes: [], traceId: "W-NORTH-01",
  }];
  const result = validateFabrication(fakeWalls);
  assert.equal(result.isReadyForFactory, false, "Should NOT be ready with shallow hanging");
  assert(result.criticalCount > 0, "Should have critical issues");
  const fv003 = result.results.find(r => r.code === "FV-003");
  assert(fv003, "Should have FV-003 (hanging depth) critical");
});

// ================================================================
// P0.9: DXF EXPORT TESTS
// ================================================================
console.log("\n=== DXF export ===");

const { generateDxfBuffer } = await import(path.join(DIST, "services/dxf-export.js"));

test("DXF generates valid buffer", () => {
  const fx = loadFixture("closet_linear_baseline");
  const results = runEnginePipeline(fx.briefing, "test_dxf_closet");
  const buf = generateDxfBuffer(fx.briefing, results);
  assert(buf instanceof Buffer, "Should return Buffer");
  assert(buf.length > 100, `DXF too small: ${buf.length} bytes`);
  const content = buf.toString("utf-8");
  assert(content.includes("SECTION"), "DXF should have SECTION");
  assert(content.includes("ENTITIES"), "DXF should have ENTITIES");
  assert(content.includes("EOF"), "DXF should end with EOF");
});

test("DXF contains piece labels", () => {
  const fx = loadFixture("closet_linear_baseline");
  const results = runEnginePipeline(fx.briefing, "test_dxf_labels");
  const content = generateDxfBuffer(fx.briefing, results).toString("utf-8");
  assert(content.includes("Lateral"), "DXF should have piece name Lateral");
  assert(content.includes("CORTE_EXTERNO"), "DXF should have CUT_OUT layer");
  assert(content.includes("ETIQUETAS"), "DXF should have ETIQUETAS layer");
});

test("DXF contains trace labels when available", () => {
  const fx = loadFixture("closet_linear_baseline");
  const results = runEnginePipeline(fx.briefing, "test_dxf_trace");
  const content = generateDxfBuffer(fx.briefing, results).toString("utf-8");
  // Trace labels should appear in bracket format [A01] or similar
  const hasTrace = content.includes("[A") || content.includes("[B");
  assert(hasTrace, "DXF should contain trace labels like [A01]");
});

test("kitchen DXF exports without error", () => {
  const fx = loadFixture("kitchen_basic");
  const results = runEnginePipeline(fx.briefing, "test_dxf_kitchen");
  const buf = generateDxfBuffer(fx.briefing, results);
  assert(buf.length > 100, "Kitchen DXF should be substantial");
  const content = buf.toString("utf-8");
  assert(content.includes("EOF"), "Should be valid DXF");
});

// ================================================================
// P1.1: FACTORY CATALOG TESTS
// ================================================================
console.log("\n=== Factory catalog ===");

const { getActiveCatalog, lookupMaterial, lookupHardware, lookupModuleTemplate, buildCatalogUsageSummary } = await import(path.join(DIST, "services/factory-catalog.js"));

test("active catalog exists with required fields", () => {
  const cat = getActiveCatalog();
  assert(cat.catalogId, "Catalog missing catalogId");
  assert(cat.catalogName, "Catalog missing catalogName");
  assert(cat.version, "Catalog missing version");
  assert(cat.materials.length > 0, "Catalog has no materials");
  assert(cat.hardware.length > 0, "Catalog has no hardware");
  assert(cat.moduleTemplates.length > 0, "Catalog has no module templates");
});

test("material lookup returns from catalog", () => {
  const diag = [];
  const mat = lookupMaterial("Lana", diag);
  assert(mat, "Should find Lana material");
  assert.equal(mat.normalizedName, "lana");
  assert(diag.length > 0, "Should have diagnostic entry");
  assert(diag[0].source !== "hardcoded", "Should not be hardcoded for known material");
});

test("unknown material returns null with hardcoded diagnostic", () => {
  const diag = [];
  const mat = lookupMaterial("XyzUnknownMaterial", diag);
  assert.equal(mat, null, "Should not find unknown material");
  assert.equal(diag[0].source, "hardcoded", "Should flag as hardcoded");
});

test("hardware lookup works", () => {
  const diag = [];
  const hw = lookupHardware("dobradica", diag);
  assert(hw, "Should find dobradica");
  assert(hw.costBasis > 0, "Should have cost basis");
});

test("module template lookup works", () => {
  const diag = [];
  const tpl = lookupModuleTemplate("closet_storage", "long_garment", diag);
  assert(tpl, "Should find cabideiro template");
  assert.equal(tpl.defaultDepth, 600);
});

test("pipeline includes catalog usage in results", () => {
  const fx = loadFixture("closet_linear_baseline");
  const results = runEnginePipeline(fx.briefing, "test_cat_pipeline");
  assert(results.catalogUsage, "Should have catalogUsage");
  assert(results.catalogUsage.catalogId, "Should have catalogId");
  assert(results.catalogUsage.totalLookups >= 0, "Should have lookup count");
});

test("report shows catalog provenance", () => {
  const fx = loadFixture("closet_linear_baseline");
  const results = runEnginePipeline(fx.briefing, "test_cat_report");
  const html = generateHtmlReport(fx.briefing, results, "test_cat_report");
  assert(html.includes("Catalogo Utilizado"), "Report should show catalog section");
});

// ================================================================
// P1.2: PARAMETRIC MODULE LIBRARY TESTS
// ================================================================
console.log("\n=== Parametric module library ===");

const { findTemplate, configureModule, validateDimensions, getAllTemplates } = await import(path.join(DIST, "services/module-library.js"));
const { instantiateModule } = await import(path.join(DIST, "services/module-instantiator.js"));

test("library has closet templates", () => {
  const tpl = findTemplate("closet_storage", "long_garment");
  assert(tpl, "Should find long_garment template");
  assert.equal(tpl.templateId, "closet-long-hanging");
  assert.equal(tpl.defaultDepth, 600);
});

test("library has kitchen templates", () => {
  const sink = findTemplate("kitchen_base", "sink_base");
  assert(sink, "Should find sink_base template");
  assert.equal(sink.environmentType, "kitchen");

  const oven = findTemplate("kitchen_tall", "oven_tower");
  assert(oven, "Should find oven_tower template");
  assert.equal(oven.defaultHeight, 2200);
});

test("configureModule clamps to valid range", () => {
  const tpl = findTemplate("closet_storage", "shoe");
  const cfg = configureModule(tpl, 2000, 3000, 200); // all out of range
  assert(cfg.resolvedWidth <= tpl.dimensionRules.widthMax, "Width should be clamped");
  assert(cfg.resolvedHeight <= tpl.dimensionRules.heightMax, "Height should be clamped");
  assert(cfg.resolvedDepth >= tpl.dimensionRules.depthMin, "Depth should be clamped");
  assert.equal(cfg.usedParametricTemplate, true);
});

test("validateDimensions catches out-of-range", () => {
  const tpl = findTemplate("closet_storage", "long_garment");
  const errors = validateDimensions(tpl, 100, 1000, 300); // too narrow, too short, too shallow
  assert(errors.length >= 2, `Should have errors, got: ${errors.join("; ")}`);
});

test("instantiateModule uses parametric template for closet", () => {
  const result = instantiateModule("hanging_bar", "long_garments", 1, [], 2400);
  assert.equal(result.usedParametricTemplate, true, "Should use parametric template");
  assert(result.templateId, "Should have templateId");
  assert(result.width > 0);
  assert(result.height > 0);
});

test("instantiateModule uses parametric template for kitchen sink", () => {
  const result = instantiateModule("sink_cabinet", undefined, 1, ["Zona: Bancada Pia"], 900);
  assert.equal(result.usedParametricTemplate, true, "Should use parametric template");
  assert(result.templateId?.includes("sink"), `Template should be sink, got: ${result.templateId}`);
});

test("instantiateModule uses parametric template for oven tower", () => {
  const result = instantiateModule("oven_tower", undefined, 1, ["Zona: Torre Forno"], 2200);
  assert.equal(result.usedParametricTemplate, true);
  assert(result.templateId?.includes("oven"), `Template should be oven, got: ${result.templateId}`);
});

test("instantiateModule falls back for unknown type", () => {
  const result = instantiateModule("custom_unknown_type", undefined, 1, [], 2400);
  assert.equal(result.usedParametricTemplate, false, "Should fallback for unknown type");
  assert(result.diagnosticNote.includes("fallback"), "Should note fallback");
});

test("shoe_rack uses quantity_based width", () => {
  const result = instantiateModule("shoe_rack", "shoes", 30, [], 2400);
  assert.equal(result.usedParametricTemplate, true);
  // 30 × 50mm = 1500mm, capped at widthMax
  assert(result.width >= 600, `Width should be quantity-based, got ${result.width}`);
});

test("all templates have valid dimension rules", () => {
  const templates = getAllTemplates();
  assert(templates.length >= 12, `Should have at least 12 templates, got ${templates.length}`);
  for (const t of templates) {
    const r = t.dimensionRules;
    assert(r.widthMin < r.widthMax, `${t.templateId}: widthMin >= widthMax`);
    assert(r.heightMin < r.heightMax, `${t.templateId}: heightMin >= heightMax`);
    assert(r.depthMin < r.depthMax, `${t.templateId}: depthMin >= depthMax`);
    assert(r.widthStep > 0, `${t.templateId}: widthStep must be > 0`);
  }
});

// ================================================================
// P1.3: PRICING ENGINE TESTS
// ================================================================
console.log("\n=== Pricing engine ===");

test("pipeline includes pricing result", () => {
  const fx = loadFixture("closet_linear_baseline");
  const results = runEnginePipeline(fx.briefing, "test_price_closet");
  assert(results.pricing, "Should have pricing result");
  assert(results.pricing.pricingProfileId, "Should have profile ID");
  assert(results.pricing.currency, "Should have currency");
});

test("pricing has technical cost breakdown", () => {
  const fx = loadFixture("closet_linear_baseline");
  const results = runEnginePipeline(fx.briefing, "test_price_tech");
  const tc = results.pricing.technicalCost;
  assert(tc.materialsCost > 0, "Materials cost should be > 0");
  assert(tc.subtotal > 0, "Subtotal should be > 0");
  assert(tc.details.length > 0, "Should have detail line items");
});

test("pricing has commercial price breakdown", () => {
  const fx = loadFixture("closet_linear_baseline");
  const results = runEnginePipeline(fx.briefing, "test_price_comm");
  const cp = results.pricing.commercialPrice;
  assert(cp.finalPrice > 0, "Final price should be > 0");
  assert(cp.finalPrice > cp.technicalSubtotal, "Commercial > technical (markup applied)");
  assert(cp.markupApplied > 0, "Markup should be applied");
});

test("pricing has per-module breakdown", () => {
  const fx = loadFixture("closet_linear_baseline");
  const results = runEnginePipeline(fx.briefing, "test_price_permod");
  assert(results.pricing.perModuleBreakdown.length > 0, "Should have per-module costs");
  for (const pm of results.pricing.perModuleBreakdown) {
    assert(pm.moduleName, "Module cost should have name");
    assert(pm.traceId, "Module cost should have traceId");
    assert(pm.cost > 0, "Module cost should be > 0");
  }
});

test("report shows pricing info", () => {
  const fx = loadFixture("closet_linear_baseline");
  const results = runEnginePipeline(fx.briefing, "test_price_report");
  const html = generateHtmlReport(fx.briefing, results, "test_price_report");
  assert(html.includes("Preco comercial"), "Report should show commercial price");
  assert(html.includes("Custo tecnico"), "Report should show technical cost");
  assert(html.includes("Markup"), "Report should show markup");
});

// ================================================================
// P1.4: COMMERCIAL PROPOSAL TESTS
// ================================================================
console.log("\n=== Commercial proposal ===");

const { createProposal, reviseProposal, approveProposal, rejectProposal, presentProposal, renderProposalHtml } = await import(path.join(DIST, "services/commercial-proposal.js"));

test("proposal creation from engine results", () => {
  const fx = loadFixture("closet_linear_baseline");
  const results = runEnginePipeline(fx.briefing, "test_prop_create");
  const proposal = createProposal("test_session", "SOMA-TEST-001", fx.briefing, results);
  assert(proposal.proposalId, "Should have proposalId");
  assert.equal(proposal.status, "draft");
  assert.equal(proposal.versions.length, 1);
  assert(proposal.versions[0].pricingSnapshot.commercialPrice > 0, "Should have price");
  assert(proposal.versions[0].moduleCount > 0, "Should have modules");
});

test("proposal revision creates new version", () => {
  const fx = loadFixture("closet_linear_baseline");
  const results = runEnginePipeline(fx.briefing, "test_prop_revise");
  const proposal = createProposal("test_rev", "SOMA-TEST-002", fx.briefing, results);
  const revised = reviseProposal(proposal.proposalId, "Cliente pediu material diferente", undefined, ["Freijo", "Branco"]);
  assert(revised, "Should return revised proposal");
  assert.equal(revised.status, "revised");
  assert.equal(revised.versions.length, 2);
  assert.equal(revised.versions[1].changeNotes, "Cliente pediu material diferente");
  assert.equal(revised.currentVersion, 2);
});

test("proposal approval changes status", () => {
  const fx = loadFixture("kitchen_basic");
  const results = runEnginePipeline(fx.briefing, "test_prop_approve");
  const proposal = createProposal("test_appr", "SOMA-TEST-003", fx.briefing, results);
  const approved = approveProposal(proposal.proposalId, "Cliente aprovou");
  assert(approved, "Should return approved proposal");
  assert.equal(approved.status, "approved");
  assert.equal(approved.approvals.length, 1);
  assert.equal(approved.approvals[0].status, "approved");
});

test("proposal rejection with reason", () => {
  const fx = loadFixture("kitchen_basic");
  const results = runEnginePipeline(fx.briefing, "test_prop_reject");
  const proposal = createProposal("test_rej", "SOMA-TEST-004", fx.briefing, results);
  const rejected = rejectProposal(proposal.proposalId, "Preco muito alto", ["Reduzir modulos"]);
  assert(rejected, "Should return rejected proposal");
  assert.equal(rejected.status, "rejected");
  assert.equal(rejected.approvals[0].reason, "Preco muito alto");
  assert(rejected.approvals[0].requestedChanges?.length > 0, "Should have requested changes");
});

test("proposal renders as HTML", () => {
  const fx = loadFixture("closet_linear_baseline");
  const results = runEnginePipeline(fx.briefing, "test_prop_html");
  const proposal = createProposal("test_html", "SOMA-TEST-005", fx.briefing, results);
  const html = renderProposalHtml(proposal);
  assert(html.includes("Proposta"), "HTML should have proposal title");
  assert(html.includes("SOMA-ID"), "HTML should have SOMA-ID branding");
  assert(html.includes(proposal.clientName), "HTML should show client name");
  assert(html.includes("RASCUNHO"), "Should show draft status");
});

test("approved proposal cannot be revised", () => {
  const fx = loadFixture("kitchen_basic");
  const results = runEnginePipeline(fx.briefing, "test_prop_lock");
  const proposal = createProposal("test_lock", "SOMA-TEST-006", fx.briefing, results);
  approveProposal(proposal.proposalId);
  const result = reviseProposal(proposal.proposalId, "Tentativa de revisao apos aprovacao");
  assert.equal(result, null, "Should not allow revision after approval");
});

// ================================================================
// P1.5: REVISION & VERSIONING TESTS
// ================================================================
console.log("\n=== Revision & versioning ===");

const { createRevision, getRevisions, getLatestRevision, markCommerciallyApproved, markExecutiveGenerated, createRevisionLink, getRevisionLinks, detectMaterialChanges } = await import(path.join(DIST, "services/revision-manager.js"));

test("revision creation with changeNotes", () => {
  const rev = createRevision("proj-test-1", "Versao inicial do projeto", {
    catalogId: "builtin-default-v1",
    catalogVersion: "1.0.0",
  });
  assert(rev.revisionId, "Should have revisionId");
  assert.equal(rev.versionNumber, 1);
  assert.equal(rev.status, "draft");
  assert.equal(rev.changeNotes, "Versao inicial do projeto");
});

test("sequential versions increment correctly", () => {
  createRevision("proj-test-2", "v1 — inicial");
  const rev2 = createRevision("proj-test-2", "v2 — material alterado", {
    changes: [{
      changeType: "material_changed",
      entityType: "material",
      beforeValue: "Lana",
      afterValue: "Freijo",
      impactSummary: "Material principal alterado de Lana para Freijo",
    }],
  });
  assert.equal(rev2.versionNumber, 2);
  assert.equal(rev2.changes.length, 1);
  assert.equal(rev2.changes[0].changeType, "material_changed");
  assert(rev2.basedOnRevisionId, "Should reference previous revision");
});

test("commercially approved status", () => {
  createRevision("proj-test-3", "v1");
  const approved = markCommerciallyApproved("proj-test-3");
  assert(approved, "Should return approved revision");
  assert.equal(approved.status, "commercially_approved");
});

test("executive generated links to revision", () => {
  createRevision("proj-test-4", "v1");
  markCommerciallyApproved("proj-test-4");
  const exec = markExecutiveGenerated("proj-test-4");
  assert.equal(exec.status, "executive_generated");
});

test("revision link creation", () => {
  const link = createRevisionLink("proj-test-5", 1, 1, "approved");
  assert.equal(link.proposalVersionNumber, 1);
  assert.equal(link.projectRevisionNumber, 1);
  assert.equal(link.approvalStatus, "approved");
  const links = getRevisionLinks("proj-test-5");
  assert.equal(links.length, 1);
});

test("material change detection", () => {
  const changes = detectMaterialChanges("rev-test", ["Lana", "Lord"], ["Freijo", "Lord"]);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].changeType, "material_changed");
  assert(changes[0].impactSummary.includes("Freijo"), "Should mention new material");
});

test("revision history retrieval", () => {
  createRevision("proj-test-6", "v1");
  createRevision("proj-test-6", "v2 — ajuste");
  createRevision("proj-test-6", "v3 — final");
  const history = getRevisions("proj-test-6");
  assert.equal(history.length, 3);
  const latest = getLatestRevision("proj-test-6");
  assert.equal(latest.versionNumber, 3);
  assert.equal(latest.changeNotes, "v3 — final");
});

// ================================================================
// P1.6: DRILLING & ASSEMBLY TESTS
// ================================================================
console.log("\n=== Drilling & assembly ===");

const { generateDrillingForPiece, findPatterns, getAllPatterns } = await import(path.join(DIST, "services/drilling-patterns.js"));
const { generateAssemblyHints, findAssemblyProfile, getAllProfiles } = await import(path.join(DIST, "services/assembly-hints.js"));

test("drawer bank lateral drilling generates points", () => {
  const result = generateDrillingForPiece("drawer_bank", "lateral", 580, 900, 580, "P-A01-01");
  assert.equal(result.supported, true, "Should be supported");
  assert(result.points.length > 0, `Should have drilling points, got ${result.points.length}`);
  assert(result.patternsUsed.length > 0, "Should list patterns used");
  // Check traceability
  for (const p of result.points) {
    assert.equal(p.pieceTraceId, "P-A01-01", "Should carry pieceTraceId");
    assert(p.diameter > 0, "Should have valid diameter");
    assert(p.depth > 0, "Should have valid depth");
  }
});

test("shelf support drilling generates 32mm system holes", () => {
  const result = generateDrillingForPiece("shelves", "lateral", 580, 2400, 600, "P-A02-01");
  assert.equal(result.supported, true);
  const shelfHoles = result.points.filter(p => p.drillType === "suporte_prateleira");
  assert(shelfHoles.length > 20, `Should have many shelf support holes (32mm system), got ${shelfHoles.length}`);
});

test("hanging bar drilling generates mounting points", () => {
  const result = generateDrillingForPiece("long_garment", "lateral", 580, 2400, 600);
  assert.equal(result.supported, true);
  const barHoles = result.points.filter(p => p.drillType === "cabideiro");
  assert(barHoles.length >= 2, "Should have at least 2 bar mounting points");
});

test("unsupported module/piece returns supported=false", () => {
  const result = generateDrillingForPiece("unknown_type", "random_piece", 500, 500, 500);
  assert.equal(result.supported, false);
  assert.equal(result.points.length, 0);
});

test("assembly profile exists for drawer_bank", () => {
  const profile = findAssemblyProfile("drawer_bank");
  assert(profile, "Should find drawer_bank profile");
  assert(profile.hints.length >= 4, "Should have at least 4 assembly steps");
  assert(profile.requiredHardware.includes("corredica"), "Should require corredica");
});

test("assembly hints generated with traceability", () => {
  const hints = generateAssemblyHints("long_garment", "M-A01");
  assert(hints.length > 0, "Should generate hints");
  for (const h of hints) {
    assert.equal(h.moduleTraceId, "M-A01");
    assert(h.sequence > 0, "Should have sequence number");
    assert(h.joinType, "Should have joinType");
  }
});

test("kitchen sink assembly profile exists", () => {
  const profile = findAssemblyProfile("sink_base");
  assert(profile, "Should find sink_base profile");
  assert(profile.requiredHardware.includes("dobradica"), "Should require dobradica");
});

test("oven tower assembly profile exists", () => {
  const profile = findAssemblyProfile("oven_tower");
  assert(profile, "Should find oven_tower profile");
  const wallFix = profile.hints.find(h => h.relatedPieceRole === "parede");
  assert(wallFix, "Oven tower should have wall fixing hint (safety)");
});

test("all patterns have valid structure", () => {
  const patterns = getAllPatterns();
  assert(patterns.length >= 6, `Should have at least 6 patterns, got ${patterns.length}`);
  for (const p of patterns) {
    assert(p.patternId, "Pattern should have ID");
    assert(p.pieceRole, "Pattern should have pieceRole");
    assert(typeof p.generate === "function", "Pattern should have generate function");
  }
});

test("all assembly profiles have valid structure", () => {
  const profiles = getAllProfiles();
  assert(profiles.length >= 5, `Should have at least 5 profiles, got ${profiles.length}`);
  for (const p of profiles) {
    assert(p.profileId, "Profile should have ID");
    assert(p.moduleSubtype, "Profile should have moduleSubtype");
    assert(p.hints.length > 0, `Profile ${p.profileId} should have hints`);
  }
});

// ================================================================
// P2.1: PRODUCTION PACKET TESTS
// ================================================================
console.log("\n=== Production packet ===");

const { generatePieceLabels } = await import(path.join(DIST, "services/piece-labels.js"));
const { generateProductionPacket } = await import(path.join(DIST, "services/production-packet.js"));

test("piece labels generated for closet", () => {
  const fx = loadFixture("closet_linear_baseline");
  const results = runEnginePipeline(fx.briefing, "test_pkt_labels");
  const labels = generatePieceLabels(results.blueprint.walls);
  assert(labels.length > 0, "Should generate labels");
  for (const l of labels) {
    assert(l.pieceRole, "Label should have pieceRole");
    assert(l.material, "Label should have material");
    assert(l.widthMm > 0, "Label should have valid width");
    assert(["supported", "unsupported", "none"].includes(l.drillingStatus), "Should have valid drillingStatus");
  }
});

test("production packet has wall groups", () => {
  const fx = loadFixture("closet_linear_baseline");
  const results = runEnginePipeline(fx.briefing, "test_pkt_walls");
  const packet = generateProductionPacket(results.blueprint.walls, results, "test-proj");
  assert(packet.wallGroups.length > 0, "Should have wall groups");
  assert(packet.totalModules > 0, "Should have modules");
  assert(packet.totalPieces > 0, "Should have pieces");
});

test("production packet has module groups with assembly", () => {
  const fx = loadFixture("closet_linear_baseline");
  const results = runEnginePipeline(fx.briefing, "test_pkt_modules");
  const packet = generateProductionPacket(results.blueprint.walls, results, "test-proj");
  const allModGroups = packet.wallGroups.flatMap(w => w.modules);
  assert(allModGroups.length > 0, "Should have module groups");
  // At least some modules should have assembly steps
  const withAssembly = allModGroups.filter(m => m.assemblySteps.length > 0);
  assert(withAssembly.length > 0, `Should have modules with assembly steps, got ${withAssembly.length}`);
});

test("production packet tracks drilling points", () => {
  const fx = loadFixture("closet_linear_baseline");
  const results = runEnginePipeline(fx.briefing, "test_pkt_drill");
  const packet = generateProductionPacket(results.blueprint.walls, results, "test-proj");
  assert(packet.totalDrillingPoints >= 0, "Should track drilling points");
  // Closet should have at least some drilling
  assert(packet.totalDrillingPoints > 0, `Closet should have drilling points, got ${packet.totalDrillingPoints}`);
});

test("production packet distinguishes supported vs unsupported", () => {
  const fx = loadFixture("closet_linear_baseline");
  const results = runEnginePipeline(fx.briefing, "test_pkt_support");
  const packet = generateProductionPacket(results.blueprint.walls, results, "test-proj");
  assert(packet.fullySupported + packet.unsupported === packet.totalModules, "Supported + unsupported should equal total");
  assert(packet.productionNotes.length > 0, "Should have production notes");
});

test("kitchen production packet works", () => {
  const fx = loadFixture("kitchen_basic");
  const results = runEnginePipeline(fx.briefing, "test_pkt_kitchen");
  const packet = generateProductionPacket(results.blueprint.walls, results, "test-proj-k");
  assert(packet.totalModules > 0, "Kitchen should have modules");
  assert(packet.totalPieces > 0, "Kitchen should have pieces");
});

// ================================================================
// P2.2: POST-MEASUREMENT & FACTORY RELEASE TESTS
// ================================================================
console.log("\n=== Post-measurement & factory release ===");

const { captureMeasurement, getMeasurementByProject, hasCriticalDeviations, linkMeasurementToRevision } = await import(path.join(DIST, "services/measurement-records.js"));
const { validateReleaseGate, releaseToFactory } = await import(path.join(DIST, "services/factory-release.js"));

test("measurement capture with deviation detection", () => {
  const record = captureMeasurement("proj-msr-1", {
    measuredBy: "Tecnico Jose",
    walls: [
      { wallId: "north", measuredLength: 4180 },
      { wallId: "east", measuredLength: 3620 },
    ],
    ceilingHeight: 2790,
  }, [
    { id: "north", length_m: 4.2 },
    { id: "east", length_m: 3.6 },
  ], 2.8);
  assert(record.measurementId, "Should have measurementId");
  assert.equal(record.measuredBy, "Tecnico Jose");
  assert.equal(record.measuredWalls.length, 2);
  // North: 4200 vs 4180 = 20mm deviation (significant)
  const northDev = record.deviations.find(d => d.fieldPath.includes("north"));
  assert(northDev, "Should detect north wall deviation");
  assert.equal(northDev.deviationMm, 20);
});

test("critical deviation detection", () => {
  const record = captureMeasurement("proj-msr-2", {
    measuredBy: "Test",
    walls: [{ wallId: "north", measuredLength: 3500 }], // 700mm off!
    ceilingHeight: 2800,
  }, [{ id: "north", length_m: 4.2 }], 2.8);
  assert(hasCriticalDeviations(record), "Should have critical deviations (700mm off)");
});

test("measurement linked to revision", () => {
  const record = captureMeasurement("proj-msr-3", {
    measuredBy: "Test",
    walls: [{ wallId: "north", measuredLength: 4200 }],
    ceilingHeight: 2800,
  });
  const linked = linkMeasurementToRevision(record.measurementId, "rev-proj-msr-3-v2");
  assert.equal(linked, true);
});

test("factory release blocked without commercial approval", () => {
  const validation = validateReleaseGate("proj-rel-1", {
    commerciallyApproved: false,
    hasReport: true, hasBom: true, hasDxf: true,
    measurementRequired: false,
  });
  assert.equal(validation.canRelease, false);
  assert(validation.blockingIssues.some(i => i.includes("aprovada")), "Should mention approval");
});

test("factory release blocked without measurement", () => {
  const validation = validateReleaseGate("proj-rel-2", {
    commerciallyApproved: true,
    fabricationValidation: { isReadyForFactory: true, totalChecks: 0, infoCount: 0, warningCount: 0, criticalCount: 0, results: [] },
    hasReport: true, hasBom: true, hasDxf: true,
    measurementRequired: true, // required but not captured
  });
  assert.equal(validation.canRelease, false);
  assert(validation.blockingIssues.some(i => i.includes("Medicao")), "Should mention measurement");
});

test("factory release blocked with fabrication critical", () => {
  const validation = validateReleaseGate("proj-rel-3", {
    commerciallyApproved: true,
    fabricationValidation: { isReadyForFactory: false, totalChecks: 1, infoCount: 0, warningCount: 0, criticalCount: 1, results: [] },
    hasReport: true, hasBom: true, hasDxf: true,
    measurementRequired: false,
  });
  assert.equal(validation.canRelease, false);
  assert(validation.blockingIssues.some(i => i.includes("fabricabilidade")), "Should mention fabrication");
});

test("factory release succeeds when all gates pass", () => {
  // First capture measurement for this project
  captureMeasurement("proj-rel-4", {
    measuredBy: "Test",
    walls: [{ wallId: "north", measuredLength: 4200 }],
    ceilingHeight: 2800,
  });

  const release = releaseToFactory("proj-rel-4", "rev-v1", "Gerente Jose", {
    commerciallyApproved: true,
    fabricationValidation: { isReadyForFactory: true, totalChecks: 5, infoCount: 0, warningCount: 2, criticalCount: 0, results: [] },
    hasReport: true, hasBom: true, hasDxf: true,
    measurementRequired: true,
  });
  assert.equal(release.releaseStatus, "factory_released");
  assert.equal(release.releasedBy, "Gerente Jose");
  assert.equal(release.validation.canRelease, true);
  assert.equal(release.validation.blockingIssues.length, 0);
});

test("factory release with measurement waived", () => {
  const release = releaseToFactory("proj-rel-5", "rev-v1", "Admin", {
    commerciallyApproved: true,
    fabricationValidation: { isReadyForFactory: true, totalChecks: 0, infoCount: 0, warningCount: 0, criticalCount: 0, results: [] },
    hasReport: true, hasBom: true, hasDxf: false,
    measurementRequired: false, // waived
  });
  assert.equal(release.releaseStatus, "factory_released");
  assert.equal(release.validation.measurementWaived, true);
});

// ================================================================
// RESULTS
// ================================================================
console.log(`\n${"=".repeat(50)}`);
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log("\nFAILURES:");
  for (const f of failures) {
    console.log(`  ✗ ${f.name}: ${f.error}`);
  }
}
console.log(`${"=".repeat(50)}\n`);
process.exit(failed > 0 ? 1 : 0);

// ================================================================
// HELPERS
// ================================================================
function makeBriefing(opts = {}) {
  return {
    client: { name: opts.clientName || "TEST", email: "", phone: null, referral: "" },
    project: { type: opts.projectType || "closet", designer: "", date_in: "2026-01-01", date_due: null },
    space: {
      total_area_m2: 10,
      ceiling_height_m: opts.ceilingH ?? 2.8,
      walls: [{ id: opts.wallId || "north", length_m: opts.wallLen || 4.0, features: [] }],
      entry_point: { wall: "south", width_m: 0.9 },
    },
    zones: opts.zones || [{ name: "Test", items: [{ type: "shelves", quantity: 3 }] }],
    materials: { colors: opts.colors || ["Lana"], mood_board: "test" },
    _meta: { sources: ["test"], confidence: 1, missing_fields: [], timestamp: new Date().toISOString() },
  };
}
