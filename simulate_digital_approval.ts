
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface BudgetApproval {
  quote_id: string;
  budget_version: string;
  budget_hash: string;
  approved_at: string;
  approved_by: {
    name: string;
    email: string;
    ip: string;
    user_agent: string;
  };
  acceptance_text: string;
}

export async function runDigitalApprovalSimulation(quoteId: string, budgetHash: string): Promise<BudgetApproval> {
  console.log(`Simulando aprovação digital do orçamento para Quote ID: ${quoteId}...`);

  const exportsBaseDir = path.join("exports", quoteId); // Base para exports
  const exportsCommercialDir = path.join(exportsBaseDir, "commercial");

  // Certificar-se de que o diretório comercial existe
  if (!fs.existsSync(exportsCommercialDir)) {
    fs.mkdirSync(exportsCommercialDir, { recursive: true });
  }

  const budgetApprovalJsonPath = path.join(exportsCommercialDir, 'budget_approval.json');

  // Simular dados do cliente que aprova
  const clientName = "Cliente Teste SOMA-ID";
  const clientEmail = "cliente@soma-id.com";
  const clientIp = "189.123.45.67"; // IP mockado
  const clientUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"; // User-Agent mockado
  const acceptanceText = "Li e concordo com este orçamento estimado e autorizo o início do projeto.";

  const budgetApproval: BudgetApproval = {
    quote_id: quoteId,
    budget_version: "v1.0", // Mockado, idealmente viria do budget original
    budget_hash: budgetHash, // Usar o hash passado como parâmetro
    approved_at: new Date().toISOString(),
    approved_by: {
      name: clientName,
      email: clientEmail,
      ip: clientIp,
      user_agent: clientUserAgent,
    },
    acceptance_text: acceptanceText,
  };

  // Salvar o budget_approval.json
  const approvalJsonContent = JSON.stringify(budgetApproval, null, 2);
  fs.writeFileSync(budgetApprovalJsonPath, approvalJsonContent);

  console.log(`✅ Registro de aprovação salvo em: ${budgetApprovalJsonPath}`);
  console.log("\n--- REGISTRO DE APROVAÇÃO DIGITAL DO ORÇAMENTO ---");
  console.log(approvalJsonContent);
  console.log("--------------------------------------------------");

  return budgetApproval;
}
