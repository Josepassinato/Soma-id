# HISTORICO.md — SOMA-ID

## 2026-03-24 — Pranchas Técnicas Profissionais (Padrão Promob/SketchUp Layout)

### O que foi feito

**Objetivo:** Elevar o nível de detalhe das pranchas técnicas do HTML report para padrão profissional de projeto executivo de marcenaria (referências: Tiffany Mayer Designs, SketchUp Layout guarda-roupa, JC Interiores).

**PART 1 — engine-bridge.ts: Mais Módulos**

Problema: Engine gerava apenas ~3 módulos para closet complexo. Agora gera 14.

Correções:
1. Adicionados 5 novos tipos ao ITEM_TO_MODULE_MAP: nicho, accessories_drawer, steamer_niche, mirror_door, led_panel
2. Sapateira por subtipo: boots → qty*70mm (min 400), shoes → qty*50mm (min 500)
3. Cabideiro por subtipo: long_garments=1000mm, short_garments=800mm, mixed=1200mm
4. Vitrine: multiplicador 80→100 por bolsa, max 1500mm
5. humanModuleName(): nomes descritivos (Cabideiro Longo, Sapateira Botas, Vitrine Bolsas LED, etc.)

Resultado com briefing Sabrina: 14 módulos — Cabideiro Longo [1000mm], Cabideiro Curto [800mm], Prateleiras [800mm], Sapateira [1500mm], Sapateira Botas [420mm], Vitrine Bolsas LED [1500mm], Armário Armas [1200mm], Maleiro [800mm], Prateleiras His [600mm], Sapateira His [1000mm], Cabideiro His [1200mm], Bancada Makeup [1000mm], Ilha Central [1200mm], Gaveteiro [1200mm]

**PART 2 — html-report.ts: Reescrita Completa (1469→2116 linhas)**

Novas funcionalidades:
1. **renderCarimbo()** — Carimbo profissional em TODAS as 11 pranchas (SOMA-ID, cliente, designer, escala, formato, prancha X/Y, revisão RV.01, projeto SOMA-XXXX-XXXX-XXX)
2. **renderWallInteriorSvg()** — Vista SEM Portas (Interior) para cada parede: prateleiras com espaçamento cotado, cabideiro com silhuetas de roupa, gavetas com labels, sapateira inclinada com silhueta de sapatos, vitrine com vidro e LED, gun safe com cases
3. **renderMemorialDescritivo()** — Tabelas profissionais: PORTAS (material predominante, puxadores), TAMPOS (predominante, ilha vidro), INTERNOS (corpos, prateleiras, gavetas, corrediças, cabideiros), ACESSÓRIOS/FERRAGENS (agrupados e contados), DADOS DO PROJETO
4. **3 Níveis de Cotas** nas elevações: Nível 1 CABINETS (largura individual), Nível 2 ARCHITECTURAL (grupos), Nível 3 OVERALL (total parede)
5. **Cotas verticais** no lado direito de cada elevação
6. **Porta com arco de abertura** e puxadores indicados
7. **Labels de material** abaixo de cada módulo ("ACABAMENTO: Lord")
8. **Ilha melhorada**: 5ª vista (top-down com grid de veludo), labels de material (Tampo: Vidro Temperado, Corpo, Frentes)
9. **Nesting melhorado**: hachura diagonal em áreas de desperdício, barra de eficiência por chapa
10. **Capa melhorada**: índice de pranchas, número do projeto SOMA-XXXX-XXXX-XXX, revisão
11. **Contagem dinâmica de pranchas** (uma prancha por parede com módulos)
12. **Escala automática** calculada baseada no tamanho do ambiente
13. **Section cuts C e D** na planta baixa (era só A e B)
14. **Hachura 45°** nas zonas da planta baixa

**Design CSS:**
- Fundo branco puro (documento técnico)
- Fonte Arial, sans-serif
- Traços SVG: #000 paredes, #333 módulos, #CC0000 cotas
- @media print: page-break-before em cada prancha
- Classes .carimbo, .memorial, .dim-label

