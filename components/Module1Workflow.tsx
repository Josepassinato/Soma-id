
import React, { useState, useEffect } from 'react';
import { Project, QuoteItem } from '../types';
import { SalesService } from '../services/salesService';
import { PdfService } from '../services/pdfService';
import { DxfService } from '../services/dxfService';
import { EngineeringService } from '../services/engineeringService';
import { Blueprint2D } from './Blueprint2D';

interface Props {
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
}

export const Module1Workflow: React.FC<Props> = ({ project, onUpdate }) => {
  const [localQuote, setLocalQuote] = useState<QuoteItem[]>(project.quoteData?.items || []);
  const [showApprovalGate, setShowApprovalGate] = useState(false);
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');

  const confirmApproval = () => {
    const somaId = SalesService.generateSomaId(project);
    onUpdate({
      somaId,
      m1Status: 'PRE_APROVADO',
      approvalTimestamp: new Date().toISOString(),
      approvalNotes: approvalNotes || undefined,
    });
    setShowApprovalGate(false);
    setApprovalConfirmed(false);
    setApprovalNotes('');
  };

  const nextStep = () => {
    if (project.m1Status === 'ENCANTAMENTO') {
      setShowApprovalGate(true);
      return;
    } else if (project.m1Status === 'PRE_APROVADO') {
      onUpdate({ 
        technicalBriefingText: project.insightsIA?.technicalBriefing || "Initial engineering briefing generated based on visual constraints...",
        m1Status: 'BRIEFING_GERADO' 
      });
    } else if (project.m1Status === 'BRIEFING_GERADO') {
      const quote = SalesService.calculateDefaultQuote(project);
      setLocalQuote(quote.items);
      onUpdate({ quoteData: quote, m1Status: 'ORCAMENTO_EDICAO' });
    } else if (project.m1Status === 'ORCAMENTO_EDICAO') {
      onUpdate({ m1Status: 'CONTRATO_ASSINATURA' });
    } else if (project.m1Status === 'CONTRATO_ASSINATURA') {
      onUpdate({ contractSigned: true, contractDate: new Date().toISOString(), m1Status: 'CONCLUIDO' });
    }
  };

  const handleUpdateItem = (index: number, field: keyof QuoteItem, value: any) => {
    const newItems = [...localQuote];
    newItems[index] = { ...newItems[index], [field]: field === 'value' ? parseFloat(value) : value };
    setLocalQuote(newItems);
    
    const subtotal = newItems.reduce((acc, item) => acc + item.value, 0);
    const tax = subtotal * 0.07;
    onUpdate({ quoteData: { items: newItems, tax, total: subtotal + tax } });
  };

  const handleAddItem = () => {
    const newItems = [...localQuote, { description: "New Item", value: 0 }];
    setLocalQuote(newItems);
  };

  const handleDownloadQuote = () => PdfService.generateQuotePDF(project);
  const handleDownloadContract = () => PdfService.generateContractPDF(project);

  const handleExportDxf = async () => {
    if (!project.technicalData) return;
    try {
      const nesting = await EngineeringService.processNesting(project.technicalData);
      const dxf = new DxfService();
      const dxfContent = dxf.generateNestingDxf(nesting);
      const blob = new Blob([dxfContent], { type: 'application/dxf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.somaId || 'SOMA-ID'}_NESTING.dxf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('DXF export error:', err);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Stepper Superior */}
      <div className="flex justify-between items-center bg-[#020617] p-8 rounded-[2rem] border border-slate-800 shadow-2xl">
        {['Impacto', 'Aprovação', 'Briefing', 'Orçamento', 'Contrato'].map((step, i) => {
          const statuses: any[] = ['ENCANTAMENTO', 'PRE_APROVADO', 'BRIEFING_GERADO', 'ORCAMENTO_EDICAO', 'CONTRATO_ASSINATURA', 'CONCLUIDO'];
          const activeIdx = statuses.indexOf(project.m1Status);
          const isDone = activeIdx > i;
          const isCurrent = activeIdx === i;
          
          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className={`flex flex-col items-center gap-3 ${isCurrent ? 'scale-110 transition-transform' : ''}`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-[11px] font-black border-2 transition-all rotate-3 group-hover:rotate-0 ${
                  isDone ? 'bg-green-500 border-green-500 text-black' : 
                  isCurrent ? 'border-cyan-400 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)]' : 
                  'border-slate-800 text-slate-700'
                }`}>
                  {isDone ? '✓' : i + 1}
                </div>
                <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isCurrent ? 'text-white' : 'text-slate-700'}`}>{step}</span>
              </div>
              {i < 4 && <div className={`h-[1px] flex-grow mx-6 ${isDone ? 'bg-green-500/30' : 'bg-slate-800'}`}></div>}
            </div>
          );
        })}
      </div>

      <div className="bg-[#0F172A] border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl min-h-[600px] flex flex-col relative">
        
        {/* FASE 1: ENCANTAMENTO */}
        {project.m1Status === 'ENCANTAMENTO' && (
          <div className="flex-grow flex flex-col items-center justify-center p-12 text-center animate-fade-in">
            <h2 className="text-5xl font-black text-white mb-2 uppercase tracking-tighter">Primeiro Impacto</h2>
            <p className="text-slate-500 font-mono text-xs mb-12 tracking-widest uppercase">Gêmeo Digital & Conceito Estrutural</p>
            
            <div className="grid lg:grid-cols-5 gap-10 w-full max-w-6xl">
              <div className="lg:col-span-3 aspect-video bg-slate-950 rounded-[2rem] overflow-hidden border border-slate-800 group shadow-2xl relative">
                {project.generatedImageUrl ? (
                    <img src={project.generatedImageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[4000ms]" alt="Render" />
                ) : <div className="h-full flex items-center justify-center text-slate-800 font-black">PROJETANDO CONCEITO...</div>}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent"></div>
              </div>
              <div className="lg:col-span-2 bg-slate-950/40 p-10 rounded-[2rem] border border-cyan-900/20 flex flex-col shadow-inner">
                <p className="text-cyan-400 font-mono text-[10px] uppercase mb-8 tracking-widest text-left flex items-center gap-2">
                    <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></span> Planta Baixa de Venda
                </p>
                <div className="flex-grow flex items-center justify-center">
                   <Blueprint2D data={project.technicalData} wallWidth={project.wallWidth} wallHeight={project.wallHeight || 2700} />
                </div>
              </div>
            </div>
            
            <button onClick={nextStep} className="mt-14 px-20 py-6 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-[0.3em] text-sm rounded-2xl shadow-[0_25px_50px_rgba(6,182,212,0.4)] transition-all active:scale-95">
              Aprovar Conceito →
            </button>

            {/* Approval Gate Modal */}
            {showApprovalGate && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6" onClick={() => setShowApprovalGate(false)}>
                <div className="bg-[#0F172A] border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Confirmar Aprovação do Cliente</h3>
                  <p className="text-slate-400 text-sm mb-6">O cliente visualizou e aprovou este conceito visual?</p>

                  <label className="flex items-center gap-3 mb-6 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={approvalConfirmed}
                      onChange={e => setApprovalConfirmed(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                    />
                    <span className="text-white text-sm font-bold group-hover:text-cyan-400 transition">Cliente aprovou presencialmente</span>
                  </label>

                  <div className="mb-6">
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1 block">Observações (opcional)</label>
                    <textarea
                      value={approvalNotes}
                      onChange={e => setApprovalNotes(e.target.value)}
                      placeholder="Ex: cliente pediu para escurecer um tom..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm outline-none focus:border-cyan-500 resize-none h-20"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={confirmApproval}
                      disabled={!approvalConfirmed}
                      className={`flex-1 py-3 font-black uppercase text-xs tracking-widest rounded-xl transition-all ${
                        approvalConfirmed
                          ? 'bg-green-600 hover:bg-green-500 text-white shadow-[0_10px_25px_rgba(22,163,74,0.3)]'
                          : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      Confirmar Aprovação
                    </button>
                    <button
                      onClick={() => setShowApprovalGate(false)}
                      className="px-6 py-3 text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* FASE 2: SOMA-ID & BRIEFING */}
        {(project.m1Status === 'PRE_APROVADO' || project.m1Status === 'BRIEFING_GERADO') && (
          <div className="flex-grow p-12 flex flex-col items-center justify-center animate-fade-in max-w-4xl mx-auto w-full">
             <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-[2rem] flex items-center justify-center mb-8 text-4xl border border-green-500/20 rotate-12">✓</div>
             {(project as any).approvalTimestamp && (
               <div className="mb-4 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full flex items-center gap-2">
                 <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                 <span className="text-green-400 text-[10px] font-bold uppercase tracking-widest">
                   Aprovado pelo cliente — {new Date((project as any).approvalTimestamp).toLocaleString('pt-BR')}
                 </span>
               </div>
             )}
             <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">Identidade do Projeto</h2>
             <div className="bg-slate-950 border border-cyan-500/30 px-12 py-6 rounded-3xl mb-12 shadow-[0_0_40px_rgba(6,182,212,0.15)] text-center">
                <p className="text-[11px] text-slate-500 font-mono uppercase tracking-[0.3em] mb-2">Protocolo Soma-ID</p>
                <p className="text-cyan-400 font-mono text-4xl font-black">{project.somaId}</p>
             </div>

             {project.m1Status === 'BRIEFING_GERADO' ? (
                <div className="w-full space-y-8 animate-slide-up">
                   <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] text-center">Resumo de Requisitos Técnicos</h3>
                   <div className="bg-[#020617] p-12 rounded-[2.5rem] border border-slate-800 font-mono text-sm leading-relaxed text-slate-400 shadow-inner">
                      {project.technicalBriefingText}
                   </div>
                   <div className="flex justify-center">
                      <button onClick={nextStep} className="px-14 py-6 bg-white text-black font-black uppercase text-xs rounded-2xl shadow-2xl hover:bg-cyan-400 transition-all transform hover:-translate-y-1">
                        Avançar para Orçamento Final
                      </button>
                   </div>
                </div>
             ) : (
                <button onClick={nextStep} className="px-14 py-6 border border-cyan-500/40 text-cyan-400 font-black uppercase text-xs rounded-2xl hover:bg-cyan-500/5 transition-all">
                   Gerar Dossiê do Projeto
                </button>
             )}
          </div>
        )}

        {/* FASE 3: ORÇAMENTO EDITÁVEL */}
        {project.m1Status === 'ORCAMENTO_EDICAO' && (
          <div className="flex-grow p-12 animate-fade-in max-w-5xl mx-auto w-full">
            <div className="flex justify-between items-end mb-12 px-4">
               <div>
                  <h2 className="text-5xl font-black text-white uppercase tracking-tighter">Proposta Comercial</h2>
                  <p className="text-slate-500 font-mono text-xs uppercase tracking-widest mt-1">Configuração de Valores e Itens</p>
               </div>
               <div className="text-right flex flex-col items-end gap-2">
                  <p className="text-2xl font-black text-white">{project.somaId}</p>
                  <button onClick={handleDownloadQuote} className="text-[10px] font-black text-cyan-400 border border-cyan-400/30 px-3 py-1 rounded hover:bg-cyan-400/10">
                    BAIXAR PDF (PROPOSTA)
                  </button>
               </div>
            </div>

            <div className="bg-white text-black p-14 rounded-[3rem] shadow-2xl font-sans relative">
               <div className="absolute top-8 right-8 text-slate-200 text-7xl font-black italic opacity-10 select-none">OFFICIAL</div>
               
               <div className="flex justify-between items-start mb-14">
                  <div className="text-4xl font-black italic tracking-tighter">MARCENARIA AI</div>
                  <div className="text-right">
                    <p className="font-black text-[10px] uppercase text-slate-400 tracking-widest mb-1">Destinatário:</p>
                    <p className="text-xl font-bold">{project.clientName}</p>
                  </div>
               </div>

               <div className="space-y-6 mb-14">
                  {localQuote.map((item, i) => (
                    <div key={i} className="flex gap-6 items-center border-b border-slate-100 pb-4 group">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-400">{i+1}</div>
                      <input 
                        type="text" 
                        value={item.description}
                        onChange={(e) => handleUpdateItem(i, 'description', e.target.value)}
                        className="flex-grow bg-transparent font-bold text-slate-800 placeholder-slate-300 outline-none"
                      />
                      <div className="flex items-center gap-2">
                         <span className="text-sm font-black text-slate-400">$</span>
                         <input 
                           type="number" 
                           value={item.value}
                           onChange={(e) => handleUpdateItem(i, 'value', e.target.value)}
                           className="w-32 bg-slate-50 font-black text-right p-3 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500/20"
                         />
                      </div>
                    </div>
                  ))}
                  <button onClick={handleAddItem} className="text-[11px] font-black text-cyan-600 uppercase mt-6 hover:text-cyan-500 transition-colors flex items-center gap-2">
                    <span className="text-lg">+</span> Adicionar Item Personalizado
                  </button>
               </div>

               <div className="pt-8 flex flex-col items-end gap-3">
                  <div className="flex justify-between w-64 text-sm text-slate-500">
                    <span className="font-bold uppercase tracking-widest">Taxa de Venda (FL 7%)</span>
                    <span className="font-black">${project.quoteData?.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between w-64 py-4 px-6 bg-slate-950 text-white rounded-2xl mt-2">
                    <span className="font-black uppercase tracking-widest text-xs">Valor Total</span>
                    <span className="text-2xl font-black">${project.quoteData?.total.toFixed(2)}</span>
                  </div>
               </div>
            </div>

            <div className="mt-14 flex justify-center">
               <button onClick={nextStep} className="px-20 py-6 bg-cyan-500 text-black font-black uppercase text-sm rounded-2xl shadow-[0_20px_40px_rgba(6,182,212,0.3)] hover:scale-105 transition-all">
                  Confirmar e Gerar Contrato Jurídico
               </button>
            </div>
          </div>
        )}

        {/* FASE 4: CONTRATO & ASSINATURA */}
        {project.m1Status === 'CONTRATO_ASSINATURA' && (
          <div className="flex-grow p-12 animate-fade-in max-w-4xl mx-auto w-full">
             <div className="flex justify-between items-center mb-10 px-4">
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Instrumento de Contrato</h2>
                <button onClick={handleDownloadContract} className="text-[10px] font-black text-cyan-400 border border-cyan-400/30 px-4 py-2 rounded hover:bg-cyan-400/10">
                   BAIXAR CONTRATO
                </button>
             </div>
             <div className="bg-slate-50 text-slate-900 p-16 h-[500px] overflow-y-auto rounded-[3rem] font-serif text-sm leading-relaxed border-[12px] border-double border-slate-200 shadow-inner relative">
                <div className="max-w-2xl mx-auto">
                    <pre className="whitespace-pre-wrap font-serif">
                       {SalesService.getFloridaContractTemplate(project)}
                    </pre>
                </div>
             </div>
             <div className="mt-14 flex flex-col items-center gap-8">
                <button onClick={nextStep} className="px-24 py-7 bg-green-600 text-white font-black uppercase tracking-[0.3em] text-sm rounded-2xl shadow-[0_30px_60px_rgba(22,163,74,0.4)] hover:bg-green-500 transition-all active:scale-95">
                   Assinar e Finalizar Venda
                </button>
                <div className="flex items-center gap-3 opacity-50">
                   <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                   <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Criptografia Ativa (Blockchain Validated)</p>
                </div>
             </div>
          </div>
        )}

        {/* FASE 5: CONCLUÍDO (Handover) */}
        {project.m1Status === 'CONCLUIDO' && (
          <div className="flex-grow flex flex-col items-center justify-center p-20 text-center animate-fade-in">
             <div className="text-9xl mb-10 animate-bounce">🚀</div>
             <h2 className="text-5xl font-black text-white mb-4 uppercase tracking-tighter">Ciclo Comercial Concluído</h2>
             <p className="text-slate-500 font-medium text-lg max-w-xl mx-auto mb-14 leading-relaxed">
               Contrato assinado e orçamento aprovado. O projeto agora é movido para o pipeline de <span className="text-purple-400 font-bold">Produção (Módulo 2)</span> para detalhamento de fábrica.
             </p>
             <div className="flex gap-6 flex-wrap justify-center">
                <button onClick={async () => {
                    await PdfService.generateQuotePDF(project);
                    await PdfService.generateContractPDF(project);
                }} className="px-10 py-5 bg-white/5 border border-white/10 text-white font-bold uppercase text-[11px] tracking-widest rounded-2xl hover:bg-white/10 transition">Gerar PDF do Dossier</button>
                {project.technicalData && (
                  <button onClick={handleExportDxf} className="px-10 py-5 bg-purple-600/20 border border-purple-500/30 text-purple-300 font-bold uppercase text-[11px] tracking-widest rounded-2xl hover:bg-purple-600/30 transition flex items-center gap-2">
                    Exportar DXF
                  </button>
                )}
                <button onClick={() => window.location.reload()} className="px-10 py-5 bg-cyan-500 text-black font-black uppercase text-[11px] tracking-widest rounded-2xl hover:bg-cyan-400 transition shadow-2xl">Novo Atendimento</button>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};
