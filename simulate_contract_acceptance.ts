import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface BudgetResult {
  quoteId: string;
  budgetVersion: string;
  generatedAt: string;
  budgetHash: string;
  // Outros campos do orçamento que podem ser úteis, se houver
}

interface ContractAcceptance {
  contract_id: string;
  related_quote_id: string;
  budget_hash: string;
  contract_hash: string; // Hash do contract.txt que foi assinado
  accepted_at: string;
  accepted_by: {
    name: string;
    email: string;
    ip: string;
    user_agent: string;
  };
  acceptance_text: string;
}

// --- TEXTO COMPLETO DO CONTRATO (FLORIDA, MVP) ---
// Este template será preenchido e salvo em contract.txt, mas NÃO é gerado por este script.
// Ele é usado aqui para referência e para ilustrar o conteúdo que foi supostamente 'aceito'.
const CONTRACT_TEMPLATE = `
DESIGN & PROJECT SERVICES AGREEMENT (FLORIDA)

Contract ID: {{CONTRACT_ID}}
Related Quote ID: {{RELATED_QUOTE_ID}}
Budget Version: {{BUDGET_VERSION}}
Budget Hash (SHA256): {{BUDGET_HASH}}

This Design & Project Services Agreement (“Agreement”) is entered into on {{DATE}} (“Effective Date”) by and between:

Service Provider: {{COMPANY_LEGAL_NAME}}, a {{STATE}} entity, with principal address at {{COMPANY_ADDRESS}} (“Provider”)
and
Client: {{CLIENT_FULL_NAME}}, email {{CLIENT_EMAIL}}, address {{CLIENT_ADDRESS}} (“Client”).

Provider and Client may be referred to individually as a “Party” and collectively as the “Parties”.

1. Scope of Services
1.1 Design/Project Services Only. Provider will deliver design and project documentation services for the Client’s space (“Services”), which may include:
Concept inspiration image(s) (“Encantamento”)
Concept layout (e.g., SVG/2D layout)
Design iterations based on Client feedback
Project coordination up to design approval
1.2 Not Manufacturing / Not Installation. This Agreement is for design/project services only. Manufacturing, fabrication, installation, and on-site construction services (if any) are not included unless executed under a separate written agreement.
1.3 Deliverables. Deliverables and the commercial scope are tied to the approved estimate identified by:
Quote ID: {{RELATED_QUOTE_ID}}
Budget Version: {{BUDGET_VERSION}}
Budget Hash: {{BUDGET_HASH}}

2. Estimate, Pricing and Adjustments
2.1 Non-Executive Estimate. The budget approved by the Client is an estimate for commercial approval, not a final executive price.
2.2 Final Pricing. Final pricing (if applicable) may change after:
Field measurements / site verification
Final material selections
Hardware/accessories selections
Technical detailing and constraints discovered during design
2.3 Validity. The estimate is valid for 7 days from {{BUDGET_VALID_FROM}} unless stated otherwise in writing.

3. Payment Terms
3.1 Project Fees. Client agrees to pay Provider the project/design fees as described in the estimate.
3.2 Milestone Payments (MVP). Unless otherwise agreed in writing, payment will be made in milestones:
Deposit: {{PAYMENT_DEPOSIT}} due upon contract acceptance
Design Approval Milestone: {{PAYMENT_MID}} due upon design approval
Final Milestone: {{PAYMENT_FINAL}} due prior to final delivery of project package
(Payment in stages (deposit + milestones) as listed in the estimate and confirmed by Provider.)
3.3 Late Payments. Past-due amounts may incur reasonable late fees and/or suspension of Services until payment is received.

4. Client Responsibilities
Client agrees to:
Provide accurate information and timely responses
Provide access for measurements if required
Approve decisions (layout/materials) in a timely manner
Delays caused by Client may extend deadlines.

5. Revisions and Change Requests
5.1 Provider includes {{REVISION_ROUNDS}} rounds of design revisions (or “reasonable revisions during concept phase” for MVP).
5.2 Additional revisions or scope changes may require:
additional fees, and/or
schedule adjustments
Provider will notify Client before performing billable changes.

6. Schedule and Delivery
Provider will use commercially reasonable efforts to deliver Services within an estimated timeline. Timelines depend on Client responsiveness, complexity, and availability of required inputs.

7. Cancellation and Refund Policy
7.1 Client may cancel by written notice.
7.2 Because Services involve time-based professional work, fees may be non-refundable once work has begun, except as required by law.
7.3 If cancellation occurs:
Provider will stop work
Client will be responsible for Services already performed up to the cancellation date
(Adjust this with legal review to match your business policy.)

8. Intellectual Property
8.1 Provider retains ownership of concepts, templates, and internal methods.
8.2 Upon full payment, Client receives a license to use the final design deliverables for the intended project.

9. Limitation of Liability
To the maximum extent permitted by law:
Provider is not liable for indirect, incidental, special, or consequential damages
Provider’s total liability under this Agreement will not exceed the amounts actually paid by Client for Services under this Agreement

10. Governing Law and Venue
This Agreement shall be governed by the laws of the State of Florida, without regard to conflict-of-law rules. Venue shall be in {{COUNTY}}, Florida.

11. Electronic Acceptance and Records
11.1 Electronic Acceptance. Client agrees that checking the acceptance box and typing their name constitutes an electronic signature, and that this Agreement is legally binding.
11.2 Audit Log. Provider will maintain a record including date/time, IP address, user agent, and the approved budget hash. Client acknowledges these records as evidence of acceptance.

12. Entire Agreement
This Agreement constitutes the entire agreement between the Parties regarding the Services and supersedes all prior communications.

✅ ACCEPTANCE
Client Acceptance (Electronic Signature):
☑ I have read, understood, and agree to this Agreement.
Client Name (typed): {{CLIENT_FULL_NAME}}
Email: {{CLIENT_EMAIL}}
Accepted At (UTC): {{ACCEPTED_AT}}
IP Address: {{CLIENT_IP}}
User Agent: {{USER_AGENT}}
Provider: {{COMPANY_LEGAL_NAME}}
`;