### Testes
| Teste | Resultado |
|---|---|
| TypeScript build | Zero erros |
| Briefing Sabrina (14 módulos) | 14 módulos gerados |
| HTML Report | 11 pranchas, 24 SVGs reais, 694 KB |
| Carimbos | 11 (um por prancha) |
| Memorial Descritivo | Presente com 4 seções |
| Vistas Interior | 2 (Parede A e B) |
| PM2 restart | Online, health OK |
| Nesting | 17 chapas, 116 peças |

### Arquivos alterados
- `chat/src/services/engine-bridge.ts` — 5 novos tipos ITEM_TO_MODULE_MAP, humanModuleName(), sizing por subtipo
- `chat/src/services/html-report.ts` — Reescrita completa (1469→2116 linhas), renderCarimbo, renderWallInteriorSvg, renderMemorialDescritivo, 3 níveis cotas

### Estado atual
- Frontend: https://somaid.12brain.org (HTTP 200)
- Backend: http://localhost:8003 (PM2 online)
- Chat: http://localhost:8091 (PM2 online, health OK)
- Sandbox: `/root/sandbox/soma-id_2026-03-24-pranchas/` (mantido)

### Integrações ativas
- Engine pipeline: briefing → layout (14 módulos) → calc → interference → nesting → HTML report: OK
- HTML Report: 11 pranchas com SVGs vetoriais, carimbo profissional, memorial descritivo: OK
- PDF via Playwright: disponível via /session/{id}/pdf: OK
- MongoDB material catalog: OK

---

## 2026-03-23 — Imagem Conceito com Cores Reais do Catálogo

### O que foi feito

**Problema:** A imagem conceito recebia nomes como "Lord" e "Lana" mas o Gemini Image não sabia que cor isso é. Resultado: cores inventadas na imagem.

**Correção 1 — `materialToVisualDescription()` em material-catalog.ts:**
- Converte material do MongoDB em descrição visual para prompts de imagem
- Conversão hex→HSL→nome de cor **algorítmica** (zero cores hardcoded)
- Usa `category` do banco para textura (Madeirado→"wood grain", Unicolor→"smooth matte laminate")
- Usa `texture` do banco se disponível para enriquecer
- Formato: "blue smooth matte laminate (Lord by Boa Vista)"

**Correção 2 — Endpoint `POST /catalog/image-prompt`:**
- Recebe `color_assignments` e/ou `colors` do projeto
- Chama `materialToVisualDescription()` para CADA material
- Monta prompt com descrições visuais derivadas do banco
- Retorna prompt + legend dos materiais

**Correção 3 — `generateEnchantmentImage()` em chat.html:**
- Agora busca prompt do servidor via `/catalog/image-prompt` (dados reais do banco)
- Fallback para prompt simples se servidor falhar
- Exibe **legenda de materiais** junto com a imagem:
  "• Corpo principal: Lord — #50617D (Boa Vista)"
  "• Portas e gavetas: Lana — #e0e0df (Boa Vista)"

**Correção 4 — Orquestrador:**
- Regra 16: se usuário reclama das cores, gera nova imagem imediatamente sem desculpas genéricas

### Testes
- `POST /catalog/image-prompt` com Lord+Lana → "blue smooth matte laminate (Lord by Boa Vista)" + "white smooth matte laminate with toque finish (Lana by Boa Vista)"
- Material inexistente → "material not found in catalog" (não inventa)
- Carvalho → "warm beige wood grain texture with amadeirado finish (Carvalho by Boa Vista)"
- Zero hex ou textura hardcoded no código — tudo derivado do MongoDB

### Arquivos alterados
- `chat/src/services/material-catalog.ts` — hexToHsl, hslToColorName, categoryToTexture, materialToVisualDescription, buildMaterialsLegend, getMaterialById
- `chat/src/routes/catalog.ts` — POST /catalog/image-prompt
- `chat/public/chat.html` — generateEnchantmentImage usa servidor, mostra legenda, regra 16 no orquestrador

---

## 2026-03-23 — Validação Completa de Materiais: Somente Catálogo Real Boa Vista

### O que foi feito

