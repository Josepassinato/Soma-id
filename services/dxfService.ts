
import { NestingResult, Sheet, DrillingPoint } from "../types";

export class DxfService {
  private output: string = "";

  constructor() {
    this.writeHeader();
    this.writeTables();
    this.output += "0\nSECTION\n2\nENTITIES\n";
  }

  private writeHeader() {
    this.output += "999\nSOMA-ID PRO INDUSTRIAL SIGN-OFF\n0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n";
  }

  private writeTables() {
    this.output += "0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n7\n";
    this.defineLayer("0", 7);
    this.defineLayer("CHAPA", 8);
    this.defineLayer("CORTE_EXTERNO", 1); 
    this.defineLayer("FURACAO_ESTRUTURAL", 3); 
    this.defineLayer("FURACAO_FERRAGEM", 4); 
    this.defineLayer("FURACAO_SISTEMA", 2); 
    this.defineLayer("ETIQUETAS", 7); // Camada de texto
    this.output += "0\nENDTAB\n0\nENDSEC\n";
  }

  private defineLayer(name: string, color: number) {
    this.output += `0\nLAYER\n2\n${name}\n70\n0\n62\n${color}\n6\nCONTINUOUS\n`;
  }

  private addPolylineRect(x: number, y: number, w: number, h: number, layer: string) {
    this.output += `0\nLWPOLYLINE\n8\n${layer}\n100\nAcDbEntity\n100\nAcDbPolyline\n90\n4\n70\n1\n`;
    this.output += `10\n${x}\n20\n${y}\n10\n${x + w}\n20\n${y}\n10\n${x + w}\n20\n${y + h}\n10\n${x}\n20\n${y + h}\n`;
  }

  private addCircle(x: number, y: number, diameter: number, layer: string) {
    this.output += `0\nCIRCLE\n8\n${layer}\n10\n${x}\n20\n${y}\n30\n0\n40\n${diameter / 2}\n`;
  }

  private addText(x: number, y: number, height: number, text: string, layer: string) {
    const safeText = text.toUpperCase().replace(/[^A-Z0-9 ./_-]/g, "");
    this.output += `0\nTEXT\n8\n${layer}\n10\n${x}\n20\n${y}\n30\n0\n40\n${height}\n1\n${safeText}\n`;
  }

  private getLayerByType(type: string): string {
    switch(type) {
        case 'structural': return 'FURACAO_ESTRUTURAL';
        case 'hinge': return 'FURACAO_FERRAGEM';
        case 'slider': return 'FURACAO_SISTEMA';
        case 'shelf': return 'FURACAO_SISTEMA';
        default: return '0';
    }
  }

  public generateNestingDxf(nesting: NestingResult): string {
    let offsetX = 0;
    const GAP = 3500;

    nesting.sheets.forEach(sheet => {
      const baseX = offsetX;
      this.addPolylineRect(baseX, 0, sheet.width, sheet.height, "CHAPA");
      this.addText(baseX + 50, sheet.height + 100, 60, `CHAPA #${sheet.id} - ${sheet.material} (Efic: ${(100 - sheet.waste*100).toFixed(1)}%)`, "ETIQUETAS");

      sheet.items.forEach(item => {
        const itemX = baseX + item.x;
        const itemY = item.y;
        this.addPolylineRect(itemX, itemY, item.width, item.height, "CORTE_EXTERNO");
        item.drillingPoints?.forEach(p => {
            const layer = this.getLayerByType(p.type);
            this.addCircle(itemX + p.x, itemY + p.y, p.diameter, layer);
        });

        const labelSize = Math.min(item.width, item.height) > 100 ? 25 : 12;
        this.addText(itemX + 10, itemY + item.height - labelSize - 10, labelSize, `${item.partName}`, "ETIQUETAS");
        this.addText(itemX + 10, itemY + item.height - (labelSize*2) - 15, labelSize * 0.7, `${item.height}X${item.width}`, "ETIQUETAS");
        this.addText(itemX + 10, itemY + 20, 10, `SOMA-ID: ${item.moduleName.split(' ')[0]}`, "ETIQUETAS");
      });
      offsetX += sheet.width + GAP;
    });

    this.output += "0\nENDSEC\n0\nEOF\n";
    return this.output;
  }
}
