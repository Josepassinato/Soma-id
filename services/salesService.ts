
import { Project, QuoteItem } from '../types';

export const SalesService = {
  generateSomaId: (project: Project): string => {
    const initials = project.clientName.split(' ').map(n => n[0]).join('').toUpperCase();
    const date = new Date().toISOString().slice(2, 10).replace(/-/g, '').toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `SOMA-${initials}-${date}-${random}`;
  },

  calculateDefaultQuote: (project: Project): { items: QuoteItem[], tax: number, total: number } => {
    const items: QuoteItem[] = [];
    
    // Constantes de Preço (Base Industrial SOMA-ID)
    const MDF_M2_PRICE = 185;       // MDF 18mm Médio
    const MDF_6MM_M2_PRICE = 98;    // MDF 6mm Fundo
    const EDGE_BAND_M_PRICE = 5.50; // Metro linear de fita colada
    const MARKUP = 1.65;            // Markup de 65% para cobrir impostos, marketing e lucro

    let totalMdfArea = 0;
    let totalMdf6mmArea = 0;
    let totalEdgeBand = 0;
    let hardwareCost = 0;

    // 1. Cálculo Baseado em Engenharia (Custo Real)
    if (project.technicalData) {
      project.technicalData.mainWall.modules.forEach(mod => {
        mod.cutList.forEach(part => {
          const areaM2 = (part.rawWidth * part.rawHeight) / 1000000;
          if (part.piece.toLowerCase().includes('fundo')) {
            totalMdf6mmArea += areaM2;
          } else {
            totalMdfArea += areaM2;
          }
          
          // Estimativa de fita de borda baseada na configuração 1L, 4L etc
          const perimeterM = ((part.rawWidth + part.rawHeight) * 2) / 1000;
          if (part.edgeBand === '4L') totalEdgeBand += perimeterM;
          else if (part.edgeBand.includes('1L')) totalEdgeBand += part.rawHeight / 1000;
        });

        // Ferragens
        mod.cutList.forEach(part => {
           if (part.drillingPoints) {
              part.drillingPoints.forEach(p => {
                if (p.type === 'hinge') hardwareCost += 18; // Dobradiça + amortecedor
                if (p.type === 'slider') hardwareCost += 45; // Par de corrediça
              });
           }
        });
      });

      items.push({ description: `MDF Estrutural (${totalMdfArea.toFixed(2)}m²)`, value: totalMdfArea * MDF_M2_PRICE });
      if (totalMdf6mmArea > 0) items.push({ description: `Fundo MDF 6mm (${totalMdf6mmArea.toFixed(2)}m²)`, value: totalMdf6mmArea * MDF_6MM_M2_PRICE });
      items.push({ description: `Fita de Borda & Acabamento (${totalEdgeBand.toFixed(0)}m)`, value: totalEdgeBand * EDGE_BAND_M_PRICE });
      items.push({ description: "Componentes & Ferragens Técnicas", value: hardwareCost });

    } else {
      // 2. Fallback por Metro Linear (Estimativa Pré-Engenharia)
      const widthInMeters = project.wallWidth / 1000;
      const meterPrice = 2800; // Valor médio de venda por metro linear
      items.push({ description: `Estimativa de Projeto (${project.roomType})`, value: widthInMeters * meterPrice });
    }
    
    // 3. Auditoria de Montagem e Mão de Obra
    const isSuspended = project.installationType === 'SUSPENSO';
    const laborBase = 800;
    const complexityFactor = project.roomType.toLowerCase().includes('cozinha') ? 1.4 : 1.0;
    const installationFee = (laborBase * complexityFactor) + (isSuspended ? 400 : 0);
    
    items.push({ 
      description: `Mão de Obra de Instalação Profissional ${isSuspended ? '(Sistema Suspenso)' : '(Base Piso)'}`, 
      value: installationFee 
    });

    // 4. Fechamento de Orçamento
    const subtotal = items.reduce((acc, item) => acc + item.value, 0);
    const finalTotal = project.technicalData ? (subtotal * MARKUP) : subtotal; 
    const tax = finalTotal * 0.07;
    
    return {
      items,
      tax,
      total: finalTotal + tax
    };
  },

  getFloridaContractTemplate: (project: Project) => {
    return `
      SOMA-ID CONSTRUCTION & INSTALLATION AGREEMENT
      STATE OF FLORIDA | COUNTY OF MIAMI-DADE

      PROJECT IDENTIFIER (SOMA-ID): ${project.somaId}
      EFFECTIVE DATE: ${new Date().toLocaleDateString('en-US')}
      
      BETWEEN: SOMA-ID Industrial Solutions ("Contractor")
      AND: ${project.clientName} ("Owner")

      1. SCOPE OF WORK: Contractor shall provide materials and labor for the installation of custom cabinetry as per the SOMA-ID visual rendering ID ${project.id}.
      Installation Type specified: ${project.installationType}.

      2. PAYMENT TERMS: The total contract price is $${project.quoteData?.total.toFixed(2)}. 
         A deposit of 50% is required upon signing.

      3. FLORIDA CONSTRUCTION LIEN LAW NOTICE: 
         ACCORDING TO FLORIDA'S CONSTRUCTION LIEN LAW (SECTIONS 713.001-713.37, FLORIDA STATUTES), THOSE WHO WORK ON YOUR PROPERTY OR PROVIDE MATERIALS AND ARE NOT PAID HAVE A RIGHT TO ENFORCE THEIR CLAIM FOR PAYMENT AGAINST YOUR PROPERTY. THIS CLAIM IS KNOWN AS A CONSTRUCTION LIEN.

      4. WARRANTIES: Contractor warrants the cabinetry against defects in workmanship for a period of one (1) year from completion.

      5. GOVERNING LAW: This contract shall be governed by the laws of the State of Florida.

      OWNER SIGNATURE: __________________________
      SOMA-ID SIGNATURE: ______________________
    `;
  }
};