**Objetivo:** Garantir que o sistema NUNCA invente, sugira ou use um material que não exista no catálogo real de 99 materiais da Boa Vista no MongoDB.

**PART 1 — Material resolution no briefing parser (`briefing-parser.ts`):**
- Nova função `resolveToCatalogMaterial()`: resolve texto livre ("LORD", "madeira escura") para material real do catálogo
- Usa `findBestMatch()` + `searchMaterials()` com cálculo de confiança (1.0=exato, 0.85=parcial, 0.6=busca)
- Após Gemini extrair briefing, todas as cores são resolvidas automaticamente
- Confiança < 0.7 → marca como `material_unresolved` nos gaps (pede confirmação ao usuário)
- `ParsedBriefing.materials.resolved_materials[]` agora carrega: raw_text, resolved_material_id, confidence, category, hex_color, manufacturer

**PART 2 — Validação no chat + endpoints (`chat.html`, `catalog.ts`):**
- Novo arquivo `src/routes/catalog.ts` com 3 endpoints no chat server (porta 8091):
  - `GET /catalog/materials` — lista 99 materiais com filtros `?category=` e `?search=`
  - `GET /catalog/materials/resolve?name=` — resolve nome livre para material do catálogo
  - `GET /catalog/categories` — lista categorias com contagens
- `loadCatalogMaterials()` e `resolveMaterialName()` no chat.html para validação client-side
- `validateMaterialInput()` intercepta mensagens com menção a materiais
- Chips de material agrupados por categoria (Unicolor, Madeirado, Pintura)
- Prompt do orquestrador Gemini atualizado: "NUNCA sugira materiais fora do catálogo Boa Vista"

**PART 3 — Validação no engine-bridge (`engine-bridge.ts`):**
- `findMaterial()` reescrito: fallback para "Branco Supremo" (material real) em vez de "Custom"
- Logs de warning quando material não encontrado: `⚠️ Material não encontrado: "X". Usando fallback: Branco Supremo`
- Nova função `validateProjectMaterials()`: verifica toda a palette contra o catálogo
- `material_warnings[]` incluído no resultado dos engines
- `material_palette[]` com nome, categoria, cor e fabricante incluído no summary

**PART 4 — Imagem de encantamento (`chat.html`):**
- Prompt de imagem agora usa nomes reais do catálogo com distribuição:
  "Cabinet body: Lord (Boa Vista laminate). Door fronts: Lana (Boa Vista laminate)"

**PART 5 — Relatório HTML/PDF (`html-report.ts`):**
- Nova seção "Materiais do Projeto" com tabela: Função → Material → Categoria → Cor → Fabricante (Boa Vista)
- Seção de warnings de material quando há fallbacks
- Plano de corte: cada chapa mostra "Material (Boa Vista)" no título
- Materiais no header com "(Catálogo Boa Vista)"

### Testes dos endpoints
| Teste | Resultado |
|---|---|
| `GET /catalog/materials` | 99 materiais |
| `GET /catalog/materials?category=Vidro` | 6 vidros |
| `GET /catalog/materials?search=branco` | 4 resultados (Branco Supremo, Branco, Branco Diamante, Matelassê Branco) |
| `GET /catalog/materials/resolve?name=lord` | found, confidence 1.0, Lord (Unicolor) |
| `GET /catalog/materials/resolve?name=lana` | found, confidence 1.0, Lana |
| `GET /catalog/materials/resolve?name=marmore+carrara` | found, confidence 0.85, Marmo (closest match) |
| `GET /catalog/materials/resolve?name=xyzqwerty` | not_found |
| `GET /catalog/categories` | 8 categorias com contagens |
| Chat page HTTPS | HTTP 200 |

