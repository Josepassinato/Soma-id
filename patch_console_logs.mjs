import fs from "fs";

const file = "./generate_budget.ts";
let s = fs.readFileSync(file, "utf8");

// Substituir todas as ocorrências de \\n por \n nos console.log
// Usar regex para encontrar console.log com \\n
const before = s;
s = s.replace(/console\.log\((["'`])(.*?)\\\\n(.*?)\1\)/g, (match, quote, before, after) => {
  return `console.log(${quote}${before}\\n${after}${quote})`;
});

if (s !== before) {
  fs.writeFileSync(file, s, "utf8");
  console.log("✅ Patch aplicado: barras invertidas duplas (\\\\n) corrigidas para (\\n) nos console.log.");
} else {
  console.log("✅ Nenhum patch necessário ou nenhuma barra invertida dupla encontrada.");
}
