
export type Language = 'pt' | 'en' | 'es';

export type Module1Status = 'ENCANTAMENTO' | 'PRE_APROVADO' | 'BRIEFING_GERADO' | 'ORCAMENTO_EDICAO' | 'CONTRATO_ASSINATURA' | 'CONCLUIDO';

export type InstallationType = 'PISO' | 'SUSPENSO';

export interface QuoteItem {
  description: string;
  value: number;
}

export type GrainDirection = 'vertical' | 'horizontal' | 'none';

export interface DrillingPoint {
  x: number;
  y: number;
  diameter: number;
  depth: number;
  type: string;
}

export interface DrillingRule {
  type: string;
  xFormula: string;
  yFormula: string;
  diameter: number;
  depth: number;
}

export interface ComponentDefinition {
  name: string;
  widthFormula: string;
  heightFormula: string;
  quantity: number;
  materialInfo: 'frente' | 'corpo';
  edgeBand: string;
  grainDirection: GrainDirection;
  drillingRules?: DrillingRule[];
}

export interface StandardModuleDefinition {
  id: string;
  name: string;
  category: string;
  defaultDepth: number;
  defaultHeight: number;
  minWidth: number;
  maxWidth: number;
  hardware: string[];
  components: ComponentDefinition[];
}

export interface CutListItem {
  piece: string;
  quantity: number;
  measures: string;
  material: string;
  edgeBand: string;
  grainDirection: GrainDirection;
  rawWidth: number;
  rawHeight: number;
  drillingPoints?: DrillingPoint[];
}

export interface BoundingBox {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface BlueprintModule {
  id: string;
  moduleId: string;
  name: string;
  type: string;
  width: number;
  height: number;
  depth: number;
  position: { x: number; y: number; z: number };
  boundingBox: BoundingBox;
  notes: string[];
  cutList: CutListItem[];
}

export interface InterferenceConflict {
  moduleA: string;
  moduleB?: string;
  type: 'OVERLAP' | 'BOUNDARY_VIOLATION' | 'ERGONOMIC_HAZARD';
  severity: 'CRITICAL' | 'WARNING';
  description: string;
}

export interface BlueprintData {
  layout: string;
  materials: { mdfColor: string; internalColor: string; thickness: number };
  mainWall: { totalWidth: number; modules: BlueprintModule[] };
  sideWall?: { totalWidth: number; modules: BlueprintModule[] };
  hardwareMap: string[];
  factoryNotes: string[];
  conflicts?: InterferenceConflict[];
}

export interface RenderItem {
  id: string;
  name: string;
  url: string;
  promptUsed: string;
  createdAt: string;
}

export interface Project {
  id: string;
  somaId?: string;
  sellerId?: string;
  version: number;
  parentId?: string;
  clientName: string;
  roomType: string;
  createdAt: string;
  m1Status: Module1Status;
  status: 'RASCUNHO' | 'PROCESSANDO' | 'RENDERizando' | 'APROVACAO_VISUAL' | 'PRONTO' | 'ERRO';
  installationType: InstallationType;
  
  quoteData?: {
    items: QuoteItem[];
    tax: number;
    total: number;
    authorizedBy?: string;
  };
  contractSigned?: boolean;
  contractDate?: string;
  technicalBriefingText?: string;

  wallWidth: number;
  wallHeight?: number;
  wallDepth?: number;
  materialPalette?: Material[];
  materialId?: string;
  generatedImageUrl?: string;
  visualPrompt?: string;
  transcriptUrl?: string;
  roomPhotoData?: string;
  materialPhotoData?: string;
  transcricao?: string;
  roomWidth?: number;
  roomDepth?: number;
  renders?: RenderItem[];
  technicalData?: BlueprintData;
  nestingData?: NestingResult;
  insightsIA?: ExtractedInsights;
  styleDescription: string;
  isSynced?: boolean;
  errorMessage?: string;
}

export interface Material {
  id: string;
  name: string;
  category: string;
  texture: string;
  color: string;
  imageUrl: string;
}

export interface PlacedItem {
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
  partName: string;
  moduleName: string;
  grainDirection: GrainDirection;
  drillingPoints?: DrillingPoint[];
}

export interface Sheet {
  id: number;
  width: number;
  height: number;
  material: string;
  items: PlacedItem[];
  waste: number;
}

export interface NestingResult {
  sheets: Sheet[];
  totalSheets: number;
  totalParts: number;
  globalEfficiency: number;
  totalLinearEdgeBand: number;
  estimatedMachineTime: number;
}

export interface ExtractedInsights {
  clientName: string;
  roomType?: string;
  wallWidth?: number;
  wallHeight?: number;
  wallDepth?: number;
  styleDescription: string;
  technicalBriefing: string;
  specificFurniture?: string;
  suggestedMaterials?: string[];
  missingInfo?: string[];
  analysisStatus: 'COMPLETO' | 'INCOMPLETO';
  deliveryDateStatus?: string;
  installationType?: InstallationType;
  roomPhotoData?: string;
}

export interface ConsultationInput {
  type: 'TEXT' | 'AUDIO' | 'PDF' | 'IMAGE';
  content: string;
  mimeType?: string;
  userDescription?: string;
}

export interface AiLayoutPlan {
  layoutType: string;
  mainWall: {
    modules: {
      moduleId: string;
      width: number;
      x: number; // Coordenada X relativa (Início do módulo)
      y: number; // Coordenada Y relativa (Altura do chão)
      z: number; // Coordenada Z relativa (Recuo da parede)
      notes: string[];
    }[];
  };
  factoryNotes: string[];
}

export interface HealthReport {
  lastRun: string;
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  failedModules: string[];
  logs: { timestamp: string; message: string; type: 'info' | 'success' | 'error' }[];
}

export interface UserProfile {
  id: string;
  email: string;
  shopName?: string;
  sellerId?: string;
  subscription_tier: 'FREE' | 'PRO' | 'ENTERPRISE';
  tokens_balance: number;
  module_access?: ModuleAccess;
  biometric_id?: string;
}

export type AppModule = 'SHOWROOM' | 'ENGINEERING' | 'INDUSTRIAL' | 'SALES';

export interface ModuleAccess {
  showroom: boolean;
  engineering: boolean;
  sales: boolean;
  industrial: boolean;
}

export interface EdgeBand { front: 0|1; left: 0|1; right: 0|1; back: 0|1; }

export type DrillHFace = "L" | "R" | "T" | "B";

export interface DrillH {
  face: DrillHFace;
  x: number; // Posição X do centro do furo (na superfície da peça)
  y: number; // Posição Y do centro do furo (na superfície da peça)
  diameter: number;
  depthMm: number;
  zFromFaceMm?: number; // Offset da "altura" a partir da face, opcional
}

export interface PartDxfInput {
  projectId: string;
  moduleId: string;
  partId: string;
  width: number;   // mm
  height: number;  // mm
  thicknessMm: number;
  material: string;
  edgeBand?: EdgeBand;
  drillingPoints?: Array<{ x: number; y: number; diameter: number }>;
  drillHoles?: DrillH[];
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}
