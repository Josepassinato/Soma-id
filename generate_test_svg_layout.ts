
import { LayoutService, LayoutInput } from './services/layoutService';
import * as fs from 'fs';

const layoutService = new LayoutService();

const sampleLayout: LayoutInput = {
  environmentWidth: 3000,
  environmentHeight: 2500,
  modules: [
    { id: "MOD001", name: "Armário Base", x: 100, y: 0, width: 800, height: 700, color: "#aaddff" },
    { id: "MOD002", name: "Gaveteiro", x: 900, y: 0, width: 600, height: 700, color: "#ffaaee" },
    { id: "MOD003", name: "Armário Superior", x: 100, y: 800, width: 1400, height: 900, color: "#ddffaa" }
  ],
  scaleFactor: 0.1 // 1mm = 0.1px para uma visualização menor
};

try {
  const svgContent = layoutService.generateSimpleSvgLayout(sampleLayout);
  const fileName = `LAYOUT_TEST.svg`;
  fs.writeFileSync(`./exports/${fileName}`, svgContent);
  console.log(`Layout SVG de teste '${fileName}' gerado com sucesso em ./exports/`);
} catch (error) {
  console.error("Erro ao gerar layout SVG de teste:", error.message);
}
