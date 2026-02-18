
import { NestingResult, Sheet, DrillingPoint, PartDxfInput } from "../types";

export class DxfService {
  private output: string = "";
  private warnings: string[] = [];

  public getWarnings(): string[] {
    return this.warnings.slice();
  }

  private reset() {
    this.output = "";
    this.warnings = [];
    this.writeHeader();
  }

  private writeHeader() {
    this.output += "0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n9\n$INSUNITS\n70\n4\n999\nSOMA-ID PRO INDUSTRIAL SIGN-OFF\n0\nENDSEC\n";
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

  private writeTablesForPart() {
    this.output += "0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n4\n";
    this.defineLayer("0", 7);
    this.defineLayer("CUT_OUT", 1);
    this.defineLayer("DRILL_V", 3);
    this.defineLayer("DRILL_H", 5);
    this.defineLayer("TEXT_ID", 7);
    this.output += "0\nENDTAB\n0\nENDSEC\n";
  }

  private writeBlocksSection() {
    this.output += "0\nSECTION\n2\nBLOCKS\n";
    this.writeBlocksPartInfoContent();
    this.writeBlocksDrillHole();
    this.output += "0\nENDSEC\n";
  }

  private writeBlocksPartInfoContent() {
    // BLOCK header
    this.output += "0\nBLOCK\n8\n0\n2\nPART_INFO\n70\n0\n10\n0\n20\n0\n30\n0\n3\nPART_INFO\n1\n\n";

    const attdef = (tag: string, x: number, y: number) => {
      this.output += `0\nATTDEF\n8\nTEXT_ID\n10\n${x}\n20\n${y}\n30\n0\n40\n20\n1\n\n3\n${tag}\n2\n${tag}\n70\n0\n`;
    };

    attdef("PART_ID", 0, 0);
    attdef("MODULE_ID", 0, -25);
    attdef("THICKNESS_MM", 0, -50);
    attdef("MATERIAL", 0, -75);

    // End block
    this.output += "0\nENDBLK\n";
  }

  private writeBlocksDrillHole() {
    this.output += "0\nBLOCK\n8\n0\n2\nDRILL_HOLE\n70\n0\n10\n0\n20\n0\n30\n0\n3\nDRILL_HOLE\n1\n\n";

    const attdef = (tag: string, x: number, y: number) => {
      this.output += `0\nATTDEF\n8\nDRILL_H\n10\n${x}\n20\n${y}\n30\n0\n40\n20\n1\n\n3\n${tag}\n2\n${tag}\n70\n0\n`;
    };

    attdef("FACE", 0, 0);
    attdef("DIA_MM", 0, 25);
    attdef("DEPTH_MM", 0, 50);
    attdef("Z_FROM_FACE_MM", 0, 75);

    this.output += "0\nENDBLK\n";
  }

  private insertPartInfo(x: number, y: number, data: Record<string, string | number>) {
    this.output += `0\nINSERT\n8\nTEXT_ID\n2\nPART_INFO\n10\n${x}\n20\n${y}\n30\n0\n66\n1\n`;

    const attrib = (tag: string, value: string | number, dy: number) => {
      const v = String(value);
      this.output += `0\nATTRIB\n8\nTEXT_ID\n10\n${x}\n20\n${y + dy}\n30\n0\n40\n20\n1\n${v}\n2\n${tag}\n70\n0\n`;
    };

    attrib("PART_ID", data.PART_ID, 0);
    attrib("MODULE_ID", data.MODULE_ID, -25);
    attrib("THICKNESS_MM", data.THICKNESS_MM, -50);
    attrib("MATERIAL", data.MATERIAL, -75);

    this.output += "0\nSEQEND\n";
  }

  private insertDrillHoleH(x: number, y: number, data: { FACE: DrillHFace; DIA_MM: number; DEPTH_MM: number; Z_FROM_FACE_MM?: number }) {
    this.output += `0\nINSERT\n8\nDRILL_H\n2\nDRILL_HOLE\n10\n${x}\n20\n${y}\n30\n0\n66\n1\n`;

    const attrib = (tag: string, value: string | number, dy: number) => {
      const v = String(value);
      this.output += `0\nATTRIB\n8\nDRILL_H\n10\n${x}\n20\n${y + dy}\n30\n0\n40\n20\n1\n${v}\n2\n${tag}\n70\n0\n`;
    };

    attrib("FACE", data.FACE, 0);
    attrib("DIA_MM", data.DIA_MM, 25);
    attrib("DEPTH_MM", data.DEPTH_MM, 50);
    if (data.Z_FROM_FACE_MM !== undefined) {
      attrib("Z_FROM_FACE_MM", data.Z_FROM_FACE_MM, 75);
    }

    this.output += "0\nSEQEND\n";
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
    this.reset();
    this.writeTables();
    this.output += "0\nSECTION\n2\nENTITIES\n";
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

  public generatePartDxf(input: PartDxfInput): string {
    this.reset();
    this.writeTablesForPart();
    this.writeBlocksSection();

    this.output += "0\nSECTION\n2\nENTITIES\n";

    // Contorno na origem
    this.addPolylineRect(0, 0, input.width, input.height, "CUT_OUT");

    // Furos verticais (sem tipo/sem profundidade no v0.1)
    input.drillingPoints?.forEach(p => {
      if (p.x < 0 || p.y < 0) throw new Error("DXF v0.1: furo com coordenada negativa");
      this.addCircle(p.x, p.y, p.diameter, "DRILL_V");
    });

    // Furos horizontais (DRILL_H)
    input.drillHoles?.forEach(dh => {
      // A validação de posição será feita no lint
      this.insertDrillHoleH(dh.x, dh.y, {
        FACE: dh.face,
        DIA_MM: dh.diameter,
        DEPTH_MM: dh.depthMm,
        Z_FROM_FACE_MM: dh.zFromFaceMm,
      });
    });

    // Metadata
    const safeY = Math.max(20, input.height - 20);
    this.insertPartInfo(10, safeY, {
      PART_ID: input.partId,
      MODULE_ID: input.moduleId,
      THICKNESS_MM: input.thicknessMm,
      MATERIAL: input.material,
    });

    this.output += "0\nENDSEC\n0\nEOF\n";

    this.lintPartDxfOrThrow(input);

    return this.output;
  }

  private lintPartDxfOrThrow(input: PartDxfInput) {
    if (!this.output.includes("$INSUNITS\n70\n4")) throw new Error("DXF v0.1: unidade não-mm");
    if (!this.output.includes("\n8\nCUT_OUT\n")) throw new Error("DXF v0.1: sem CUT_OUT");
    if (!this.output.includes("\n2\nPART_INFO\n")) throw new Error("DXF v0.1: sem PART_INFO");
    
    // Check negative coords only in ENTITIES section (not in BLOCKS where they're relative)
    const entitiesStart = this.output.indexOf("SECTION\n2\nENTITIES\n");
    const entitiesEnd = this.output.indexOf("\n0\nENDSEC\n", entitiesStart);
    if (entitiesStart !== -1 && entitiesEnd !== -1) {
      const entitiesSection = this.output.substring(entitiesStart, entitiesEnd);
      if (/\n10\n-\d+(\.\d+)?\n/.test(entitiesSection) || /\n20\n-\d+(\.\d+)?\n/.test(entitiesSection)) {
        throw new Error("DXF v0.1: coordenada negativa encontrada na seção ENTITIES");
      }
    }

    const FAIL_MM = 5;
    const WARN_MM = 8;

    for (const p of input.drillingPoints ?? []) {
      const radius = p.diameter / 2;

      const clearLeft = p.x - radius;
      const clearBottom = p.y - radius;
      const clearRight = input.width - (p.x + radius);
      const clearTop = input.height - (p.y + radius);

      const edgeClearance = Math.min(clearLeft, clearBottom, clearRight, clearTop);

      // furo fora do painel (mesmo que por 0.1mm)
      if (edgeClearance < 0) {
        throw new Error(
          `DXF v0.1: furo fora do painel (x=${p.x}, y=${p.y}, dia=${p.diameter}). ` +
          `Clearances L=${clearLeft.toFixed(2)} B=${clearBottom.toFixed(2)} R=${clearRight.toFixed(2)} T=${clearTop.toFixed(2)}`
        );
      }

      if (edgeClearance < FAIL_MM) {
        throw new Error(
          `DXF v0.1: furo muito perto da borda (edge_clearance=${edgeClearance.toFixed(2)}mm < ${FAIL_MM}mm). ` +
          `x=${p.x}, y=${p.y}, dia=${p.diameter}`
        );
      }

      if (edgeClearance < WARN_MM) {
        this.warnings.push(
          `WARNING: furo perto da borda (edge_clearance=${edgeClearance.toFixed(2)}mm < ${WARN_MM}mm). ` +
          `x=${p.x}, y=${p.y}, dia=${p.diameter}`
        );
      }
    }

    // Lint v0.2 para DRILL_H
    for (const dh of input.drillHoles ?? []) {
      const radius = dh.diameter / 2;

      // 1) FACE válido
      const validFaces = ["L", "R", "T", "B"];
      if (!validFaces.includes(dh.face)) {
        throw new Error(`DXF v0.2: FACE inválida para furo horizontal (face=${dh.face}). Faces permitidas: L, R, T, B.`);
      }

      // 2) Posição compatível com a face
      const tolerance = 0.01; // Tolerância para ponto na borda
      if (dh.face === "L" && Math.abs(dh.x) > tolerance) {
        throw new Error(`DXF v0.2: Furo horizontal FACE=L deve ter x=0 (x=${dh.x}).`);
      }
      if (dh.face === "R" && Math.abs(dh.x - input.width) > tolerance) {
        throw new Error(`DXF v0.2: Furo horizontal FACE=R deve ter x=width (x=${dh.x}, width=${input.width}).`);
      }
      if (dh.face === "B" && Math.abs(dh.y) > tolerance) {
        throw new Error(`DXF v0.2: Furo horizontal FACE=B deve ter y=0 (y=${dh.y}).`);
      }
      if (dh.face === "T" && Math.abs(dh.y - input.height) > tolerance) {
        throw new Error(`DXF v0.2: Furo horizontal FACE=T deve ter y=height (y=${dh.y}, height=${input.height}).`);
      }

      // 3) DEPTH coerente
      if (dh.depthMm <= 0) {
        throw new Error(`DXF v0.2: DEPTH_MM para furo horizontal deve ser > 0 (depth=${dh.depthMm}).`);
      }
      if ((dh.face === "L" || dh.face === "R") && dh.depthMm > input.width) {
        throw new Error(`DXF v0.2: DEPTH_MM para furo FACE=${dh.face} excede a largura da peça (depth=${dh.depthMm} > width=${input.width}).`);
      }
      if ((dh.face === "T" || dh.face === "B") && dh.depthMm > input.height) {
        throw new Error(`DXF v0.2: DEPTH_MM para furo FACE=${dh.face} excede a altura da peça (depth=${dh.depthMm} > height=${input.height}).`);
      }

      // 4) Edge clearance para DRILL_H (ao longo da borda)
      let edgeClearanceDH: number;
      if (dh.face === "L" || dh.face === "R") {
        edgeClearanceDH = Math.min(dh.y - radius, input.height - (dh.y + radius));
      } else { // T ou B
        edgeClearanceDH = Math.min(dh.x - radius, input.width - (dh.x + radius));
      }

      if (edgeClearanceDH < FAIL_MM) {
        throw new Error(
          `DXF v0.2: furo horizontal muito perto da quina (edge_clearance=${edgeClearanceDH.toFixed(2)}mm < ${FAIL_MM}mm). ` +
          `Face=${dh.face}, x=${dh.x}, y=${dh.y}, dia=${dh.diameter}`
        );
      }

      if (edgeClearanceDH < WARN_MM) {
        this.warnings.push(
          `WARNING: furo horizontal perto da quina (edge_clearance=${edgeClearanceDH.toFixed(2)}mm < ${WARN_MM}mm). ` +
          `Face=${dh.face}, x=${dh.x}, y=${dh.y}, dia=${dh.diameter}`
        );
      }
    }
  }
}
