
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface FileIntegrity {
  path: string;
  sha256: string;
}

interface IntegrityJson {
  quote_id: string;
  contract_id: string;
  budget_hash: string;
  contract_hash: string;
  files: FileIntegrity[];
}

// Função auxiliar para calcular o SHA256 de um arquivo
function calculateFileHash(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

export async function generateIntegrityJson(quoteId: string) {
  console.log(`Gerando integrity.json para o quoteId: ${quoteId}...`);

  const exportsBaseDir = path.join("exports", quoteId); // Base para exports
  const exportsCommercialDir = path.join(exportsBaseDir, "commercial");
  const exportsLegalDir = path.join(exportsBaseDir, "legal"); // Contrato e aceite estão em 'legal'
  const exportsMetaDir = path.join(exportsBaseDir, "meta");
  // const exportsConceptDir = path.join(exportsBaseDir, "concept"); // Opcional

  // Certificar-se de que os diretórios existem
  if (!fs.existsSync(exportsMetaDir)) {
    fs.mkdirSync(exportsMetaDir, { recursive: true });
  }
  if (!fs.existsSync(exportsLegalDir)) {
    fs.mkdirSync(exportsLegalDir, { recursive: true });
  }

  const integrityJsonPath = path.join(exportsMetaDir, "integrity.json");

  // --- 1. Carregar artefatos principais para metadados ---
  // Carregar budget.json para obter o budget_hash (que agora está dentro do JSON)
  const budgetJsonContent = fs.readFileSync(path.join(exportsCommercialDir, "budget.json"), 'utf-8');
  // const budgetJson = JSON.parse(budgetJsonContent); // Não precisamos mais do objeto completo aqui

  // Carregar contract_acceptance.json para obter contract_id, budget_hash e contract_hash
  const contractAcceptanceJsonContent = fs.readFileSync(path.join(exportsLegalDir, "contract_acceptance.json"), 'utf-8');
  const contractAcceptanceJson = JSON.parse(contractAcceptanceJsonContent);

  // const contractTxtContent = fs.readFileSync(path.join(exportsLegalDir, "contract.txt"), 'utf-8'); // Conteúdo para hash, mas já pegamos o hash do acceptance

  // --- 2. Obter hashes e IDs da fonte de verdade (contract_acceptance.json) ---
  const finalBudgetHash = contractAcceptanceJson.budget_hash;
  const finalContractHash = contractAcceptanceJson.contract_hash;
  const contractId = contractAcceptanceJson.contract_id;
  
  // --- 3. Calcular hashes de todos os arquivos relevantes para 'files' (sempre do conteúdo do arquivo) ---
  const filesToHash: string[] = [
    path.join(exportsCommercialDir, "budget.json"),
    path.join(exportsCommercialDir, "budget_approval.json"), // Adicionado!
    path.join(exportsLegalDir, "contract.txt"),
    path.join(exportsLegalDir, "contract_acceptance.json"),
    // path.join(exportsConceptDir, "enchant.png"), // Opcional
    // path.join(exportsConceptDir, "layout.svg"),  // Opcional
  ];

  const integrityFiles: FileIntegrity[] = filesToHash.map(fullPath => {
    const relativePath = path.relative(exportsBaseDir, fullPath); // Caminho relativo à base do quoteId
    return { path: relativePath, sha256: calculateFileHash(fullPath) };
  });

  // --- 4. Construir o integrity.json ---
  const integrityData: IntegrityJson = {
    quote_id: quoteId,
    contract_id: contractId,
    budget_hash: finalBudgetHash,
    contract_hash: finalContractHash,
    files: integrityFiles,
  };

  // --- 5. Salvar o integrity.json ---
  const integrityJsonContent = JSON.stringify(integrityData, null, 2);
  fs.writeFileSync(integrityJsonPath, integrityJsonContent);

  console.log(`✅ integrity.json gerado em: ${integrityJsonPath}`);
  console.log("\n--- CONTEÚDO DO INTEGRITY.JSON ---");
  console.log(integrityJsonContent);
  console.log("-------------------------------------");
}
