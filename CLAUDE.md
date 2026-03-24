# Project: SOMA ID

## Overview
Industrial carpentry SaaS platform. AI-powered system for calculating, optimizing, and managing production of custom furniture (glass, aluminum profiles, hardware, fabrics). Partnership: Jose (developer/CTO, 30% equity) + Ricardo Leoncini (investor/CEO, 70% equity). 90-day delivery deadline.

## Site
somaid.12brain.org

## Tech Stack
- Backend: FastAPI (Python)
- Frontend: React + TypeScript + Vite
- Database: MongoDB
- AI: Gemini 2.5 Flash
- Storage: Supabase (material catalogs: glass, hardware, profiles, color patterns, fabrics)
- Deployment: VPS Hostinger 76.13.109.151 (port 8080)

## Proprietary Engines

### calcEngine
- Calculates dimensions, quantities, and costs for custom furniture pieces
- Handles glass, aluminum profiles, hardware, accessories
- Input: project specs (dimensions, materials, quantities)
- Output: detailed bill of materials with costs

### nestingEngine
- Optimizes material cutting layouts to minimize waste
- Sheet nesting for glass and panel materials
- Maximizes yield from standard sheet sizes
- Critical for cost optimization — small improvements = significant savings

### interferenceEngine
- Detects physical conflicts between components
- Validates that parts fit together correctly
- Checks clearances, tolerances, and assembly feasibility
- Prevents manufacturing errors before production

## Material Catalogs (Supabase Storage)
- Glass: types, thicknesses, colors, max dimensions
- Hardware: hinges, handles, locks, slides, brackets
- Profiles: aluminum extrusions, dimensions, finishes
- Color patterns: RAL codes, wood finishes, special coatings
- Fabrics: types, widths, patterns (for upholstered pieces)

## Key Components
- FileDropZone.tsx: drag-and-drop, clipboard paste, multi-file upload support
- Material catalog browser with search and filtering
- Project calculator with real-time cost updates
- Nesting visualization (cutting layout preview)

## Conventions
- Diagnostic-first: research before code changes
- Sandbox-first: never edit production directly
- Never break calcEngine, nestingEngine, or interferenceEngine — these are core IP
- Test calculations against known correct values before deploying changes
- All monetary values in BRL unless explicitly specified
- Material dimensions in millimeters (mm) — industry standard in Brazil

## Security
- No secrets in code or logs
- Supabase service keys only server-side
- Client data (projects, quotes) must be isolated per user/company

## Architecture Flow
User (Web) → React Frontend → FastAPI Backend → Proprietary Engines (calc/nesting/interference) → MongoDB (projects) + Supabase (catalogs) → Response with calculations/visualizations

## Business Context
- Target: industrial carpentry shops in Brazil (marcenarias industriais)
- Users are shop floor managers and owners — UI must be simple, not developer-oriented
- Pricing: SaaS subscription (tiered by project volume)
- Partnership: Jose builds, Ricardo funds and sells. 90-day deadline from contract signing.
- Ricardo handles investor relations, sales, commercial strategy
- Jose handles all technical decisions, architecture, development

## Testing
- Validate all engine calculations against manual calculations
- Test nesting optimization against known optimal solutions
- Verify material catalog data integrity after any import
- Test FileDropZone with various file types and sizes

## Domain Knowledge
- Marcenaria industrial = industrial-scale custom furniture manufacturing
- Common products: closets, kitchen cabinets, bathroom vanities, commercial fixtures
- Materials: MDF, MDP, glass (tempered, laminated), aluminum profiles, hardware
- Process: design → calculate → optimize cutting → produce → assemble → install
- Key metric: material yield (% of sheet used vs wasted)

## Briefing Input Format

Real briefings arrive as PDFs from designers/architects (e.g. B.Home Concept, Deerfield Beach FL). Format is semi-structured with free text. The system must parse and extract structured data from these documents.

### Briefing Structure (real example)
Page 1 — Cover sheet:
- Client name
- Client email
- Client phone
- Who referred (designer/architect company)
- Project designer name
- Project entry date
- Project delivery date

Page 2+ — Requirements (free text with bullet points):
- Project type (closet, kitchen, bathroom, commercial)
- Zones/areas within the project (e.g. "Closet Her", "Closet His", "Ilha", "Area Makeup", "Area Armas")
- Per zone: specific items with quantities and constraints

### Data Extraction Requirements
The system must extract from free text:
- Item types: prateleiras, nichos, sapateira, vitrines, gavetas, ilha, area makeup, area armas
- Quantities: "30 pares de sapatos", "06 pares de botas", "15 bolsas", "2 grandes e 2 pequenas malas"
- Materials: vidro temperado, vidro com LED, tampo de vidro, divisores em veludo, espelho
- Hardware: sensores LED (acionamento por porta), dobradicasconceito
- Constraints: "nao estrangular a passagem", "acessar facilmente", "porta de espelho na frente"
- Categories per drawer: lingerie, pijamas, biquinis, cintos, acessorios, joias, oculos

