
import { BlueprintData, BlueprintModule, InterferenceConflict, BoundingBox } from "../types";

export const InterferenceEngine = {
  /**
   * Verifica sobreposição AABB simples.
   */
  checkOverlap: (a: BoundingBox, b: BoundingBox): boolean => {
    return (
      a.min.x < b.max.x && a.max.x > b.min.x &&
      a.min.y < b.max.y && a.max.y > b.min.y &&
      a.min.z < b.max.z && a.max.z > b.min.z
    );
  },

  /**
   * Simula o volume de abertura (Swing) de portas e gavetas.
   * Se um móvel está "encurralado", ele gera conflito.
   */
  checkSwingAccess: (mod: BlueprintModule, allModules: BlueprintModule[], constraints: any): InterferenceConflict[] => {
    const conflicts: InterferenceConflict[] = [];
    
    // Simulação simplificada: se for base ou upper com portas, assume-se abertura frontal.
    // Projeta um volume extra de 500mm à frente para circulação/abertura.
    const swingVolume: BoundingBox = {
      min: { x: mod.position.x, y: mod.position.y, z: mod.depth },
      max: { x: mod.position.x + mod.width, y: mod.position.y + mod.height, z: mod.depth + 500 }
    };

    // 1. Verificar se bate em paredes (se houver definição de profundidade de sala)
    if (constraints.roomDepth && swingVolume.max.z > constraints.roomDepth) {
        conflicts.push({
            moduleA: mod.name,
            type: 'ERGONOMIC_HAZARD',
            severity: 'WARNING',
            description: `Abertura limitada: O móvel '${mod.name}' está muito próximo da parede oposta.`
        });
    }

    return conflicts;
  },

  /**
   * Auditoria de Engenharia Completa.
   */
  auditLayout: (data: BlueprintData, constraints: { wallW: number; wallH: number; wallD: number; roomDepth?: number }): InterferenceConflict[] => {
    const conflicts: InterferenceConflict[] = [];
    const allModules = data.mainWall.modules;

    allModules.forEach(mod => {
      // 1. Limites do Vão Principal
      if (mod.boundingBox.max.y > constraints.wallH) {
        conflicts.push({
          moduleA: mod.name,
          type: 'BOUNDARY_VIOLATION',
          severity: 'CRITICAL',
          description: `EXTRAPOLAÇÃO: '${mod.name}' excede o pé-direito (${mod.boundingBox.max.y}mm).`
        });
      }

      if (mod.boundingBox.max.x > constraints.wallW + 2) { // 2mm de tolerância de float
        conflicts.push({
          moduleA: mod.name,
          type: 'BOUNDARY_VIOLATION',
          severity: 'CRITICAL',
          description: `EXTRAPOLAÇÃO: '${mod.name}' ultrapassa o limite lateral da parede.`
        });
      }

      // 2. Acessibilidade (Swing)
      const accessibilityErrors = InterferenceEngine.checkSwingAccess(mod, allModules, constraints);
      conflicts.push(...accessibilityErrors);
    });

    // 3. Colisões Mútuas
    for (let i = 0; i < allModules.length; i++) {
      for (let j = i + 1; j < allModules.length; j++) {
        if (InterferenceEngine.checkOverlap(allModules[i].boundingBox, allModules[j].boundingBox)) {
          conflicts.push({
            moduleA: allModules[i].name,
            moduleB: allModules[j].name,
            type: 'OVERLAP',
            severity: 'CRITICAL',
            description: `COLISÃO FÍSICA: ${allModules[i].name} e ${allModules[j].name} ocupam o mesmo espaço.`
          });
        }
      }
    }

    return conflicts;
  }
};
