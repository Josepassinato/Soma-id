import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface ContractDetails {
  quoteId: string;
  contractVersion: string;
  generatedAt: string;
  clientName: string;
  projectName: string;
  budgetHash: string; // Referência ao hash do orçamento
  contractHash?: string; // Hash do próprio contrato
}

function generateContractContent(details: ContractDetails): string {
  return `
--- CONTRATO DE PRESTAÇÃO DE SERVIÇOS SOMA-ID ---

ID do Orçamento Referência: ${details.quoteId}
Versão do Contrato: ${details.contractVersion}
Gerado em (UTC): ${details.generatedAt}

Cliente: ${details.clientName}
Projeto: ${details.projectName}

Cláusula 1: Objeto do Contrato
Este contrato tem como objeto a prestação de serviços de projeto e fabricação de marcenaria, conforme detalhado no orçamento de referência ID ${details.quoteId}.

Cláusula 2: Valores e Pagamento
Os valores e condições de pagamento estão em conformidade com o orçamento de referência cujo hash SHA256 é: ${details.budgetHash}.

Cláusula 3: Prazos e Entregas
Os prazos serão definidos em cronograma anexo após a aprovação final do projeto executivo.

Cláusula 4: Vigência
Este contrato tem vigência a partir da data de sua assinatura.

Cláusula 5: Foro
Fica eleito o foro da Comarca de São Paulo, Estado de São Paulo, para dirimir quaisquer dúvidas ou litígios.

------------------------------------------------
Hash SHA256 do Orçamento Referência: ${details.budgetHash}
------------------------------------------------
`;
}

export async function runSimulation(budgetHash: string, quoteId: string) {
  console.log("Gerando contrato simulado...");

  const contractDetails: ContractDetails = {
    quoteId: quoteId,
    contractVersion: "v1.0",
    generatedAt: new Date().toISOString(),
    clientName: "Maria Silva",
    projectName: "Cozinha Moderna",
    budgetHash: budgetHash,
  };

  const contractContent = generateContractContent(contractDetails);

  // Gerar o hash do contrato
  const contractHash = crypto.createHash('sha256').update(contractContent).digest('hex');
  contractDetails.contractHash = contractHash;

  const exportsBaseDir = path.join("exports", quoteId);
  const exportsLegalDir = path.join(exportsBaseDir, "legal"); // Diretório legal

  // Garantir que o diretório legal exista
  if (!fs.existsSync(exportsLegalDir)) {
    fs.mkdirSync(exportsLegalDir, { recursive: true });
  }

  const contractTxtPath = path.join(exportsLegalDir, 'contract.txt');
  fs.writeFileSync(contractTxtPath, contractContent);

  console.log(`✅ Contrato salvo em: ${contractTxtPath}`);
  console.log(`🔗 Hash SHA256 do Contrato: ${contractHash}`);
  console.log(`🔗 Contrato referencia Budget Hash: ${budgetHash}`);

  // Retorna o hash do contrato para ser usado no simulate_contract_acceptance.ts
  return contractHash;
}
