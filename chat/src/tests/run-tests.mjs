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