### Typical Zones in Closet Projects
- Closet Her: hanging (vestidos, camisas, calcas), folded (prateleiras, nichos), shoes (sapatos + botas), bags (vitrines com LED), luggage (malas acessiveis no topo), accessories
- Closet His: prateleiras, sapatos, hanging area (usually simpler)
- Ilha Central: tampo vidro com divisores veludo (joias, oculos), gavetas categorizadas
- Area Makeup: bancada com iluminacao, espelho, assento, minimum clearance vs opposite wall
- Area Armas: porta espelho frontal, prateleiras internas com LED + sensor, cases storage
- Area Malas: topo do closet, acesso facil, considerar frequencia de viagem

### calcEngine Requirements from Briefing
From a parsed briefing, calcEngine must calculate:
- Linear meters of hanging bars (based on garment types and quantities)
- Number and dimensions of shelves (based on folded items)
- Shoe rack dimensions (pairs count × avg space per pair, separate boots vs shoes)
- Vitrine dimensions (bag count × display space, glass shelves, LED strips)
- Island dimensions (top area for jewelry/glasses, drawer count and sizes)
- Makeup area dimensions (min width, mirror size, lighting specs)
- Total material list: MDF/MDP sheets, glass panels (tempered, regular), LED strips, sensors, hinges, slides, drawer systems, velvet dividers

### interferenceEngine Requirements from Briefing
- Minimum passage width between makeup area and opposite tower: 800mm
- Door swing clearance for mirror doors (armas area)
- Drawer pull-out clearance from island to surrounding walls
- Luggage area reach height (must be accessible, not above 2200mm)

### nestingEngine Requirements from Briefing
- Optimize cutting of MDF/MDP sheets for all shelves, dividers, drawer fronts
- Optimize glass cutting for vitrines, island top, mirror door
- Group by material type and thickness
- Report waste percentage per material

### Target Clients
- Custom closet designers in South Florida (Brazilian community)
- Architecture/construction firms (e.g. Exxpo Construction)
- Interior designers (e.g. B.Home Concept — Silmara, Deerfield Beach FL)
- Language: Portuguese (briefings arrive in PT-BR even from US-based firms)

### Workflow: Briefing to Production
1. Designer sends PDF briefing via email or platform upload
2. System parses PDF → extracts structured requirements
3. Designer reviews/adjusts extracted data in UI
4. calcEngine generates bill of materials
5. nestingEngine optimizes cutting layouts
6. interferenceEngine validates physical constraints
7. Designer approves → production package generated
8. Export: cutting lists, material orders, assembly instructions

## Real Input Types (3 formats)

The system receives briefings in 3 different formats. All must be supported:

### Format 1: Text Briefing PDF
- Cover page: client name, email, phone, referral, designer, dates
- Requirements pages: free text with bullet points per zone
- Example: "SAPATEIRA (CONSIDERAR 30 PARES DE SAPATOS E 06 PARES DE BOTAS)"
- Parsing: PDF text extraction → NLP entity extraction → structured JSON

### Format 2: Visual Briefing PDF (Presentation)
- Professional presentation from designer (e.g. B.Home Concept)
- Includes: cover page, mood board with color/material samples, photos of current space
- Photos show: empty rooms, current furniture/storage, lighting fixtures, doors, AC vents, ceiling height, flooring
- Parsing: PDF image extraction → Vision AI (Gemini) for spatial analysis → room dimensions estimation from photos → current inventory detection

### Format 3: Hand-drawn Floor Plan (Croqui)
- Paper sketch on graph paper, photographed or scanned
- Contains: room dimensions in meters, zone labels, furniture placement, door positions
- Annotations in Portuguese handwriting
- Critical data: wall lengths, ceiling height (H=), zone boundaries, passage widths
- Parsing: Image → Vision AI (Gemini) for OCR of handwritten dimensions → structured floor plan JSON

