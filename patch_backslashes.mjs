import fs from "fs";

const file = "./generate_budget.ts";
let s = fs.readFileSync(file, "utf8");

// Remover barras invertidas literais no final das linhas (line continuation inválida em TypeScript)
const before = s;
s = s.replace(/,\\\s*$/gm, ',');

if (s !== before) {
  fs.writeFileSync(file, s, "utf8");
  console.log("✅ Patch aplicado: barras invertidas literais (\\) removidas do final das linhas.");
} else {
  console.log("✅ Nenhum patch necessário.");
}
