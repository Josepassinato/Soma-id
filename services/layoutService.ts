
export interface ModuleLayout {
  id: string;
  name: string;
  x: number;      // Posição X do canto inferior esquerdo do módulo
  y: number;      // Posição Y do canto inferior esquerdo do módulo
  width: number;
  height: number;
  color?: string; // Cor para visualização
}

export interface LayoutInput {
  environmentWidth: number;
  environmentHeight: number;
  modules: ModuleLayout[];
  scaleFactor?: number; // Fator de escala para o SVG (ex: pixels por mm)
}

export class LayoutService {
  public generateSimpleSvgLayout(input: LayoutInput): string {
    const scale = input.scaleFactor || 1; // Default 1 pixel por unidade

    const svgWidth = input.environmentWidth * scale;
    const svgHeight = input.environmentHeight * scale;

    let svgContent = ``;
    svgContent += `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${input.environmentWidth} ${input.environmentHeight}" xmlns="http://www.w3.org/2000/svg">`;
    svgContent += `<rect x="0" y="0" width="${input.environmentWidth}" height="${input.environmentHeight}" fill="#f0f0f0" stroke="black" stroke-width="1"/>`; // Ambiente

    for (const module of input.modules) {
      const fillColor = module.color || "#cccccc"; // Cor padrão para módulos
      svgContent += `<rect x="${module.x}" y="${module.y}" width="${module.width}" height="${module.height}" fill="${fillColor}" stroke="black" stroke-width="0.5"/>`;
      svgContent += `<text x="${module.x + module.width / 2}" y="${module.y + module.height / 2}" font-family="Arial" font-size="10" text-anchor="middle" alignment-baseline="middle" fill="black">${module.name}</text>`;
    }

    svgContent += `</svg>`;
    return svgContent;
  }
}
