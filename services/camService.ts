
import { NestingResult, BlueprintData } from "../types";

/**
 * Serviço CAM SOMA-ID (Computer Aided Manufacturing)
 */
export const CamService = {
  generateCortecloudCSV: (blueprint: BlueprintData): string => {
    let csv = "Descrição;Comprimento(mm);Largura(mm);Quantidade;Material;Fita Borda\n";
    const modules = [...blueprint.mainWall.modules, ...(blueprint.sideWall?.modules || [])];
    modules.forEach(mod => {
      mod.cutList.forEach(part => {
        const edge = part.edgeBand || "0";
        csv += `${part.piece} [${mod.name}];${part.rawHeight};${part.rawWidth};${part.quantity};${part.material};${edge}\n`;
      });
    });
    return csv;
  },

  generateIsoGCode: (nesting: NestingResult): string => {
    let gcode = "%"; 
    gcode += "\n(SOMA-ID PRO - ISO G-Code Export)";
    gcode += `\n(Total Sheets: ${nesting.totalSheets})`;
    gcode += "\nG90 (Absolute Positioning)";
    gcode += "\nG21 (Units: Metric)";
    gcode += "\nG17 (Plane XY)";
    
    nesting.sheets.forEach(sheet => {
      gcode += `\n\n(--- SOMA-ID SHEET ${sheet.id} ---)`;
      gcode += "\nM06 T1 (Tool Change - Cutting Bit)";
      gcode += "\nM03 S18000 (Spindle On)";
      gcode += "\nG0 Z50 (Safe Height)";

      sheet.items.forEach(item => {
        gcode += `\n(PART: ${item.partName} - ${item.moduleName})`;
        gcode += `\nG0 X${item.x.toFixed(2)} Y${item.y.toFixed(2)}`;
        gcode += "\nG0 Z5 (Approach)";
        gcode += "\nG1 Z-2 F1000 (Plunge into material)";
        gcode += `\nG1 X${(item.x + item.width).toFixed(2)} Y${item.y.toFixed(2)} F5000`;
        gcode += `\nG1 X${(item.x + item.width).toFixed(2)} Y${(item.y + item.height).toFixed(2)}`;
        gcode += `\nG1 X${item.x.toFixed(2)} Y${(item.y + item.height).toFixed(2)}`;
        gcode += `\nG1 X${item.x.toFixed(2)} Y${item.y.toFixed(2)}`;
        gcode += "\nG0 Z5";
      });
    });

    gcode += "\n\nM05 (Spindle Off)";
    gcode += "\nM30 (End Program)";
    gcode += "\n%";
    return gcode;
  },

  generateProductionXml: (blueprint: BlueprintData): string => {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>';
    xml += '\n<SomaIdProductionOrder>';
    xml += `\n  <Info>`;
    xml += `\n    <LayoutType>${blueprint.layout}</LayoutType>`;
    xml += `\n    <MdfColor>${blueprint.materials.mdfColor}</MdfColor>`;
    xml += `\n    <InternalColor>${blueprint.materials.internalColor}</InternalColor>`;
    xml += `\n  </Info>`;
    xml += '\n  <Parts>';
    const modules = [...blueprint.mainWall.modules, ...(blueprint.sideWall?.modules || [])];
    modules.forEach(mod => {
      mod.cutList.forEach(part => {
        for(let i=0; i<part.quantity; i++) {
           xml += `\n    <Part>`;
           xml += `\n      <Name>${part.piece}</Name>`;
           xml += `\n      <Module>${mod.name}</Module>`;
           xml += `\n      <Width>${part.rawWidth}</Width>`;
           xml += `\n      <Length>${part.rawHeight}</Length>`;
           xml += `\n      <Material>${part.material}</Material>`;
           xml += `\n      <EdgeBand>${part.edgeBand}</EdgeBand>`;
           xml += `\n    </Part>`;
        }
      });
    });
    xml += '\n  </Parts>';
    xml += '\n</SomaIdProductionOrder>';
    return xml;
  }
};