### Parsed Output Structure (unified for all 3 formats)
All formats must converge to a single structured JSON:
```json
{
  "client": { "name": "", "email": "", "phone": "", "referral": "" },
  "project": { "type": "closet", "designer": "", "date_in": "", "date_due": "" },
  "space": {
    "total_area_m2": 0,
    "ceiling_height_m": 3.00,
    "walls": [
      { "id": "north", "length_m": 3.64, "features": ["door", "ac_vent"] }
    ],
    "entry_point": { "wall": "south", "width_m": 0.90 }
  },
  "zones": [
    {
      "name": "Closet Her",
      "dimensions": { "width_m": 3.64, "depth_m": 3.81 },
      "items": [
        { "type": "hanging_bar", "subtype": "long_garments", "priority": "high" },
        { "type": "shoe_rack", "quantity": 30, "subtype": "shoes" },
        { "type": "shoe_rack", "quantity": 6, "subtype": "boots" },
        { "type": "vitrine", "quantity": 15, "subtype": "bags", "features": ["glass_shelves", "LED"] },
        { "type": "luggage_area", "quantity": 4, "sizes": ["2_large", "2_small"], "access": "frequent" }
      ]
    },
    {
      "name": "Ilha Central",
      "items": [
        { "type": "jewelry_display", "features": ["glass_top", "velvet_dividers"] },
        { "type": "drawers", "categories": ["lingerie", "pijamas", "biquinis", "cintos", "acessorios"] }
      ]
    },
    {
      "name": "Makeup Area",
      "dimensions": { "width_m": 1.19, "depth_m": 1.93 },
      "items": [
        { "type": "vanity", "features": ["mirror", "lighting", "seating"] }
      ],
      "constraints": [
        { "type": "min_passage", "value_mm": 800, "relative_to": "opposite_tower" }
      ]
    },
    {
      "name": "Area Armas",
      "dimensions": { "width_m": 1.36 },
      "items": [
        { "type": "gun_cases_storage", "features": ["mirror_door_front", "LED_shelves", "door_sensor"] }
      ]
    },
    {
      "name": "Closet His",
      "dimensions": { "width_m": 4.03 },
      "items": [
        { "type": "shelves" },
        { "type": "shoe_rack" }
      ]
    }
  ],
  "materials": {
    "colors": ["Lana", "Lord"],
    "mood_board": "elegant_neutral"
  }
}
```

## Chat Interface (Planned)

### Concept
Conversational interface where designer uploads briefing, sends photos/audio, and SOMA ID processes everything automatically. No software to learn — just chat.

### Channels
- Web chat (embedded in somaid.12brain.org)
- WhatsApp Business API (via Twilio, same infra as PayJarvis)
- Telegram (via grammY, same infra as OpenClaw)

### Chat Flow
1. Designer opens chat
2. Upload button: accepts PDF briefing, photos (JPG/PNG), floor plan sketches
3. Audio input: voice message transcribed via Gemini STT or AssemblyAI
4. AI parses all inputs (PDF text extraction + Vision AI for photos/croqui + STT for audio)
5. AI asks clarifying questions if data is incomplete
6. Designer confirms requirements
7. System runs full pipeline: parse → calcEngine → interferenceEngine → nestingEngine → CAD engine (build123d)
8. Delivers in chat: 8 technical sheets (PDF/HTML links), 3D viewer link, BOM with costs, STEP file download
9. Designer can request adjustments via chat: "reduce island size", "add more shelves in Closet His"
10. System recalculates and delivers updated version

### AI Agent Capabilities
- Parse PDF briefings (text extraction + NLP)
- Parse hand-drawn floor plans (Vision AI → OCR dimensions)
- Parse photos of existing space (Vision AI → room analysis)
- Transcribe voice messages (STT)
- Ask clarifying questions in Portuguese
- Run full engineering pipeline
- Generate and serve technical drawings
- Handle revision requests conversationally

### Tech Stack for Chat
- Frontend: React chat component (web) or WhatsApp/Telegram bot
- AI: Gemini 2.5 Flash with function calling (same as current SOMA ID)
- Voice: Gemini STT for transcription, edge-tts for responses
- File processing: PDF parsing, image vision, audio transcription
- Pipeline: existing engines (calc, interference, nesting) + CAD engine (build123d)
- Delivery: HTML links served via Nginx, PDF generation, STEP file download

### Monetization via Chat
- Free: 1 project per month (basic BOM only)
- Pro $199/mo: unlimited projects, full technical sheets + 3D + STEP
- Enterprise $499/mo: white-label chat, API access, priority support

## Regras Tecnicas de Projetista de Moveis Planejados

### Ergonomia e Medidas Padrao

#### Closets e Guarda-Roupas
PROFUNDIDADE:
- Padrao cabideiro: 550-600mm (minimo 500mm se espaco limitado)
- Cabide medio: 400-450mm largura, precisa 530mm interno minimo
- Prateleiras roupas dobradas: 400-500mm profundidade
- Sapateira: 300-350mm profundidade

CABIDEIROS - ALTURAS:
- Vestidos longos e casacos: 1300-1700mm do piso ao cabideiro
- Camisas, blazers: 1050-1100mm livre
- Saias, calcas, blusas: 850-900mm livre
- Cabideiro duplo (2 niveis): superior 1700mm, inferior 850mm do piso
- Barra cromada diametro: 25mm padrao

PRATELEIRAS:
- Espacamento entre prateleiras: 300-400mm
- Largura maxima sem suporte central: 900mm (acima disso embarriga)
- Espessura minima: 18mm MDP/MDF