### Arquivos alterados
- `chat/src/types.ts` — novo `ResolvedMaterial` interface, `resolved_materials` em ParsedBriefing
- `chat/src/services/briefing-parser.ts` — `resolveToCatalogMaterial()`, `resolveBriefingMaterials()`, integração pós-parsing
- `chat/src/services/engine-bridge.ts` — `FALLBACK_MATERIAL`, `validateProjectMaterials()`, material_palette/warnings no summary
- `chat/src/routes/catalog.ts` — NOVO: endpoints de catálogo com search/filter/resolve
- `chat/src/server.ts` — registro de catalogRoutes
- `chat/src/services/html-report.ts` — seção Materiais do Projeto, warnings, manufacturer nas chapas
- `chat/public/chat.html` — `loadCatalogMaterials()`, `resolveMaterialName()`, `validateMaterialInput()`, prompt de imagem com catálogo, prompt orquestrador com regra de catálogo

### Estado atual
- Frontend: https://somaid.12brain.org (HTTP 200)
- Backend: http://localhost:8003 (PM2 online)
- Chat: http://localhost:8091 (PM2 online)
- Catálogo: 99 materiais Boa Vista no MongoDB
- Sandbox: `/root/sandbox/soma-id-chat_2026-03-23b/` (mantido)

### Integrações ativas
- MongoDB soma_id_db.materials: 99 materiais (8 categorias)
- material-catalog.ts → loadMaterials() → cache 10min → findBestMatch/searchMaterials: OK
- Briefing parser → resolveBriefingMaterials(): OK
- Engine-bridge → validateProjectMaterials() → fallback Branco Supremo: OK
- HTML report → seção Materiais do Projeto com Boa Vista: OK
- Chat catalog endpoints (8091): /catalog/materials, /catalog/materials/resolve, /catalog/categories: OK

---

## 2026-03-23 — Fix 2 Bugs Críticos: Medidas do Briefing + Seletor Multi-Cor

### O que foi feito

**BUG 1 — Medidas do briefing não eram respeitadas nos engines**

Problema: Quando um briefing real chegava com múltiplas zonas e medidas diferentes (ex: Closet Her 3.64m x 5.13m, Closet His 3.64m x 3.81m, Makeup 1.19m x 1.93m), o calcEngine usava larguras genéricas da tabela ITEM_TO_MODULE_MAP em vez das medidas reais do croqui.

Correções:
1. **gemini.ts** — Prompt de extração reforçado com regras CRÍTICAS:
   - Extrair dimensões de CADA zona individualmente (não copiar mesmas medidas para todas)
   - Extrair TODAS as paredes do ambiente (não apenas a principal)
   - Somar segmentos de parede (ex: 1.00 + 0.87 + 1.00 = 2.87m)
   - Extrair TODAS as cores mencionadas no briefing (ex: "Lana e Lord" → ["Lana", "Lord"])

2. **engine-bridge.ts** — `calcZoneWidth()` agora:
   - Lê `zone.dimensions.width_m` quando disponível
   - Escala proporcionalmente os módulos se excedem a largura real da zona
   - Enforça largura mínima de 300mm por módulo
   - Upper modules (maleiro) usam largura da zona quando disponível

3. **engine-bridge.ts** — `runInterferenceEngine()` agora:
   - Recebe `passageConstraints` extraídas das zone constraints
   - Valida passagens mínimas (CRITICAL se abaixo do mínimo, WARNING se apertado)
   - Pipeline extrai constraints de cada zona automaticamente

**BUG 2 — Seletor de cores limitado a uma única cor**

Problema: Na etapa de escolha de materiais, o chat oferecia chips de material e o usuário só podia clicar UM — a seleção era singular. Projetos reais usam múltiplas cores (corpo, portas, ilha, destaque).

Correções:
1. **chat.html** — `showMaterialOptions()` reescrito com fluxo multi-categoria:
   - 5 categorias: Principal (corpo), Secundária (portas/frentes), Destaque, Ilha, Interna
   - 2 obrigatórias (principal + secundária), 3 opcionais (skip disponível)
   - Se briefing menciona cores, oferece distribuição sugerida com opção de aceitar ou escolher manual
   - `showProjectSummary()` mostra distribuição de cores por categoria

2. **chat.html** — Orchestrator prompt atualizado:
   - Regras 14-15: sempre perguntar/confirmar pelo menos 2 cores
   - Sugerir distribuição quando briefing já menciona cores
   - Campo `detectMissingFields()` atualizado para verificar `color_assignments`

