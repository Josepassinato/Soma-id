
import React from 'react';
import { BlueprintData } from '../types';

interface Props {
  data: BlueprintData | null;
  wallWidth: number;
  wallHeight?: number;
}

export const Blueprint2D: React.FC<Props> = ({ data, wallWidth, wallHeight: wallHeightProp }) => {
  const padding = 60;
  const svgWidth = 800;
  const scale = (svgWidth - padding * 2) / wallWidth;
  const heightScale = scale;
  const wallHeight = wallHeightProp || 2700;
  const svgHeight = (wallHeight * heightScale) + padding * 2;

  if (!data) {
    return (
      <div className="bg-[#0F172A] rounded-xl border border-blue-500/30 overflow-hidden shadow-2xl relative group">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
          <rect x={padding} y={padding} width={wallWidth * scale} height={wallHeight * heightScale} fill="#1E293B" fillOpacity="0.15" stroke="#334155" strokeWidth="1" strokeDasharray="8" />
          <text x={svgWidth / 2} y={svgHeight / 2 - 15} fill="#475569" fontSize="14" fontFamily="JetBrains Mono" textAnchor="middle" fontWeight="bold">
            {wallWidth}mm x {wallHeight}mm
          </text>
          <text x={svgWidth / 2} y={svgHeight / 2 + 10} fill="#334155" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
            Planta sendo gerada...
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div className="bg-[#0F172A] rounded-xl border border-blue-500/30 overflow-hidden shadow-2xl relative group">
      <div className="absolute top-4 left-4 z-10">
        <span className="text-[10px] font-mono text-blue-400 bg-blue-950/50 px-2 py-1 rounded border border-blue-500/20 uppercase tracking-widest">
          Technical Elevation View • Scale 1:20
        </span>
      </div>
      
      <svg 
        viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
        className="w-full h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Wall Background */}
        <rect x={padding} y={padding} width={wallWidth * scale} height={wallHeight * heightScale} fill="#1E293B" fillOpacity="0.3" stroke="#334155" strokeWidth="1" />
        
        {/* Grid Lines */}
        <defs>
          <pattern id="grid" width={100 * scale} height={100 * heightScale} patternUnits="userSpaceOnUse">
            <path d={`M ${100 * scale} 0 L 0 0 0 ${100 * heightScale}`} fill="none" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.5" />
          </pattern>
        </defs>
        <rect x={padding} y={padding} width={wallWidth * scale} height={wallHeight * heightScale} fill="url(#grid)" />

        {/* Modules Rendering */}
        {data.mainWall.modules.map((mod, i) => {
          const modX = padding + (mod.position.x * scale);
          const modY = padding + (wallHeight - mod.height - mod.position.y) * heightScale;
          const modW = mod.width * scale;
          const modH = mod.height * heightScale;

          return (
            <g key={mod.id} className="hover:opacity-80 transition-opacity cursor-crosshair">
              {/* Module Box */}
              <rect 
                x={modX} 
                y={modY} 
                width={modW} 
                height={modH} 
                fill={mod.type === 'base' ? '#3B82F6' : '#8B5CF6'} 
                fillOpacity="0.2"
                stroke={mod.type === 'base' ? '#60A5FA' : '#A78BFA'} 
                strokeWidth="2"
              />
              
              {/* Internal details based on type */}
              {mod.type === 'base' && (
                <line x1={modX} y1={modY + (modH * 0.2)} x2={modX + modW} y2={modY + (modH * 0.2)} stroke="#60A5FA" strokeWidth="1" strokeDasharray="4" />
              )}

              {/* Dimension Text (Width) */}
              <text 
                x={modX + modW/2} 
                y={modY + modH + 20} 
                fill="#94A3B8" 
                fontSize="10" 
                fontFamily="JetBrains Mono" 
                textAnchor="middle"
              >
                {mod.width}mm
              </text>

              {/* Module Name Label */}
              <text 
                x={modX + 5} 
                y={modY + 15} 
                fill="white" 
                fontSize="8" 
                fontFamily="Inter" 
                fontWeight="bold"
                className="pointer-events-none"
              >
                {mod.moduleId.split('_')[0].toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* Total Width Dimension Line */}
        <line x1={padding} y1={svgHeight - 15} x2={padding + (wallWidth * scale)} y2={svgHeight - 15} stroke="#3B82F6" strokeWidth="1" />
        <circle cx={padding} cy={svgHeight - 15} r="2" fill="#3B82F6" />
        <circle cx={padding + (wallWidth * scale)} cy={svgHeight - 15} r="2" fill="#3B82F6" />
        <text 
          x={padding + (wallWidth * scale) / 2} 
          y={svgHeight - 25} 
          fill="#3B82F6" 
          fontSize="12" 
          fontWeight="bold" 
          fontFamily="JetBrains Mono" 
          textAnchor="middle"
        >
          TOTAL: {wallWidth}mm
        </text>
      </svg>
    </div>
  );
};