SAPATEIRA:
- Rasteiras e chinelos: 80mm entre prateleiras
- Tenis e sapatos: 140mm entre prateleiras
- Botas cano curto: 250-350mm
- Botas cano alto: ate 500mm
- Medida padrao nicho: 210-310mm altura x 300mm profundidade

GAVETAS:
- Roupas intimas e acessorios: 150mm altura
- Roupas maiores (camisetas): 200-250mm altura
- Profundidade gaveta: 500mm
- Divisorias colmeia sutia: 150x150mm
- Divisorias meias/lingerie: 100x100mm
- Corrediças telescopicas obrigatorias

MALEIRO (area malas no topo):
- Altura: 300-500mm (padrao 400mm)
- Posicao: topo do armario
- Acesso maximo recomendado: 2200mm do piso
- Pe-direito 2500mm: 2000mm cabideiro + 400mm maleiro + 100mm rodape

#### Circulacao e Passagens
- Circulacao minima dentro de closet: 600mm (apertado)
- Circulacao confortavel: 800-1000mm
- Ideal para se vestir: 1000mm+
- Porta de abrir: largura menor que circulacao disponivel
- Porta de correr: nao prejudica circulacao
- Clearance ilha central: minimo 600mm em todos os lados
- Clearance gaveta aberta: profundidade da gaveta + 200mm

#### Materiais Padrao
CHAPAS:
- MDP 15mm: divisorias, laterais internas, fundos reforçados
- MDP 18mm: laterais externas, prateleiras, portas, frontal gavetas
- MDF 18mm: portas com acabamento especial, frontal premium
- Fundo: 6mm (movel e gavetas)
- Tampo vidro temperado: 8-10mm

FITAS DE BORDA:
- Todas as faces visiveis devem ter fita de borda
- Largura: compativel com espessura da chapa
- ABS ou PVC: mais duravel que papel

FERRAGENS ESSENCIAIS:
- Dobradicas: 35mm copo, com soft-close
- Corrediças: telescopicas com soft-close (full extension)
- Puxadores: definir padrao por projeto
- Suportes prateleira: pino metalico ou suporte invisivel
- Cabideiro: barra oval cromada 25mm + suportes laterais
- Corrediça sapateira: telescopica com inclinacao 15 graus

#### Cozinhas (referencia para projetos futuros)
- Bancada: 850-930mm altura
- Armario superior: 350-450mm profundidade
- Distancia bancada ao aereo: minimo 550mm (ideal 600mm)
- Aereo: 1500mm do piso (linha dos olhos)
- Circulacao cozinha: 850mm-1000mm

#### Banheiros
- Bancada: 850-900mm altura
- Armario sob bancada: 400-500mm profundidade
- Espelho com armario embutido: 150mm profundidade

### Regras de Producao

#### Plano de Corte
- Chapas padrao MDP/MDF: 2750x1850mm (Brasil) ou 2440x1220mm (4x8 ft - EUA)
- Sempre indicar direcao do veio quando aplicavel
- Fita de borda: listar quais faces de cada peca recebem fita
- Etiqueta por peca: codigo, dimensao, material, fita, destino (qual movel)
- Meta de aproveitamento: minimo 85% (bom), 90%+ (excelente)

#### Detalhamento para Fabrica
Cada movel deve ter:
- Vista frontal cotada (todas as medidas internas)
- Vista lateral cotada (profundidades)
- Vista superior quando necessario (planta do movel)
- Lista de pecas com: codigo, nome, dimensao LxAxP, material, fita de borda (quais faces)
- Lista de ferragens: tipo, quantidade, posicao
- Indicacao de furacoes: dobradicas, corrediças, cavilhas, minifix

#### Descontos de Montagem
- Desconto padrao por lado encostado na parede: 5-10mm
- Desconto para porta de correr: conforme trilho (geralmente 12-15mm por trilho)
- Folga entre modulos adjacentes: 2-3mm
- Folga piso-movel (rodape): 70-100mm padrao

### Fluxo do Projetista (o que o SOMA ID substitui)
1. Recebe briefing do designer/cliente
2. Visita tecnica para medicao (ou recebe croqui/planta)
3. Analisa necessidades e define zonas
4. Desenha planta baixa com distribuicao dos moveis
5. Desenha elevacoes de cada parede/modulo
6. Aplica regras ergonomicas (alturas, profundidades, circulacao)
7. Especifica materiais (chapas, cores, ferragens)
8. Gera lista de pecas com dimensoes
9. Gera plano de corte otimizado
10. Gera orcamento de materiais
11. Entrega pacote tecnico para fabrica (planta + elevacoes + lista + plano de corte)
12. Acompanha producao e montagem

O SOMA ID automatiza os passos 3-11. Passos 1-2 sao input (briefing + medicao). Passo 12 e fisico.
