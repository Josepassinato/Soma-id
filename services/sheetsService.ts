
import { Project, BlueprintData, BlueprintModule } from "../types";
import { MaterialService } from "./materialService"; 
import { AppConfig } from '../config';

const generateBlueprintMarkdown = (data: BlueprintData): string => {
  let md = `BLUEPRINT FINAL – SOMA-ID INDUSTRIAL OS\n`;
  md += `Layout: ${data.layout}\n`;
  md += `Cor do MDF: ${data.materials.mdfColor}\n`;
  md += `Cor do Corpo: ${data.materials.internalColor}\n`;
  md += `Espessura: ${data.materials.thickness}mm\n\n`;

  md += `1️⃣ PLANTA BAIXA TÉCNICA\n`;
  md += `PAREDE PRINCIPAL – ${data.mainWall.totalWidth} mm\n`;
  data.mainWall.modules.forEach(m => {
    md += `|-- ${m.width}mm [${m.name}] --|\n`;
  });
  
  md += `\n4️⃣ CUT LIST\n`;
  data.mainWall.modules.forEach(m => {
    md += `🔸 ${m.name}\n`;
    m.cutList.forEach(item => {
      md += `${item.piece}\t${item.quantity}\t${item.measures}\n`;
    });
    md += `\n`;
  });

  return md;
};

export const syncProjectToSheets = async (project: Project): Promise<boolean> => {
  if (AppConfig.simulationMode || !AppConfig.googleAppsScriptUrl || AppConfig.googleAppsScriptUrl.includes('AQUI')) {
    console.log("🛠️ [SIMULATION] Sincronismo com Google Sheets simulado com sucesso.");
    return true;
  }

  const materialName = MaterialService.getById(project.materialId || '')?.name;
  const blueprintSummary = project.technicalData ? generateBlueprintMarkdown(project.technicalData) : undefined;

  const payload = {
    action: 'syncProject',
    id: project.id,
    clientName: project.clientName,
    wallWidth: project.wallWidth,
    materialName: materialName,
    status: project.status,
    blueprintSummary: blueprintSummary
  };

  try {
    const response = await fetch(AppConfig.googleAppsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return response.ok;
  } catch (error) {
    console.error("Erro ao sincronizar Sheets:", error);
    return false;
  }
};

export const saveTranscriptToDrive = async (transcript: string, clientName: string): Promise<string> => {
  if (AppConfig.simulationMode || !AppConfig.googleAppsScriptUrl || AppConfig.googleAppsScriptUrl.includes('AQUI')) {
    return `https://docs.google.com/document/d/simulated_drive_url_for_${clientName.replace(/\s+/g, '_')}`;
  }

  const payload = { action: 'saveTranscript', transcript, clientName };

  try {
    const response = await fetch(AppConfig.googleAppsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    return result.url;
  } catch (error) {
    return "Error generating transcript link";
  }
};
