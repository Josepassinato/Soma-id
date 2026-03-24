import { test, expect } from "@playwright/test";

const BASE = process.env.CHAT_URL || "http://localhost:8091";

const BRIEFING_TEXT = `Projeto closet para cliente Maria Silva, email maria@test.com, telefone 11999887766.
Designer: Ana Costa da B.Home Concept. Data entrada: 2026-03-20, data entrega: 2026-05-20.
Tipo: closet master. Pe direito 2.70m. Parede principal: 3.60m. Parede lateral: 3.80m.
Porta entrada: parede sul, 0.90m.
Closet Dela: cabideiro para vestidos longos, 30 pares de sapatos, 6 pares de botas,
vitrine para 15 bolsas com LED e vidro temperado, maleiro para 4 malas (2 grandes 2 pequenas).
Ilha central: tampo vidro temperado com divisorias veludo para joias e oculos,
5 gavetas (lingerie, pijamas, biquinis, cintos, acessorios).
Area makeup: bancada 1.19m com espelho iluminado e assento.
Materiais: cores Freijo e Branco.
Closet Dele: prateleiras e sapateira, parede 4.00m.`;

const ANSWER_TEXT = `O ambiente total tem 7.40m x 3.80m, dando 28.12m2.
Closet Dela: 3.60m largura x 0.60m profundidade x 2.70m altura.
Ilha Central: 1.20m x 0.80m x 0.90m altura.
Area Makeup: 1.19m x 0.60m x 2.70m.
Closet Dele: 4.00m x 0.60m x 2.70m.
Cabideiros: 2 barras longas (vestidos) e 2 barras curtas (camisas).
30 pares sapatos, 6 pares botas, 15 bolsas.
Ferragens: soft-close em tudo, puxadores embutidos.`;

let sessionId: string;