export async function simulateContractAcceptance(quoteId: string, budgetHash: string, contractHash: string): Promise<ContractAcceptance> {
  console.log("Simulando aceite eletrônico do contrato...");

  const exportsBaseDir = path.join("exports", quoteId); // Base para exports
  const exportsLegalDir = path.join(exportsBaseDir, "legal"); // Diretório legal

  // Garantir que o diretório legal exista
  if (!fs.existsSync(exportsLegalDir)) {
    fs.mkdirSync(exportsLegalDir, { recursive: true });
  }

  const contractAcceptanceJsonPath = path.join(exportsLegalDir, 'contract_acceptance.json');

  // Dados da empresa (mockados para MVP)
  const companyLegalName = "SOMA-ID Technologies LLC";
  const companyState = "Florida";
  const companyAddress = "428 Plaza Real Apt 229, Boca Raton, FL 33432";
  const contractCounty = "Palm Beach County";

  // Dados do cliente e orçamento (mockados ou extraídos de onde for necessário)
  const clientFullName = "Maria Silva"; // Mockado - idealmente viria de um Project Insights
  const clientEmail = "maria.silva@example.com"; // Mockado
  const clientAddress = "Endereço do Cliente Mockado";
  const clientIp = "192.168.1.1"; // Mockado
  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36"; // Mockado
  const acceptanceText = "Eu li, entendi e concordo com este Acordo."; // Mockado

  // Preencher placeholders no contrato template (apenas para referência/exibição)
  let filledContract = CONTRACT_TEMPLATE;
  filledContract = filledContract.replace(/{{CONTRACT_ID}}/g, `CT-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`);
  filledContract = filledContract.replace(/{{RELATED_QUOTE_ID}}/g, quoteId);
  filledContract = filledContract.replace(/{{BUDGET_VERSION}}/g, "v1.0"); // Mock
  filledContract = filledContract.replace(/{{BUDGET_HASH}}/g, budgetHash);
  filledContract = filledContract.replace(/{{DATE}}/g, new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
  filledContract = filledContract.replace(/{{COMPANY_LEGAL_NAME}}/g, companyLegalName);
  filledContract = filledContract.replace(/{{STATE}}/g, companyState);
  filledContract = filledContract.replace(/{{COMPANY_ADDRESS}}/g, companyAddress);
  filledContract = filledContract.replace(/{{CLIENT_FULL_NAME}}/g, clientFullName);
  filledContract = filledContract.replace(/{{CLIENT_EMAIL}}/g, clientEmail);
  filledContract = filledContract.replace(/{{CLIENT_ADDRESS}}/g, clientAddress);
  filledContract = filledContract.replace(/{{BUDGET_VALID_FROM}}/g, "Data da Validade do Orçamento Mockada"); // Mock
  filledContract = filledContract.replace(/{{PAYMENT_DEPOSIT}}/g, "30%"); // Mock
  filledContract = filledContract.replace(/{{PAYMENT_MID}}/g, "40%"); // Mock
  filledContract = filledContract.replace(/{{PAYMENT_FINAL}}/g, "30%"); // Mock
  filledContract = filledContract.replace(/{{REVISION_ROUNDS}}/g, "2"); // Mock
  filledContract = filledContract.replace(/{{COUNTY}}/g, contractCounty);
  filledContract = filledContract.replace(/{{ACCEPTED_AT}}/g, new Date().toISOString());
  filledContract = filledContract.replace(/{{CLIENT_IP}}/g, clientIp);
  filledContract = filledContract.replace(/{{USER_AGENT}}/g, userAgent);

  // Criar o objeto de aceite do contrato
  const contractAcceptance: ContractAcceptance = {
    contract_id: `CA-${new Date().getFullYear()}-${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}`,
    related_quote_id: quoteId,
    budget_hash: budgetHash,
    contract_hash: contractHash, // Usar o hash do contract.txt que foi passado
    accepted_at: new Date().toISOString(),
    accepted_by: {
      name: clientFullName,
      email: clientEmail,
      ip: clientIp,
      user_agent: userAgent,
    },
    acceptance_text: acceptanceText,
  };

  // Salvar o contract_acceptance.json
  const acceptanceJsonContent = JSON.stringify(contractAcceptance, null, 2);
  fs.writeFileSync(contractAcceptanceJsonPath, acceptanceJsonContent);

  console.log(`✅ Registro de aceite do contrato salvo em: ${contractAcceptanceJsonPath}`);
  console.log("\n--- REGISTRO DE ACEITE ELETRÔNICO DO CONTRATO ---");
  console.log(acceptanceJsonContent);
  console.log("--------------------------------------------------");

  return contractAcceptance; // Retorna o objeto de aceite para uso posterior se necessário
}
