
import React, { useState } from 'react';
import { CalculationEngine } from '../services/calcEngine';
import { NestingEngine } from '../services/nestingEngine';
import { LayoutValidator } from '../services/layoutValidator';
import { Project, AiLayoutPlan } from '../types';

export const FunctionalTestRunner: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [testStatus, setTestStatus] = useState<'IDLE' | 'RUNNING' | 'PASS' | 'FAIL'>('IDLE');

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const runTest = async () => {
    setLogs([]);
    setTestStatus('RUNNING');
    addLog('🚀 Iniciando Stress Test de Engenharia v2.5...');

    try {
      // --- TESTE 1: VALIDADOR DE LAYOUT ---
      addLog('🔹 Teste 1: Validador de Gap (Injeção de Filler)...');
      const wallW = 3500;
      // Fix: Added missing x, y, z coordinates to conform to AiLayoutPlan type
      const rawLayout: AiLayoutPlan = {
        layoutType: "Linear",
        mainWall: { modules: [{ moduleId: "base_porta_abrir", width: 800, x: 0, y: 0, z: 0, notes: [] }] },
        factoryNotes: []
      };
      
      const fixedLayout = LayoutValidator.validateAndFixLayout(rawLayout, wallW);
      const filler = fixedLayout.mainWall.modules.find(m => m.moduleId === 'filler_technical');
      
      if (filler && filler.width === (wallW - 800)) {
        addLog(`✅ Sucesso: Filler de ${filler.width}mm injetado.`);
      } else {
        throw new Error(`Falha no Filler: Esperado ${wallW - 800}mm.`);
      }

      // --- TESTE 2: CÁLCULO DE PEÇAS E FITA DE BORDA ---
      addLog('🔹 Teste 2: Precisão de Peças e Fita de Borda...');
      const mockProject = { clientName: "Teste QA", wallWidth: 3500, materialPalette: [{ name: 'Carvalho' }, { name: 'Branco' }] } as any;
      const blueprint = CalculationEngine.processLayout(fixedLayout, mockProject);
      const door = blueprint.mainWall.modules[0].cutList.find(p => p.piece === "Portas");
      
      if (door && door.rawWidth === 397 && door.edgeBand === "4L") {
        addLog(`✅ Matemática: Porta 397mm com fita 4 lados (OK).`);
      } else {
        throw new Error(`Falha Matemática: Porta inconsistente.`);
      }

      // --- TESTE 3: DRILLING (FURAÇÃO) ---
      addLog('🔹 Teste 3: Mapeamento de Furações CNC...');
      const hingeDrill = door?.drillingPoints?.find(d => d.type === 'hinge');
      if (hingeDrill && hingeDrill.diameter === 35) {
        addLog(`✅ CNC: Furação de dobradiça 35mm detectada.`);
      } else {
        throw new Error("Falha CNC: Furação não mapeada.");
      }

      setTestStatus('PASS');
      addLog('🎉 TODOS OS TESTES PASSARAM. ENGENHARIA INDUSTRIAL VALIDADA.');

    } catch (error) {
      addLog(`❌ ERRO: ${(error as Error).message}`);
      setTestStatus('FAIL');
    }
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="font-bold text-lg text-white">Engenharia Unit Tests</h4>
          <p className="text-xs text-gray-500 font-mono">Verificação Geométrica Determinística</p>
        </div>
        <button
          onClick={runTest}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase text-xs rounded transition"
        >
          Executar
        </button>
      </div>
      <div className="bg-black font-mono text-[10px] text-gray-400 p-4 h-48 overflow-y-auto border border-gray-800 rounded">
        {logs.map((log, i) => <p key={i} className="mb-1">{log}</p>)}
      </div>
    </div>
  );
};