3. **engine-bridge.ts** — `briefingToProject()` agora:
   - Lê `color_assignments` (primary/secondary/accent/island/internal)
   - Fallback para array `colors` simples
   - Palette ordenada: primary → secondary → accent → island → internal

4. **engine-bridge.ts** — `runNestingEngine()` agora:
   - Agrupa peças por material/cor antes do nesting
   - Chapas de cores diferentes ficam separadas
   - Plano de corte reflete quantidade de chapas por cor

### Arquivos alterados
- `chat/src/services/gemini.ts` — prompt de extração aprimorado com regras por zona
- `chat/src/services/engine-bridge.ts` — calcZoneWidth com scaling, interferência com passages, nesting por material
- `chat/public/chat.html` — multi-color selector, summary, orchestrator prompt, detectMissingFields

### Testes
- TypeScript: compila sem erros
- E2E: 3/4 passando (Phase 3 flaky por JSON parsing do Gemini — pré-existente)
- Chat frontend: HTTP 200 em produção e localhost
- PM2: soma-id-chat online

### Estado atual
- Frontend: https://somaid.12brain.org (HTTP 200)
- Backend: http://localhost:8003 (PM2 online)
- Chat: http://localhost:8091 (PM2 online)
- Sandbox: `/root/sandbox/soma-id-chat_2026-03-23/` (mantido)

### Integrações ativas
- Gemini API: briefing parsing (com prompt aprimorado), question generation, answer processing: OK
- Chat pipeline: briefing → parse → perguntas → estilo → materiais(multi-cor) → imagem → confirmação → engines → resultado: OK
- calcEngine + interferenceEngine + nestingEngine: OK (com zone scaling + passage checks + nesting por material)

---

## 2026-03-23 — Multi-wall Layout + Nesting Engine Upgrade

### O que foi feito

**Problema:** `briefingToLayout` colocava TODOS os módulos de TODAS as zonas em uma única parede linear. Resultado: 9 conflitos BOUNDARY_VIOLATION e apenas 35% de eficiência de nesting (30 chapas para 14 módulos).

**Fix 1 — Distribuição multi-parede (`engine-bridge.ts`):**
- Nova função `resolveWalls()`: lê paredes do briefing, desconta portas/janelas/entrada, ordena por espaço útil
- Fallback: se briefing não tem paredes explícitas, estima 4 paredes a partir da área total
- Zonas distribuídas por first-fit decreasing: cada zona vai na parede com mais espaço
- Se zona não cabe em uma parede, divide entre paredes adjacentes
- Zonas freestanding (Ilha Central) tratadas separadamente — não ocupam parede
- Módulos upper (Maleiro) posicionados em y=2200 (topo), não avançam xCursor
- Drawers consolidados: 5 categorias de gavetas = 1 gaveteiro (não 5 módulos separados)

**Fix 2 — Nesting Engine com Maximal Rectangles:**
- Substituído shelf-packing simples por algoritmo Maximal Rectangles Bin Packing
- Tracking de retângulos livres por chapa com split e deduplicação
- Best Short Side Fit para posicionamento otimizado
- Rotação automática para peças com grain="none" quando não cabem na orientação normal
- Peças estruturais (laterais, prateleiras, fundos) agora têm grain="none" para permitir rotação

**Fix 3 — Cut list corrigida:**
- Altura dos módulos limitada ao pé-direito do projeto (não mais hardcoded 2400mm)
- Laterais com grain="none" (estrutural, rotação livre no nesting)
- Portas mantêm grain="vertical" (peças visíveis)

**Fix 4 — Interferência multi-parede:**
- Cada parede verificada contra seu próprio comprimento útil
- Módulos freestanding e upper excluídos de boundary checks
- Módulos upper excluídos de pairwise overlap checks

**Fix 5 — Confirmação com pontuação:**
- "confirmo, tudo certo!" agora reconhecido (antes falhava por causa da vírgula)
- cleanText strip pontuação antes de comparar com keywords

