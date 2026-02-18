import { runSimulation as runBudgetSimulation } from './generate_budget';
import { runDigitalApprovalSimulation } from './simulate_digital_approval'; // Importar
import { runSimulation as runContractTxtSimulation } from './simulate_contract_txt';
import { simulateContractAcceptance } from './simulate_contract_acceptance';
import { generateIntegrityJson } from './generate_integrity_json';

import { MOCK_MATERIALS, STYLE_PRESETS } from './constants';
import { ExtractedInsights, Material } from './types';

async function main() {
  console.log("Iniciando todas as simulações...");

  const quoteId = `QT-${new Date().getFullYear()}-002`; // Usar o quoteId fixo

  const mockInsights: ExtractedInsights = {
    clientName: "Maria Silva",
    roomType: "Cozinha",
    wallWidth: 4000,
    wallHeight: 2700,
    styleDescription: "Cozinha moderna com ilha central, armários até o teto...",
    technicalBriefing: "",
    analysisStatus: 'COMPLETO',
  };

  const mockSelectedStyleId = "moderno_organico";
  const mockSelectedMaterials: Material[] = [
    MOCK_MATERIALS.find(m => m.id === 'mdf_grafite')!,
    MOCK_MATERIALS.find(m => m.id === 'pedra_calacatta')!,
    MOCK_MATERIALS.find(m => m.id === 'metal_champagne')!,
    MOCK_MATERIALS.find(m => m.id === 'mdf_branco')!,
    MOCK_MATERIALS.find(m => m.id === 'mdf_freijo')!,
  ];

  try {
    // 1. Gerar Budget
    console.log("\n--- Executando simulação de Orçamento (generate_budget.ts) ---");
    const budgetResult = await runBudgetSimulation(mockInsights, mockSelectedStyleId, mockSelectedMaterials);
    const budgetHash = budgetResult.budgetHash; // Este é o hash canônico
    console.log(`[Orçamento] Hash final (canônico): ${budgetHash}`);

    // 2. Gerar Aprovação Digital do Orçamento (budget_approval.json)
    console.log("\n--- Executando simulação de Aprovação Digital (simulate_digital_approval.ts) ---");
    await runDigitalApprovalSimulation(quoteId, budgetHash || "");

    // 3. Gerar Contract.txt
    console.log("\n--- Executando simulação de Contrato (simulate_contract_txt.ts) ---");
    const contractHash = await runContractTxtSimulation(budgetHash || "", quoteId);
    console.log(`[Contrato] Hash final: ${contractHash}`);

    // 4. Gerar Contract Acceptance
    console.log("\n--- Executando simulação de Aceite de Contrato (simulate_contract_acceptance.ts) ---");
    await simulateContractAcceptance(quoteId, budgetHash || "", contractHash || "");

    // 5. Gerar Integrity.json
    console.log("\n--- Executando geração de Integrity.json (generate_integrity_json.ts) ---");
    await generateIntegrityJson(quoteId);

    console.log("\n✅ Todas as simulações foram concluídas com sucesso e artefatos gerados nos diretórios 'exports'!");

  } catch (error) {
    console.error("❌ Erro durante a orquestração das simulações:", error);
    process.exit(1);
  }
}

main().catch(console.error);