test.describe.serial("SOMA ID Chat → Engine Pipeline E2E", () => {
  test("Phase 1-2: Upload briefing and parse", async ({ request }) => {
    const res = await request.post(`${BASE}/session/start`, {
      multipart: { text: BRIEFING_TEXT },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.session_id).toBeTruthy();
    expect(["PARSED", "REVIEWING"]).toContain(body.state);
    sessionId = body.session_id;

    // Verify session has briefing via GET
    const sRes = await request.get(`${BASE}/session/${sessionId}`);
    expect(sRes.status()).toBe(200);
    const sBody = await sRes.json();
    expect(sBody.briefing).toBeTruthy();
    expect(sBody.briefing.zones.length).toBeGreaterThan(0);

    console.log(`  Session: ${sessionId}, state: ${body.state}, gaps: ${body.checklist?.gaps?.length ?? 0}, zones: ${sBody.briefing.zones.length}`);
  });

  test("Phase 3: Answer questions until REVIEWING", async ({ request }) => {
    const stateRes = await request.get(`${BASE}/session/${sessionId}`);
    const stateBody = await stateRes.json();

    if (stateBody.state === "REVIEWING") {
      console.log("  No questions needed, already REVIEWING");
      return;
    }

    // Get and answer question blocks until REVIEWING
    for (let attempt = 0; attempt < 5; attempt++) {
      const qRes = await request.post(`${BASE}/session/${sessionId}/questions`);
      expect(qRes.status()).toBe(200);
      const qBody = await qRes.json();

      if (qBody.state === "REVIEWING") {
        console.log("  Reached REVIEWING after questions");
        return;
      }

      expect(qBody.block).toBeTruthy();
      console.log(`  Block ${qBody.block.block_number}: ${qBody.block.questions.length} questions`);

      const answer = attempt === 0 ? ANSWER_TEXT : "Tudo padrao, pode seguir.";
      const aRes = await request.post(`${BASE}/session/${sessionId}/answer`, {
        data: { text: answer },
      });
      expect(aRes.status()).toBe(200);
      const aBody = await aRes.json();
      console.log(`  After answer: state=${aBody.state}, answered=${aBody.answered_count}`);

      if (aBody.state === "REVIEWING") {
        console.log("  Reached REVIEWING");
        return;
      }
    }
  });

  test("Phase 4: Confirm briefing → CONFIRMED", async ({ request }) => {
    const stateRes = await request.get(`${BASE}/session/${sessionId}`);
    const stateBody = await stateRes.json();

    // If still QUESTIONING, push through remaining questions
    if (stateBody.state === "QUESTIONING" || stateBody.state === "PARSED") {
      console.log(`  State is ${stateBody.state}, pushing through remaining questions...`);
      for (let i = 0; i < 5; i++) {
        const qRes = await request.post(`${BASE}/session/${sessionId}/questions`);
        const qBody = await qRes.json();
        if (qBody.state === "REVIEWING") break;
        if (!qBody.block) break;
        const aRes = await request.post(`${BASE}/session/${sessionId}/answer`, {
          data: { text: "Tudo padrao, pode seguir com o que fizer sentido." },
        });
        const aBody = await aRes.json();
        if (aBody.state === "REVIEWING") break;
      }
    }

    // Now should be REVIEWING
    const checkRes = await request.get(`${BASE}/session/${sessionId}`);
    const checkBody = await checkRes.json();
    expect(["REVIEWING", "CONFIRMED"]).toContain(checkBody.state);

    if (checkBody.state === "REVIEWING") {
      const res = await request.post(`${BASE}/session/${sessionId}/confirm`, {
        data: { text: "confirmo" },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.state).toBe("CONFIRMED");
    }
    console.log(`  Confirmed!`);
  });

  test("Phase 5: Generate → engines run → COMPLETED", async ({ request }) => {
    const res = await request.post(`${BASE}/session/${sessionId}/generate`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.state).toBe("COMPLETED");
    expect(body.summary).toBeTruthy();
    expect(body.summary.total_modules).toBeGreaterThan(0);
    expect(body.summary.total_parts).toBeGreaterThan(0);
    expect(body.summary.total_sheets).toBeGreaterThan(0);

    // Target: 0 BOUNDARY_VIOLATION conflicts
    const boundaryViolations = (body.conflicts || []).filter(
      (c: any) => c.type === "BOUNDARY_VIOLATION"
    );
    expect(boundaryViolations.length).toBe(0);

    // Target: nesting efficiency > 50% (custom closets with many small pieces naturally waste more)
    expect(body.summary.efficiency_percent).toBeGreaterThan(50);

    console.log(`  Modules: ${body.summary.total_modules}, Parts: ${body.summary.total_parts}, Sheets: ${body.summary.total_sheets}`);
    console.log(`  Efficiency: ${body.summary.efficiency_percent}%, Cost: $${body.summary.estimated_cost_usd}`);
    console.log(`  Boundary violations: ${boundaryViolations.length}`);
    console.log(`  Total conflicts: ${body.summary.critical_conflicts} critical, ${body.summary.warnings} warnings`);
  });

  test("Phase 6: Get full results", async ({ request }) => {
    const res = await request.get(`${BASE}/session/${sessionId}/result`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.state).toBe("COMPLETED");
    expect(body.engine_results).toBeTruthy();
    expect(body.engine_results.blueprint).toBeTruthy();
    expect(body.engine_results.nesting).toBeTruthy();
    expect(body.engine_results.conflicts).toBeDefined();
    expect(body.engine_results.blueprint.mainWall.modules.length).toBeGreaterThan(0);
    expect(body.engine_results.nesting.sheets.length).toBeGreaterThan(0);
    expect(body.engine_results.summary.estimated_cost_usd).toBeGreaterThan(0);
    console.log(`  Blueprint modules: ${body.engine_results.blueprint.mainWall.modules.length}`);
    console.log(`  Nesting sheets: ${body.engine_results.nesting.sheets.length}, efficiency: ${body.engine_results.nesting.globalEfficiency}%`);
  });
});

test.describe.serial("Confirmation punctuation fix", () => {
  test("confirmo, tudo certo! should be accepted", async ({ request }) => {
    // Create session
    const startRes = await request.post(`${BASE}/session/start`, {
      multipart: { text: BRIEFING_TEXT },
    });
    expect(startRes.status()).toBe(200);
    const startBody = await startRes.json();
    const sid = startBody.session_id;

    // Fast-forward to REVIEWING
    if (startBody.state === "PARSED") {
      for (let i = 0; i < 5; i++) {
        const qRes = await request.post(`${BASE}/session/${sid}/questions`);
        const qBody = await qRes.json();
        if (qBody.state === "REVIEWING") break;
        const aRes = await request.post(`${BASE}/session/${sid}/answer`, {
          data: { text: i === 0 ? ANSWER_TEXT : "Tudo padrao." },
        });
        const aBody = await aRes.json();
        if (aBody.state === "REVIEWING") break;
      }
    }

    // Confirm with punctuation
    const confirmRes = await request.post(`${BASE}/session/${sid}/confirm`, {
      data: { text: "confirmo, tudo certo!" },
    });
    expect(confirmRes.status()).toBe(200);
    const confirmBody = await confirmRes.json();
    expect(confirmBody.state).toBe("CONFIRMED");
    console.log(`  Punctuation confirm: OK`);
  });
});

test.describe.serial("Email delivery endpoint", () => {
  test("POST /session/:id/deliver sends email and transitions to DELIVERED", async ({ request }) => {
    // Create and complete a full session
    const startRes = await request.post(`${BASE}/session/start`, {
      multipart: { text: BRIEFING_TEXT },
    });
    const startBody = await startRes.json();
    const sid = startBody.session_id;

    // Fast-forward to REVIEWING
    if (startBody.state === "PARSED") {
      for (let i = 0; i < 5; i++) {
        const qRes = await request.post(`${BASE}/session/${sid}/questions`);
        const qBody = await qRes.json();
        if (qBody.state === "REVIEWING") break;
        const aRes = await request.post(`${BASE}/session/${sid}/answer`, {
          data: { text: i === 0 ? ANSWER_TEXT : "Tudo padrao." },
        });
        const aBody = await aRes.json();
        if (aBody.state === "REVIEWING") break;
      }
    }

    // Confirm
    await request.post(`${BASE}/session/${sid}/confirm`, {
      data: { text: "confirmo" },
    });

    // Generate
    const genRes = await request.post(`${BASE}/session/${sid}/generate`);
    const genBody = await genRes.json();
    expect(genBody.state).toBe("COMPLETED");

    // Deliver — without email should fail
    const noEmailRes = await request.post(`${BASE}/session/${sid}/deliver`, {
      data: { email: "" },
    });
    expect(noEmailRes.status()).toBe(400);

    // Deliver — with valid email
    const deliverRes = await request.post(`${BASE}/session/${sid}/deliver`, {
      data: { email: "jose@payjarvis.com" },
    });
    expect(deliverRes.status()).toBe(200);
    const deliverBody = await deliverRes.json();
    expect(deliverBody.state).toBe("DELIVERED");
    expect(deliverBody.messageId).toBeTruthy();
    console.log(`  Email delivered: ${deliverBody.messageId}`);

    // Verify session state changed
    const stateRes = await request.get(`${BASE}/session/${sid}`);
    const stateBody = await stateRes.json();
    expect(stateBody.state).toBe("DELIVERED");
    console.log(`  Session state: ${stateBody.state}`);
  });
});