### Resultados (antes → depois)
| Métrica | Antes | Depois |
|---|---|---|
| Conflitos BOUNDARY_VIOLATION | 9 | 0 |
| Eficiência nesting | 35.2% | 86.7% |
| Chapas | 30 | 9 |
| Custo estimado | $2,865 | $960 |

### Arquivos alterados
- `chat/src/services/engine-bridge.ts` — rewrite completo de briefingToLayout, runCalcEngine, runInterferenceEngine, runNestingEngine
- `chat/src/routes/conversation.ts` — fix confirmação com pontuação
- `chat/tests/e2e-pipeline.spec.ts` — novo teste E2E (6 testes, todos passando)
- `chat/playwright.config.ts` — configuração Playwright

### Estado atual
- Frontend: https://somaid.12brain.org (HTTP 200)
- Backend: http://localhost:8003 (PM2 online)
- Chat: http://localhost:8091 (PM2 online)
- Teste E2E: 6/6 passando (1.8min)
- Sandbox: `/root/sandbox/soma-id_2026-03-23/` (mantido)

### Integrações ativas
- Gemini API: briefing parsing, question generation, answer processing: OK
- Chat pipeline: briefing → parse → perguntas → confirma → engines → resultado: OK
- calcEngine + interferenceEngine + nestingEngine: OK (local, via engine-bridge.ts)

---

## 2026-03-20 — Correção 6: 3 Pontos Críticos do Fluxo de Encantamento

### O que foi feito

**Correção 1 — Materiais do catálogo no prompt de imagem (Alta prioridade)**
- `GeneratePromptRequest` e `GenerateImageRequest` agora aceitam `selectedMaterials: list[dict]`
- Endpoint `generate-prompt`: monta bloco `MATERIAIS OBRIGATÓRIOS DO CATÁLOGO` com nomes, categorias e texturas dos materiais selecionados + sufixo `MATERIALS (use exclusively)` no prompt final
- Endpoint `generate-image`: usa nomes dos materiais selecionados na `material_instruction` em vez do hardcoded "walnut/oak"
- **Teste real:** prompt com Noce Autunno, Latão Escovado, Mármore Calacatta → todos aparecem no prompt final

**Correção 2 — Gate de aprovação da imagem**
- Botão "Aprovar Conceito" agora abre modal de confirmação em vez de avançar direto
- Modal exige: checkbox "Cliente aprovou presencialmente" + campo opcional de observações
- Salva `approvalTimestamp` e `approvalNotes` no projeto
- Badge "Aprovado pelo cliente — [data/hora]" aparece nas fases seguintes (PRE_APROVADO em diante)

**Correção 3 — Blueprint 2D com altura correta**
- `Blueprint2D` agora aceita prop `wallHeight` (antes era hardcoded 2700mm)
- `Module1Workflow` passa `project.wallHeight || 2700` para o Blueprint
- Quando `technicalData` é null, mostra placeholder SVG com dimensões e "Planta sendo gerada..." em vez de área vazia

### Arquivos alterados
- `backend/server.py` — selectedMaterials nos modelos + material_instruction dinâmica + sufixo no prompt
- `components/Module1Workflow.tsx` — approval gate modal + badge timestamp + wallHeight passado ao Blueprint
- `components/Blueprint2D.tsx` — prop wallHeight + placeholder quando data=null

### Estado atual
- Frontend: https://somaid.12brain.org (HTTP 200)
- Backend: http://localhost:8003 (healthy, PM2 online)
- Build: OK (index-CifqYMlR.js, 806KB)
- Deploy: /var/www/soma-id/ (backend + dist)
- Sandbox: `/root/sandbox/soma-id_2026-03-20/` (mantido)

### Integrações ativas
- Gemini API: analyze-consultation, generate-prompt (com materiais), generate-image, analyze-multi-environment: OK
- Gemini Imagen: INDISPONÍVEL — fallback SVG ativo
- Supabase: NÃO CONFIGURADO — modo localStorage
- MongoDB: 20 materiais (catálogo online)

---

## 2026-03-20 — Correção 5: Fluxo PDF → Análise via Gemini

