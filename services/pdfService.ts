
import { jsPDF } from 'jspdf';
import { Project } from '../types';
import { SalesService } from './salesService';

export const PdfService = {
  generateQuotePDF: async (project: Project) => {
    const doc = new jsPDF();
    const margin = 20;
    let y = 30;

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("SOMA-ID PRO", margin, y);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Industrial Furniture Operating System", margin, y + 6);
    
    doc.setDrawColor(200);
    doc.line(margin, y + 15, 190, y + 15);
    y += 30;

    // Client Info
    doc.setFont("helvetica", "bold");
    doc.text("PROPOSTA COMERCIAL", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(`ID: ${project.somaId}`, 190, y, { align: "right" });
    y += 15;

    doc.setFontSize(10);
    doc.text(`Cliente: ${project.clientName}`, margin, y);
    doc.text(`Ambiente: ${project.roomType}`, margin, y + 6);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, margin, y + 12);
    y += 25;

    // Items Header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 5, 170, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Descrição do Item", margin + 2, y);
    doc.text("Valor", 188, y, { align: "right" });
    y += 10;

    // Items Loop
    doc.setFont("helvetica", "normal");
    project.quoteData?.items.forEach((item, i) => {
      doc.text(item.description, margin + 2, y);
      doc.text(`$ ${item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 188, y, { align: "right" });
      y += 8;
    });

    y += 10;
    doc.line(margin, y, 190, y);
    y += 10;

    // Totals
    doc.setFont("helvetica", "bold");
    doc.text("SUBTOTAL:", 140, y);
    doc.text(`$ ${(project.quoteData?.total! - project.quoteData?.tax!).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 188, y, { align: "right" });
    y += 7;
    doc.text("TAX (FL 7%):", 140, y);
    doc.text(`$ ${project.quoteData?.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 188, y, { align: "right" });
    y += 10;
    doc.setFontSize(14);
    doc.text("TOTAL FINAL:", 140, y);
    doc.text(`$ ${project.quoteData?.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 188, y, { align: "right" });

    // Footer
    y = 280;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("Esta proposta tem validade de 10 dias. Gerado por SOMA-ID PRO.", 105, y, { align: "center" });

    doc.save(`${project.somaId}_PROPOSTA.pdf`);
  },

  generateContractPDF: async (project: Project) => {
    const doc = new jsPDF();
    const margin = 20;
    const contractText = SalesService.getFloridaContractTemplate(project);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("CONTRATO DE PRESTAÇÃO DE SERVIÇOS", 105, 30, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    const splitText = doc.splitTextToSize(contractText, 170);
    doc.text(splitText, margin, 50);

    // Signatures Area
    const y = 250;
    doc.line(margin, y, 90, y);
    doc.text("Contratante", 55, y + 5, { align: "center" });
    
    doc.line(120, y, 190, y);
    doc.text("SOMA-ID Authorized Signature", 155, y + 5, { align: "center" });

    doc.save(`${project.somaId}_CONTRATO.pdf`);
  }
};
