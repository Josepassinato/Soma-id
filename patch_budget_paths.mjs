import fs from "fs";
import path from "path"; // Importar path aqui

const file = "./generate_budget.ts"; // Caminho relativo ao diretório atual (soma-id)
let s = fs.readFileSync(file, "utf8");

const oldBlock =
`    // Gerar e salvar budget.json (sem o hash ainda)
    const exportsDir = "./exports";
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    const budgetJsonPath = path.join(exportsDir, 'budget.json');`;

const newBlock =
`    // Gerar e salvar budget.json (sem o hash ainda)
    const exportsBaseDir = path.join("exports", budget.quoteId); // Base para exports
    const exportsCommercialDir = path.join(exportsBaseDir, "commercial");
    if (!fs.existsSync(exportsCommercialDir)) {
      fs.mkdirSync(exportsCommercialDir, { recursive: true });
    }
    const budgetJsonPath = path.join(exportsCommercialDir, 'budget.json');`;

let changed = false;

// Aplicar patch para o bloco de salvamento de arquivos
if (s.includes(oldBlock)) {
  s = s.replace(oldBlock, newBlock);
  changed = true;
} else {
  console.warn("⚠️ Bloco de salvamento de arquivos não encontrado para patch. Verifique se o arquivo já foi corrigido ou se o 'oldBlock' está desatualizado.");
}

if (changed) {
  fs.writeFileSync(file, s, "utf8");
  console.log("✅ Patch aplicado com sucesso.");
} else {
  console.log("✅ Nenhum patch necessário ou bloco(s) não encontrado(s).");
}