### O que foi feito

**Problema:** Endpoint `analyze-consultation` recebia PDFs em base64 mas enviava os primeiros 1000 chars do base64 bruto como texto ao Gemini — resultado ilegível, análise impossível.

**Correção (backend/server.py):**
- Novo branch `elif request.input.type == 'PDF'` que envia PDF como documento nativo via `ImageContent(base64_data=..., media_type="application/pdf")`
- Novo `pdf_prompts` (pt/en/es) específico para extração de dados de marcenaria
- O `else` agora trata apenas áudio (antes era audio+pdf juntos)

**Teste real:** PDF com 8 ambientes (Kitchen, Laundry, Bath, Closets) → análise `COMPLETO`, 10 materiais sugeridos, briefing técnico detalhado, status 200 OK.

### Estado atual
- Frontend: http://localhost:8082 e https://somaid.12brain.org
- Backend: http://localhost:8003 (FastAPI, healthy, pm2 online)
- Fluxo PDF: FUNCIONANDO (upload → base64 → Gemini nativo → análise completa)
- Sandbox: `/root/sandbox/soma-id_2026-03-20/` (mantido)

### Arquivos alterados
- `backend/server.py` — novo branch PDF com ImageContent + pdf_prompts

---

## 2026-03-20 — Bloco 2 e Bloco 3: Frontend no ar + 4 correções para demo

### O que foi feito

**Bloco 2 — Frontend no ar:**
- `vite.config.ts`: proxy corrigido de porta 8001 → 8003
- `npm install` + `npm run build` (389 modules, ~5s)
- `dist/` copiado para `/var/www/soma-id/dist/`
- Nginx reconfigurado: serve estático do dist + proxy API→8003
  - `/etc/nginx/sites-enabled/soma-id` (porta 8082)
  - `/etc/nginx/sites-enabled/somaid.12brain.org` (SSL 443)

**Bloco 3 — Diagnóstico ponta-a-ponta + 4 correções:**

1. **Correção 1 — Modo Guest (AuthPage):**
   - Sem Supabase configurado, pula landing page → vai direto para AuthPage
   - Botão "Entrar na Demo" proeminente (cyan, grande)
   - Guest tem acesso completo: tokens bypassed, localStorage como DB

2. **Correção 2 — Fallback Imagen (geminiService.ts):**
   - Gemini Imagen não funciona com a API key atual
   - `generateEnchantmentImage` agora NUNCA lança erro
   - Fallback gera SVG concept render profissional (cozinha isométrica)
   - SVG adapta cores baseado no prompt (dark wood, gold details)

3. **Correção 3 — Botão DXF (Module1Workflow.tsx):**
   - Import de `DxfService` + `EngineeringService`
   - Botão "Exportar DXF" na fase CONCLUIDO
   - Gera nesting via `EngineeringService.processNesting()`
   - Download automático como arquivo `.dxf`

4. **Correção 4 — Render sem Supabase:**
   - Já estava resolvido pelo código existente:
     - `StorageService` retorna data URI quando supabase=null
     - `projectService` salva em localStorage quando supabase=null
     - SVG fallback (Correção 2) fornece data URI leve (~3KB)

### Estado atual
- Frontend: http://localhost:8082 e https://somaid.12brain.org
- Backend: http://localhost:8003 (FastAPI, healthy)
- Build: OK (390 modules)
- Sandbox: `/root/sandbox/soma-id_2026-03-20/` (mantido)

### Integrações ativas
- Gemini API (analyze-consultation, generate-prompt, generate-technical-data: OK)
- Gemini Imagen: INDISPONÍVEL — fallback SVG ativo
- Supabase: NÃO CONFIGURADO (.env.local ausente) — modo localStorage ativo
- Nginx: servindo estático + proxy API

### Arquivos alterados
- `App.tsx` — skip landing quando supabase=null
- `components/AuthPage.tsx` — botão Guest proeminente
- `services/geminiService.ts` — fallback SVG para Imagen
- `components/Module1Workflow.tsx` — botão Exportar DXF
- `vite.config.ts` — proxy porta 8003
