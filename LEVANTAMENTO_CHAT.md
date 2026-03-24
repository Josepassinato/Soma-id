# SOMA ID — Levantamento Completo para Chat Interface

**Data:** 2026-03-23
**Objetivo:** Diagnosticar o que ja existe, o que falta, e estimar esforco para implementar chat conversacional que recebe briefing e entrega pacote tecnico completo.

---

## LEVANTAMENTO 1 — O QUE JA EXISTE NO VPS

### 1.1 Engines do SOMA ID

| Engine | Arquivo | Linguagem | Status |
|--------|---------|-----------|--------|
| calcEngine | `/root/projetos/soma-id/services/calcEngine.ts` | TypeScript | Funcional |
| interferenceEngine | `/root/projetos/soma-id/services/interferenceEngine.ts` | TypeScript | Funcional |
| nestingEngine | `/root/projetos/soma-id/services/nestingEngine.ts` | TypeScript | Funcional |
| CAD engine | `/root/projetos/soma-id/cad_engine/generate_closet.py` | Python (build123d) | Funcional |
| Orquestrador | `/root/projetos/soma-id/services/engineeringService.ts` | TypeScript | Funcional |

**calcEngine:**
- Input: `AiLayoutPlan` (modulos, posicoes, larguras) + `Project` (materiais, tipo instalacao)
- Output: `BlueprintData` com lista de corte (peca, dimensoes, material, fita de borda, direcao veio, pontos de furacao), mapa de ferragens, notas de fabrica
- Regras: gap porta 3mm, recuo prateleira 20mm, recesso fundo 18mm, costela estrutural 70mm, espessura padrao 18mm
- Avalia formulas parametricas ($W, $H, $D, $T, $G) para dimensoes dos componentes

**interferenceEngine:**
- Input: `BlueprintData` + constraints (wallW, wallH, wallD, roomDepth)
- Output: Array de `InterferenceConflict` com severidade (CRITICAL/WARNING) e tipos (BOUNDARY_VIOLATION, OVERLAP, ERGONOMIC_HAZARD)
- Checks: violacao de limites, sobreposicao AABB, clearance de abertura (500mm projecao frontal)

**nestingEngine:**
- Input: `BlueprintData` (todos os itens de corte)
- Output: `NestingResult` com chapas (2750x1830mm, lâmina 4mm, trim 10mm), pecas posicionadas, percentual de desperdicio, eficiencia global, fita de borda linear, tempo estimado de maquina
- Algoritmo: Shelf-packing (Best Fit Height) com rotacao permitida quando direcao de veio = 'none'

**CAD engine (build123d):**
- Input: `01_parsed_briefing.json` + `02_bill_of_materials.json`
- Output: `.step` (1.7MB), `.stl` (153KB), `parts_manifest.json`
- Gera modelo 3D parametrico completo: paredes, closet her, ilha, makeup, armas, closet his
- build123d instalado e funcional: `python3 -c "import build123d"` → OK

**Orquestrador (`engineeringService.ts`):**
- `EngineeringService.processBlueprint()` roda calc → interference → nesting em sequencia
- Tenta primeiro Supabase Edge Function `engineering-core` (cloud), fallback para execucao local

### 1.2 Pipeline Teste Sabrina Parkland

**Diretorio:** `/root/projetos/soma-id/tests/sabrina-parkland/`

| Arquivo | Funcao |
|---------|--------|
| `01_parsed_briefing.json/.html/.png` | Briefing parseado |
| `02_bill_of_materials.json/.html/.png` | Lista de materiais |
| `03_interference_report.json/.html/.png` | Relatorio de interferencia |
| `04_nesting_plan.json/.html/.png` | Plano de corte |
| `05_ENTREGA_FINAL_SABRINA_PARKLAND.pdf` | PDF final (213KB) |
| `closet_sabrina.step` / `.stl` | Modelo CAD 3D |
| `3d_viewer.html` | Viewer Three.js interativo |
| `parts_manifest.json` | Metadados de pecas para Three.js |
| `visual_01_planta_baixa.html` | Planta baixa HTML |
| `visual_02_nesting.html` | Visualizacao nesting |
| DXFs (planta + 4 elevacoes) | Desenhos tecnicos vetoriais |
| `tech/` (8 folhas + index) | Pacote tecnico completo de producao |

**Scripts geradores:**
- `cad_engine/generate_closet.py` — gera STEP/STL via build123d
- `generate_exports.py` — gera DXFs via ezdxf e STL via numpy-stl
- `generate_pdf.py` — gera PDF final
- `generate_3d_model.py` — gera modelo 3D separado
- `take_screenshots.cjs` — Playwright para screenshots dos HTMLs

### 1.3 OpenClaw Bot

| Item | Detalhe |
|------|---------|
| Local | `/root/openclaw/` |
| Framework | grammY v1.41.1 (Telegram) |
| AI | Gemini 2.5 Flash via `@google/generative-ai` |
| Function calling | 40+ tools nativos Gemini (SchemaType) |
| Multi-tenant | Sim (`bot:${botId}:${chatId}`) |
| Chat history | PostgreSQL (`openclaw_conversations`) — max 50 msgs, summarization |
| Memoria | `openclaw_user_facts` + `openclaw_reminders` |
| TTS | 3-tier fallback: Gemini TTS → ElevenLabs → edge-tts |
| STT | Gemini 2.5 Flash (audio nativo) |
| Multi-canal | Telegram + WhatsApp (via PayJarvis proxy) + Web chat |
| PM2 | `openclaw` — online, PID 387271, 83.4mb |

**Arquivos reutilizaveis:**
- `memory.js` (213 linhas) — CRUD conversa + fatos + lembretes
- `gemini.js` (1208 linhas) — chat com function calling + system prompt + transcricao audio
- `tts.js` (327 linhas) — 3-tier TTS fallback com output OGG Opus
- `premium-pipeline.js` — orquestracao 8 camadas

### 1.4 WhatsApp via Twilio

| Item | Detalhe |
|------|---------|
| Servico | `/root/Payjarvis/apps/api/src/services/twilio-whatsapp.service.ts` |
| Numero | `whatsapp:+17547145921` |
| Webhook | `POST /webhook/whatsapp` (porta 3001 → Nginx → payjarvis.com) |
| Validacao | `Twilio.validateRequest` com `TWILIO_AUTH_TOKEN` |
| Capabilities | Texto, audio (download + STT + processo + TTS), imagem (vision), documento (PDF via mediaUrl) |
| PM2 | `payjarvis-api` — online, PID 395510 |

### 1.5 Gemini 2.5 Flash

| Item | Detalhe |
|------|---------|
| Backend SOMA ID | Via `emergentintegrations` lib — `LlmChat.with_model("gemini", "gemini-2.5-flash")` |
| API Key | Env var `EMERGENT_LLM_KEY` (nao esta no .env — precisa setar no sistema/pm2) |
| Function calling | NAO configurado com tools nativos Gemini. Backend envia prompts pedindo JSON e parseia |
| PayJarvis | `@google/generative-ai` com function calling nativo (SchemaType) — funcional |
| OpenClaw | `@google/generative-ai` com function calling nativo — funcional, 40+ tools |

**ATENCAO:** O backend do SOMA ID usa `emergentintegrations` (wrapper), nao tem function calling nativo. PayJarvis e OpenClaw usam `@google/generative-ai` com function calling real. Para o chat, preferir o padrao PayJarvis/OpenClaw.

### 1.6 Audio Pipeline (STT/TTS)

| Componente | Local | Status |
|------------|-------|--------|
| STT (Gemini) | `/root/Payjarvis/apps/api/src/services/audio/stt.service.ts` | Funcional — envia audio base64 para Gemini |
| TTS (3-tier) | `/root/Payjarvis/apps/api/src/services/audio/tts.service.ts` | Funcional — Gemini TTS → ElevenLabs → edge-tts |
| Converter | `/root/Payjarvis/apps/api/src/services/audio/converter.service.ts` | Funcional — WAV/OGG via ffmpeg |
| OpenClaw TTS | `/root/openclaw/tts.js` | Funcional — mesma logica 3-tier |
| SOMA ID audio | `components/LiveAssistant.tsx` + `services/liveService.ts` | DESABILITADO — retorna mocks |

**Resumo:** Audio pipeline completo existe no PayJarvis (STT + TTS + converter). O SOMA ID tem frontend stubbed mas backend nao processa audio. Reusar pipeline do PayJarvis.

### 1.7 Servidor HTTP porta 8090

```
python3 -m http.server 8090 --bind 0.0.0.0
Diretorio: /root/projetos/soma-id/tests/sabrina-parkland/
PID: 1102378
```
Serve todos os HTMLs do teste Sabrina + tech/. Nao e persistente (nao esta no PM2).

### 1.8 Nginx

**somaid.12brain.org — CONFIGURADO E ATIVO:**
```
/etc/nginx/sites-enabled/soma-id
- SSL Let's Encrypt
- Frontend: /var/www/soma-id/dist/ (SPA com fallback)
- API: /api/ → proxy para 127.0.0.1:8003
- Max body: 50MB
- HTTP → HTTPS redirect
```

**Backend SOMA ID:** PM2 `soma-id-backend`, PID 2097752, porta 8003, FastAPI, 2 dias uptime, 34mb.

**19 endpoints existentes** no backend FastAPI, incluindo:
- `/api/gemini/analyze-consultation` — analisa texto/imagem/PDF/audio (protegido)
- `/api/gemini/generate-technical-data` — gera dados tecnicos (protegido)
- `/api/gemini/generate-image` — gera imagem via Gemini (protegido)
- `/api/floorplan/analyze` — analisa planta baixa (protegido)
- `/api/floorplan/chat` — chat sobre analise de planta (protegido)
- `/api/briefing/import-from-url` — importa briefing de URL

---

## LEVANTAMENTO 2 — O QUE PRECISA SER CONSTRUIDO

### 2.1 Parser de PDF (texto)

**Status: JA EXISTE (parcial)**

O endpoint `/api/gemini/analyze-consultation` ja aceita `type: 'PDF'` e envia base64 direto para Gemini (suporte nativo multimodal). Nao usa biblioteca de parsing tradicional (pdf-parse, etc.) — confia no Gemini.

**O que falta:**
- Parser que extraia dados estruturados do PDF no formato `01_parsed_briefing.json`
- Validacao dos dados extraidos (campos obrigatorios, unidades, zonas)
- Pipeline que receba PDF → extraia → confirme com usuario → prossiga

**Esforco:** Medio (8-12h) — ja tem a base Gemini, precisa do prompt engenharia + validacao + formato de saida

### 2.2 Parser de Imagem/Croqui (Vision AI)

**Status: JA EXISTE (parcial)**

- `/api/gemini/analyze-consultation` aceita `type: 'IMAGE'`
- `/api/floorplan/analyze` analisa imagens de planta baixa
- Gemini Vision ja integrado no backend

**O que falta:**
- Prompt especializado para croquis de marcenaria (extrair medidas em mm, zonas, posicoes)
- Pipeline que combine dados de croqui + briefing texto em JSON unico
- Validacao cruzada (medidas do croqui vs medidas do texto)

**Esforco:** Medio (6-8h) — infra existe, precisa de prompt engineering especializado

### 2.3 Transcricao de Audio (STT)

**Status: EXISTE NO PAYJARVIS, NAO NO SOMA ID**

PayJarvis tem pipeline completo: `stt.service.ts` → Gemini STT → texto. OpenClaw tem em `gemini.js`.

**O que falta:**
- Copiar/adaptar pipeline do PayJarvis para o backend SOMA ID
- Ou criar rota proxy que use o mesmo servico

**Esforco:** Baixo (2-4h) — copiar, adaptar imports, testar

### 2.4 Orquestrador Chat → Parsing → Engines → Entrega

**Status: NAO EXISTE**

Existe `engineeringService.ts` que orquestra calc → interference → nesting. Mas nao existe:
- Flow conversacional (receber multiplos inputs, perguntar clarificacoes)
- Trigger automatico dos engines apos confirmacao
- Geracao automatica das 8 folhas tecnicas HTML
- Geracao do modelo 3D (CAD engine)
- Empacotamento e entrega dos resultados

**O que precisa:**
1. Chat handler que recebe mensagens e arquivos
2. State machine: AWAITING_BRIEFING → PARSING → CONFIRMING → PROCESSING → DELIVERING
3. Integracao com engines TypeScript (calcEngine, etc.)
4. Trigger do CAD engine Python (subprocess ou API)
5. Gerador de folhas tecnicas HTML (parametrico, nao hardcoded)
6. Empacotador de resultados (links para viewer + folhas + downloads)

**Esforco:** Alto (40-60h) — e o nucleo do produto, conecta tudo

### 2.5 Entrega de Resultado no Chat

**Status: PARCIAL**

- Servidor HTTP na porta 8090 ja serve HTMLs
- Nginx em somaid.12brain.org ja serve frontend
- PayJarvis ja envia PDFs via Twilio mediaUrl

**O que falta:**
- Rota para servir resultados por projeto (ex: `/projects/{id}/tech/folha_01.html`)
- Geracao dinamica de links com token de acesso
- Download de arquivos (STEP, STL, DXF)
- Notificacao no chat quando processamento concluir

**Esforco:** Medio (8-12h)

### 2.6 Persistencia de Projetos

**Status: PARCIAL**

- MongoDB configurado (`soma_id_db` no localhost)
- Supabase configurado (modo simulacao)
- PostgreSQL existente (PayJarvis/OpenClaw)

**O que falta:**
- Schema de projeto no MongoDB: client, briefing, parsed_data, bom, nesting, interference, cad_files, tech_sheets, status, timestamps
- CRUD de projetos via API
- Associacao projeto → historico de chat
- Storage de arquivos gerados (STEP, STL, PDFs, HTMLs)

**Esforco:** Medio (8-12h)

---

## LEVANTAMENTO 3 — REUSO DE INFRA EXISTENTE

### Do PayJarvis

| Componente | Arquivo | Reuso |
|------------|---------|-------|
| WhatsApp Twilio | `twilio-whatsapp.service.ts` | Copiar webhook handler, adaptar para SOMA ID |
| STT (audio→texto) | `audio/stt.service.ts` | Copiar direto, mesmo Gemini |
| TTS (texto→audio) | `audio/tts.service.ts` | Copiar direto, 3-tier fallback |
| Audio converter | `audio/converter.service.ts` | Copiar direto, ffmpeg |
| Gemini function calling | `gemini.ts` | Adaptar pattern SchemaType para tools do SOMA ID |
| Web chat routes | `web-chat.ts` | Modelo para rotas de chat via web |

### Do OpenClaw

| Componente | Arquivo | Reuso |
|------------|---------|-------|
| Grammy bot framework | `bot.js` | Copiar estrutura para bot Telegram SOMA ID |
| Chat memory CRUD | `memory.js` | Adaptar para MongoDB (atualmente PostgreSQL) |
| Gemini + function calling | `gemini.js` | Referencia para 40+ tools pattern |
| TTS 3-tier | `tts.js` | Alternativa ao do PayJarvis |
| Multi-tenant | `gemini.ts` (PayJarvis) | Pattern `bot:${botId}:${chatId}` |

### Do 12Brain / Supabase

| Componente | Uso |
|------------|-----|
| Supabase instance | `eruolbsvomarfxuxchjx.supabase.co` — ja configurada no SOMA ID |
| Storage buckets | Armazenar PDFs, STEP files, imagens renderizadas |
| Row Level Security | Isolamento de dados por empresa/usuario |

---

## LEVANTAMENTO 4 — ESTIMATIVA DE ESFORCO

### Itens a Construir

| # | Item | Complexidade | Horas | Dependencias | Risco |
|---|------|-------------|-------|-------------|-------|
| 1 | Parser PDF → JSON estruturado | Media | 8-12h | Gemini API key funcionando | Prompt pode precisar muitas iteracoes para cobrir todos os formatos de briefing |
| 2 | Parser Croqui (Vision AI) | Media | 6-8h | Item 1 | OCR de escrita a mao em portugues pode ter baixa acuracia |
| 3 | STT no backend SOMA ID | Baixa | 2-4h | Nenhuma | Baixo risco, copiar do PayJarvis |
| 4 | TTS no backend SOMA ID | Baixa | 2-3h | Nenhuma | Baixo risco, copiar do PayJarvis |
| 5 | Schema de projeto MongoDB | Baixa | 4-6h | Nenhuma | Baixo risco |
| 6 | CRUD projetos API | Baixa | 4-6h | Item 5 | Baixo risco |
| 7 | Chat handler + state machine | Alta | 16-20h | Items 1-6 | Complexidade de estados e edge cases |
| 8 | Gemini function calling (tools SOMA ID) | Media | 8-12h | Item 7 | Migrar de emergentintegrations para @google/generative-ai |
| 9 | Gerador parametrico folhas tecnicas | Alta | 20-30h | Items 1, 7 | Cada folha e complexa; precisa ser parametrica, nao hardcoded |
| 10 | Gerador 3D automatico (CAD engine) | Media | 8-12h | Item 9 | build123d funciona mas precisa ser parametrizado para qualquer projeto |
| 11 | Gerador 3D viewer parametrico | Media | 6-8h | Item 10 | Three.js viewer precisa ser parametrico |
| 12 | Servico de entrega (links + downloads) | Media | 8-10h | Items 9-11 | Gerenciar storage e URLs |
| 13 | Frontend chat component (web) | Media | 12-16h | Items 7, 12 | UI/UX precisa ser simples |
| 14 | Bot Telegram (Grammy) | Media | 8-10h | Items 7, 12 | Copiar padrao OpenClaw |
| 15 | Bot WhatsApp (Twilio) | Media | 8-10h | Items 7, 12 | Compartilhar numero ou novo numero |
| 16 | Imagem de encantamento | Media-Alta | 12-20h | Items 10, 11 | Ver Levantamento 5 |
| 17 | Testes E2E do fluxo completo | Media | 8-12h | Tudo acima | Integracao de muitos componentes |

### Resumo

| Categoria | Horas Estimadas |
|-----------|----------------|
| Parsing (PDF + Croqui + Audio) | 16-24h |
| Backend (schema, CRUD, chat, tools) | 32-44h |
| Geracao automatica (folhas + 3D + render) | 46-70h |
| Frontend + bots (web + Telegram + WhatsApp) | 28-36h |
| Testes e integracao | 8-12h |
| **TOTAL** | **130-186h** |

### Caminho Critico

```
Parser PDF → Chat Handler → Gemini Tools → Engines → Gerador Folhas → Entrega
    ↓                                         ↓
  Parser Croqui                          CAD Engine → 3D Viewer
    ↓                                         ↓
  STT/TTS                              Imagem Encantamento
```

**MVP minimo (chat web com PDF → folhas tecnicas):** ~80h
**Produto completo (3 canais + audio + render + folhas + 3D):** ~180h

---

## LEVANTAMENTO 5 — IMAGEM DE ENCANTAMENTO

### O que e
Render fotorrealista do projeto finalizado — o que o cliente ve primeiro. Mostra o closet pronto com iluminacao acolhedora, materiais realistas (madeira, vidro, espelho, cromados), angulo de camera que valoriza o espaco. E o que VENDE o projeto antes de mostrar folhas tecnicas.

### Opcao A — Render Local com Blender (headless)

**Status no VPS:** Blender NAO esta instalado. Nem binario nem bpy (modulo Python).

**Viabilidade de instalar:**
- `apt install blender` — pacote disponivel no Ubuntu, ~200MB
- Blender headless funciona sem GPU: `blender --background --python script.py`
- Cycles CPU render: qualidade alta, tempo 2-5min para cena simples
- Eevee: mais rapido (30-60s) mas precisa de GPU ou software OpenGL (mesa)

**Fluxo:**
1. build123d exporta STEP → converter para OBJ/FBX via build123d ou FreeCAD
2. Blender importa geometria
3. Script Python aplica materiais PBR (madeira, vidro, espelho, metal)
4. Configura iluminacao (HDRI ambiente + spots internos simulando LED 3000K)
5. Camera posicionada em angulo atraente (isometrica suave, leve perspectiva)
6. Render Cycles 1920x1080: ~3-5min CPU
7. Output: PNG/JPG fotorrealista

**Avaliacao:**
| Criterio | Nota |
|----------|------|
| Qualidade visual | 9/10 — Blender Cycles e padrão industria |
| Fidelidade ao projeto | 10/10 — usa geometria real do CAD |
| Tempo de implementacao | 20-30h (instalar + script materiais + camera + HDRI + testes) |
| Tempo por render | 3-5min (CPU), 30s (se instalar mesa-utils para Eevee) |
| Custo por render | $0 (local) |
| Risco | Medio — Blender headless sem GPU pode ter issues com OpenGL |

### Opcao B — API de Render Externo

**Opcoes existentes:**
- **Helio Render / RenderHub:** nao tem API publica para automacao
- **V-Ray Cloud / Corona Cloud:** necessita licenca ($500+/ano), focado em ArchiCAD/3dsMax
- **Avataar / Kaedim:** focado em scan-to-3D, nao em CAD-to-render
- **Three.js Cloud (nao existe):** nao ha servico SaaS que renderize Three.js

**Avaliacao:**
| Criterio | Nota |
|----------|------|
| Qualidade visual | 7-8/10 — depende do servico |
| Fidelidade ao projeto | 7/10 — formato de import pode perder detalhes |
| Tempo de implementacao | 8-12h (se encontrar API viavel) |
| Custo por render | $0.50-5.00 por render |
| Risco | Alto — nenhuma API madura para este caso especifico |

**Conclusao:** Nao ha API de render pronta que aceite STEP/STL e retorne render fotorrealista de moveis. Opcao inviavel a curto prazo.

### Opcao C — IA Generativa (Gemini/DALL-E/Flux)

**Fluxo:**
1. Gerar prompt descritivo do closet a partir dos dados do projeto:
   ```
   "Photorealistic interior render of a luxury walk-in closet in Parkland FL.
   Light wood tone (Lana) custom cabinetry, dark accents (Lord). Center island
   with glass top displaying jewelry. Bag vitrines with LED strips. Full-length
   mirror door. Makeup vanity with backlit mirror. Warm 3000K lighting.
   High-end residential, 5.1m x 3.6m room, 3m ceiling."
   ```
2. Enviar para Gemini Imagen / DALL-E 3 / Flux Pro
3. Receber imagem gerada

**O que ja existe no SOMA ID:**
- Endpoint `/api/gemini/generate-image` — JA IMPLEMENTADO no backend!
- Endpoint `/api/gemini/generate-prompt` — gera prompt de visualizacao arquitetonica (8 presets de estilo)
- Gemini Imagen integrado via `emergentintegrations`

**Avaliacao:**
| Criterio | Nota |
|----------|------|
| Qualidade visual | 8/10 — DALL-E 3 e Gemini Imagen geram imagens impressionantes |
| Fidelidade ao projeto | 4/10 — NAO GARANTE dimensoes corretas, pode inventar detalhes |
| Tempo de implementacao | 4-6h (ja tem base, precisa refinar prompts) |
| Tempo por render | 10-30s |
| Custo por render | $0.04-0.08 (Gemini Imagen) ou $0.04 (DALL-E 3) |
| Risco | Medio — imagem bonita mas pode nao representar o projeto real |

**IMPORTANTE:** Ja existe `/api/gemini/generate-prompt` com 8 presets de estilo (modern_minimalist, warm_contemporary, etc.) e `/api/gemini/generate-image` funcional. Opcao C e a mais rapida de implementar.

### Opcao D — Hibrido (Three.js base + IA refinamento)

**Fluxo:**
1. Three.js viewer renderiza cena com materiais PBR de alta qualidade
2. Puppeteer/Playwright tira screenshot 1920x1080
3. Screenshot enviado como base para IA generativa com prompt:
   ```
   "Enhance this 3D render to photorealistic quality. Maintain exact geometry
   and layout. Add realistic wood grain texture, glass reflections, warm LED
   lighting glow, soft shadows. Make it look like a professional interior
   photography shot."
   ```
4. IA refina mantendo layout correto (img2img / inpainting)

**Avaliacao:**
| Criterio | Nota |
|----------|------|
| Qualidade visual | 8-9/10 — melhor que IA pura, layout correto |
| Fidelidade ao projeto | 8/10 — geometria base e real, IA refina aparencia |
| Tempo de implementacao | 12-16h |
| Tempo por render | 15-45s (screenshot + IA) |
| Custo por render | $0.04-0.08 |
| Risco | Medio — IA pode distorcer detalhes mesmo com base |

### Recomendacao: Estrategia em 2 fases

**FASE 1 (MVP, semana 1-2):** Opcao C — IA Generativa pura
- Ja tem endpoints no backend (`generate-prompt` + `generate-image`)
- 4-6h para refinar prompts especificos de marcenaria
- Resultado visual impressionante para VENDER o projeto
- Disclaimer: "Imagem ilustrativa gerada por IA — medidas reais nas folhas tecnicas"

**FASE 2 (upgrade, semana 4-6):** Opcao D — Hibrido Three.js + IA
- Instalar Blender headless ou melhorar materiais Three.js
- Screenshot automatico do viewer 3D
- IA faz upscale/refinamento fotorrealista
- Fidelidade geometrica real + beleza visual

**FASE 3 (premium, mes 2-3):** Opcao A — Blender full render
- Instalar Blender, criar biblioteca de materiais PBR
- Script Python automatizado: importa STEP → aplica materiais → render Cycles
- Qualidade profissional, fidelidade total
- Oferecer como feature premium (tier Enterprise)

---

## FLUXO COMPLETO DO CHAT (com Imagem de Encantamento)

```
DESIGNER                          SOMA ID
   |                                 |
   |-- Envia briefing PDF ---------->|
   |-- Envia foto croqui ----------->|  ← Gemini Vision parseia
   |-- Envia audio descritivo ------>|  ← Gemini STT transcreve
   |                                 |
   |<-- "Entendi: closet walk-in    |
   |    5.13x3.64m, 5 zonas..."    |
   |<-- "Confirma esses dados?"     |
   |                                 |
   |-- "Sim, confirma" ------------>|
   |                                 |
   |                          [PROCESSAMENTO]
   |                          1. calcEngine → BOM
   |                          2. interferenceEngine → validacao
   |                          3. nestingEngine → plano de corte
   |                          4. CAD engine → STEP/STL
   |                          5. Gerador folhas tecnicas (8x)
   |                          6. 3D viewer parametrico
   |                          7. IMAGEM DE ENCANTAMENTO
   |                                 |
   |<-- [IMAGEM RENDER] 🖼️          |  ← PRIMEIRO: impacto visual
   |    "Aqui esta a visao do       |
   |    seu closet finalizado!"     |
   |                                 |
   |<-- Links:                       |
   |    📐 Folhas tecnicas (8)      |
   |    🎯 Modelo 3D interativo     |
   |    📋 Lista de materiais       |
   |    📥 Download STEP            |
   |    💰 Orcamento: $3,157 USD    |
   |                                 |
   |-- "Aumenta a ilha pra 1.5m" -->|
   |                                 |
   |                          [RECALCULA TUDO]
   |                                 |
   |<-- [NOVA IMAGEM] + links       |
   |    atualizados                  |
```

---

## MATRIZ DE PRIORIDADE

| Prioridade | Item | Justificativa |
|------------|------|---------------|
| P0 | Parser PDF → JSON | Sem isso nao tem input |
| P0 | Chat handler + state machine | Nucleo do fluxo |
| P0 | Gemini function calling | Conecta chat aos engines |
| P1 | Gerador folhas tecnicas parametrico | Entrega principal |
| P1 | Imagem encantamento (Opcao C) | O que vende o projeto |
| P1 | Schema + CRUD projetos | Persistencia |
| P2 | Parser croqui (Vision AI) | Enriquece input |
| P2 | STT/TTS | Conveniencia |
| P2 | CAD engine parametrico | Diferencial tecnico |
| P2 | 3D viewer parametrico | Diferencial visual |
| P3 | Bot Telegram | Canal adicional |
| P3 | Bot WhatsApp | Canal adicional |
| P3 | Frontend chat web | Canal principal |
| P3 | Imagem encantamento (Opcao D/A) | Upgrade qualidade |

---

## RISCOS PRINCIPAIS

1. **Gemini API key** — `EMERGENT_LLM_KEY` nao esta no `.env` do SOMA ID. Se nao estiver setada no ambiente PM2, nenhuma chamada Gemini funciona. Verificar IMEDIATAMENTE.

2. **Engines em TypeScript, CAD em Python** — Orquestrador precisa chamar ambos. Opcoes: subprocess Python do Node, ou API HTTP separada para o CAD engine.

3. **Folhas tecnicas parametricas** — Atualmente as 8 folhas sao SVGs hardcoded para o teste Sabrina. Tornar parametrico (qualquer projeto) e o item de maior esforco.

4. **Tempo de processamento** — Pipeline completo (parse + 3 engines + CAD + 8 folhas + render) pode levar 2-5min. Precisa de job queue assíncrono com notificacao.

5. **Qualidade do parser** — Briefings reais variam muito em formato. O parser precisa ser robusto o suficiente para lidar com variacao. Gemini Vision ajuda, mas precisa de muitos testes com briefings reais.

6. **Blender no VPS** — VPS nao tem GPU. Blender Cycles CPU funciona mas e lento. Para fase premium, considerar render offload para maquina com GPU.

---

## LEVANTAMENTO 6 — FLUXO CONVERSACIONAL COMPLETO DO CHAT

O chat se comporta como um projetista senior: recebe o briefing, analisa, identifica lacunas, pergunta o que falta, confirma tudo, e so entao executa. NAO e um upload-and-go.

---

### FASE 1 — RECEPCAO DO BRIEFING

**Trigger:** Usuario faz upload de arquivos (PDF, fotos, croqui) e/ou envia audio/texto.

**Processamento em background:**
1. PDF → Gemini multimodal extrai texto estruturado
2. Fotos/Croqui → Gemini Vision extrai dimensoes, zonas, posicoes
3. Audio → Gemini STT transcreve para texto
4. Texto livre → NLP extrai entidades (materiais, quantidades, zonas)
5. Merge de todas as fontes em JSON unificado (formato `parsed_briefing.json`)

**Resposta do chat:**
```
"Recebi seus arquivos. Vou analisar e ja te dou um retorno."
[...processamento 10-30s...]
"Entendi que o projeto e um closet walk-in em Parkland, FL, para a
cliente Sabrina, com 5 zonas: Closet Her, Ilha Central, Makeup,
Area Armas e Closet His. Espaco de 5.13m x 3.64m, pe-direito 3.00m."
```

**Complexidade de implementacao:** Media (10-14h)
- Parser multimodal ja existe parcialmente no backend (`analyze-consultation`)
- Precisa: merge de multiplas fontes, formato de saida padronizado, prompt engineering

---

### FASE 2 — VALIDACAO DE DADOS OBRIGATORIOS

O sistema verifica TODOS os dados necessarios contra um checklist minimo. Para cada item, classifica: COMPLETO, PARCIAL, ou FALTANDO.

#### Checklist Minimo

**DADOS DO PROJETO:**
- [ ] Nome do cliente
- [ ] Endereco/cidade
- [ ] Designer responsavel
- [ ] Data de entrega desejada

**DIMENSOES DO ESPACO:**
- [ ] Largura de cada parede (mm)
- [ ] Pe-direito (mm)
- [ ] Posicao e largura de portas
- [ ] Posicao de janelas (se houver)
- [ ] Posicao de pontos eletricos/interruptores
- [ ] Posicao de saidas de ar condicionado
- [ ] Formato do espaco (retangular, irregular, com recortes)

**POR ZONA/MODULO:**
- [ ] Tipo (closet, cozinha, banheiro, escritorio)
- [ ] Funcao de cada area (roupa cabide, roupa dobrada, sapatos, bolsas, etc)
- [ ] Quantidades especificas (quantos pares de sapato, quantas bolsas, etc)
- [ ] Itens especiais (cofre, area armas, steamer, etc)
- [ ] Necessidades de acessibilidade (altura maxima de acesso)

**MATERIAIS E ACABAMENTOS:**
- [ ] Cor/padrao do MDP/MDF principal
- [ ] Cor/padrao secundario (se houver)
- [ ] Tipo de puxador (embutido, externo, perfil)
- [ ] Tipo de pe/rodape
- [ ] Vidro (temperado, fume, transparente, espelhado)
- [ ] Iluminacao (LED fita, LED spot, sensor)
- [ ] Ferragens especiais (soft-close obrigatorio? push-to-open?)

**Complexidade de implementacao:** Baixa (4-6h)
- Checklist e um JSON schema com campos required/optional
- Gemini preenche, sistema valida, identifica lacunas automaticamente

---

### FASE 3 — PERGUNTAS INTELIGENTES

#### REGRA OBRIGATORIA: TRANSPARENCIA SOBRE QUANTIDADE DE PERGUNTAS

Depois de parsear o briefing e identificar o que falta, o chat PRIMEIRO informa quantas perguntas tem ANTES de comecar a perguntar. O usuario NUNCA deve sentir que esta num interrogatorio sem fim.

**Fluxo obrigatorio:**

1. Sistema identifica N lacunas
2. Chat informa o numero ANTES de perguntar:
   - Se 1-3 lacunas: "Tenho so X perguntinhas rapidas pra completar. Posso?"
   - Se 4-7 lacunas: "Tenho X perguntas pra completar o projeto. Posso fazer?"
   - Se 8+ lacunas: "O briefing veio bem resumido, vou precisar de X informacoes. Quer responder agora ou prefere me mandar um audio explicando tudo de uma vez?"
3. Usuario autoriza
4. Chat faz perguntas em blocos de NO MAXIMO 3 por mensagem, agrupadas por tema
5. Depois de cada bloco respondido, informa quantas faltam: "Otimo! Faltam so mais 2."
6. Se usuario envia audio longo que responde varias: "Com seu audio voce ja respondeu 4 das 5. So falta uma!"
7. Quando terminar: "Pronto, era isso! Vou montar o resumo pra voce confirmar."

#### Exemplos de Perguntas por Tema

**Bloco 1 — Dimensoes (se faltando):**
```
"Tenho 5 perguntas pra completar seu projeto. Vou comecar pelas medidas:

1. Vi no croqui que a parede norte mede 3.64m, mas nao consegui ler a
   medida da parede leste. Pode me confirmar?
2. O pe-direito e 3.00m conforme o croqui. Quer aproveitar ate o teto
   ou prefere maleiro com altura limitada?
3. A porta de entrada tem 90cm de largura?"
```

**Bloco 2 — Detalhes (se faltando):**
```
"Otimo! Faltam so mais 2:

4. Voce mencionou sapateira para 30 pares, mas nao especificou se inclui
   botas de cano alto. Tem botas? Quantos pares?
5. As gavetas da ilha: prefere corredica com soft-close ou push-to-open?"
```

#### Regras das Perguntas

| Regra | Descricao |
|-------|-----------|
| Maximo 3 por mensagem | Nao bombardear o usuario |
| Agrupar por tema | Primeiro dimensoes, depois materiais, depois detalhes |
| Transparencia total | Sempre dizer quantas perguntas total e quantas faltam |
| Audio como resposta | Se usuario responder por audio, transcrever e confirmar: "Entendi que voce disse X. Correto?" |
| Foto como resposta | Se usuario mandar foto, usar Vision AI pra interpretar |
| Pular respondidas | Se audio/texto responde varias de uma vez, reconhecer e pular |
| Nunca surpreender | Nunca fazer pergunta sem o usuario saber quantas ainda vem |
| Oferecer audio para muitas | Se 8+ perguntas, oferecer "manda um audio explicando tudo" |

**Complexidade de implementacao:** Media-Alta (12-16h)
- Precisa: logica de gap analysis, gerador de perguntas contextuais, contador de perguntas, agrupador por tema, detector de respostas em audio/texto que cobrem multiplas perguntas
- Gemini function calling: tool `identify_gaps` que retorna lista de lacunas
- Tool `generate_questions` que agrupa por tema e limita a 3 por bloco

---

### FASE 4 — DOUBLE CHECK (CONFIRMACAO)

Quando TODOS os dados estiverem completos, o chat apresenta listagem completa para o designer confirmar.

**Formato da confirmacao:**
```
"Perfeito! Tenho todas as informacoes. Vou listar tudo pra voce confirmar:

PROJETO: Closet Sabrina - Parkland, FL
DESIGNER: Alana (B.Home Concept)
ENTREGA: 04/15/2026
ESPACO: 5.13m x 3.64m, pe-direito 3.00m, formato retangular

ZONAS:
1. Closet Her (3.64m x 3.81m)
   - 3 barras cabide: vestidos longos (1700mm), camisas duplo (1100mm x2)
   - 8 prateleiras roupas dobradas (800x400mm)
   - 6 nichos (400x350mm)
   - Sapateira: 30 sapatos + 6 botas cano alto
   - Vitrines: 15 bolsas, vidro temperado 6mm + LED 3000K
   - Malas: 2 grandes + 2 pequenas, acesso ate 2200mm
   - Nicho vertical: steamer + escada

2. Ilha Central (1200x600mm)
   - Tampo vidro temperado 6mm + divisores veludo (joias, oculos)
   - 5 gavetas: lingerie, pijamas, biquinis, cintos, acessorios
   - Corrediças full extension soft-close 500mm

3. Makeup (1190x500mm)
   - Bancada 750mm altura, espelho 800x1000mm
   - 2x LED 4000K perimetral
   - Passagem minima 800mm vs torre oposta

4. Area Armas (1360x600mm)
   - Porta espelho corpo inteiro com sensor LED
   - 6 prateleiras internas para gun cases
   - 4 dobradicas conceito 110° soft-close

5. Closet His (4030mm total)
   - 2 modulos prateleiras (800mm) + 1 cabide (1200mm) + 1 sapateira (1230mm)

MATERIAIS:
- MDP 18mm Lana (principal) + MDP 18mm Lord (detalhes)
- Vidro temperado 6mm (vitrines, tampo ilha)
- Espelho 4mm (porta armas, makeup)
- LED 3000K (vitrines, armas) + 4000K (makeup)
- Ferragens: dobradicas 35mm soft-close, corrediças telescopicas
- Puxadores: embutidos

Voce confirma tudo isso? Se precisar mudar algo, me diz."
```

**Respostas possiveis:**
- "Confirmo" → Prossegue para Fase 5
- "Muda X pra Y" → Sistema atualiza e reapresenta listagem
- Audio com ajustes → Transcreve, aplica mudancas, reapresenta

**Complexidade de implementacao:** Baixa-Media (6-8h)
- Gerador de resumo formatado a partir do JSON parseado
- Loop de confirmacao ate "confirmo" explicito
- Aplicacao de deltas (ajustes parciais sem refazer tudo)

---

### FASE 5 — EXECUCAO DO PIPELINE

**Trigger:** Usuario confirma dados. Chat responde:
```
"Posso comecar o projeto tecnico completo? Vou gerar planta, elevacoes,
lista de materiais, plano de corte, modelo 3D e imagem de encantamento."
```
Usuario: "Pode comecar"
```
"Perfeito! Estou trabalhando no seu projeto. Te aviso o progresso."
```

#### Progress Updates em Tempo Real

O chat mostra progresso fase por fase com previews visuais:

```
Mensagem 1: "Fase 1/5: Calculando materiais..."
Mensagem 2: "Fase 2/5: 149 pecas identificadas, 15 chapas. Validando constraints..."
```
- Se tiver FAIL: "Encontrei um problema: a ilha central nao cabe com 600mm de folga. Vou sugerir solucao no projeto."
- Se tudo PASS: "Tudo validado! Nenhum conflito fisico."
```
Mensagem 3: "Fase 3/5: Otimizando plano de corte... 78% de aproveitamento"
Mensagem 4: "Fase 4/5: Gerando desenhos tecnicos (8 folhas)..."
Mensagem 5: "Fase 5/5: Gerando imagem de encantamento..."
```

**Pipeline em background (job queue):**
1. calcEngine → BOM (5-10s)
2. interferenceEngine → validacao (2-5s)
3. nestingEngine → plano de corte (5-10s)
4. CAD engine build123d → STEP/STL (10-30s)
5. Gerador folhas tecnicas 8x (30-60s)
6. 3D viewer parametrico (5-10s)
7. Imagem de encantamento via IA (10-30s)
8. Email dossie (2-5s)

**Tempo total estimado:** 1-3 minutos

**Complexidade de implementacao:** Alta (20-25h)
- Job queue assincrono (Bull/BullMQ com Redis, ou simples async com notificacao)
- WebSocket ou SSE para progress updates em tempo real
- Orquestracao sequencial dos engines
- Tratamento de erros em cada etapa (retry, fallback, notificacao)

---

### FASE 5B — EXPERIENCIA DE ENTREGA: CHAT PREVIEW + EMAIL DOSSIE

**REGRA:** O chat e a VITRINE. O email e a ENTREGA. O cliente se encanta no chat e trabalha com o email.

#### O que mostra no CHAT (previews leves)

Quando o pipeline terminar, o chat mostra os highlights visuais:

```
Mensagem 6: [IMAGEM DE ENCANTAMENTO - render JPG comprimido, max 500KB]
"Aqui esta o preview do seu projeto!"

Mensagem 7: [MINIATURA PLANTA BAIXA - PNG pequeno]
"Planta baixa com 5 zonas distribuidas"

Mensagem 8: [MINIATURA NESTING - PNG pequeno]
"Plano de corte: 15 chapas, 149 pecas, 78% aproveitamento"

Mensagem 9: RESUMO RAPIDO:
"Resumo do projeto:
- 5 zonas | 149 pecas | 15 chapas
- Custo materiais: $3,157 USD
- Aproveitamento nesting: 78%
- Constraints: APROVADO (0 conflitos criticos)
- Peso total estimado: ~716 kg

Dossie completo pronto pra enviar. Qual seu email?"
```

**O chat NAO envia:**
- PDFs pesados
- Arquivos STEP/STL
- 8 folhas tecnicas individuais
- Nada que o usuario precise salvar/imprimir do chat

#### Entrega por EMAIL

**Trigger:** Usuario confirma email.

```
Chat: "Vou enviar para priscila@myexxpo.com. Pode ser esse ou prefere outro?"
Usuario: "Pode ser esse"
Chat: "Enviando dossie completo..."
```

**Email enviado:**

| Campo | Conteudo |
|-------|----------|
| De | projetos@somaid.12brain.org |
| Assunto | "SOMA ID - Projeto Sabrina - Closet - Parkland FL" |
| Reply-To | chat@somaid.12brain.org (permite continuar conversa) |

**Corpo do email (template HTML profissional com branding SOMA ID):**
1. Imagem de encantamento INLINE (primeira coisa visivel — nao como anexo)
2. Resumo executivo: area total, zonas, total pecas, custo, aproveitamento nesting
3. Status de interferencia: APROVADO ou REQUER AJUSTE
4. Links online:
   - "Ver projeto em 3D interativo" → link viewer Three.js
   - "Ver folhas tecnicas online" → link index tech/
5. Nota: "Responda este email para solicitar ajustes"

**Anexos:**
- PDF unico consolidado (8 folhas tecnicas num so arquivo, print-ready)
- Arquivo STEP (modelo 3D para CAD profissional)

**Apos envio, chat confirma:**
```
"Email enviado! Verifique sua caixa de entrada. Contem:
- Imagem de encantamento em alta resolucao
- 8 folhas tecnicas em PDF unico
- Modelo 3D (arquivo STEP)
- Links pra viewer online

Quer ajustar algo ou esta aprovado?"
```

**Tratamento de erros:**
- Se email falhar: "Nao consegui enviar pro email X. Pode verificar se esta correto?"
- Se email bounce: "O email X retornou erro. Pode me dar outro?"

**Complexidade de implementacao:** Media (10-14h)
- Template HTML email com branding
- Consolidador de 8 HTMLs em PDF unico (Playwright/Puppeteer → print-to-pdf)
- Servico de email (Nodemailer + SMTP ou Resend/SendGrid API)
- Gerador de links com token de acesso temporario
- Compressor de imagem para preview no chat (sharp ou similar)

---

### FASE 6 — REVISOES CONVERSACIONAIS

**Trigger:** Usuario pede ajuste via chat apos receber entrega.

```
Usuario: "Aumenta a sapateira pra 40 pares"
Chat: "Entendi. Vou recalcular a sapateira de 30 para 40 pares.
       Isso vai precisar de mais 1 prateleira e ~250mm a mais de largura.
       Confirma o ajuste?"
Usuario: "Confirma"
Chat: "Recalculando... [progress updates]"
```

**Regras de revisao:**
- Sistema recalcula APENAS o que mudou (delta, nao refaz tudo do zero)
- Se o ajuste impacta interferencia (ex: sapateira maior pode estrangular passagem), avisa ANTES de executar
- Historico de versoes mantido: v1, v2, v3...
- Cada versao tem seu proprio conjunto de folhas tecnicas
- Email de atualizacao: "Versao 2 do seu projeto - Ajuste: sapateira 40 pares"

**Tipos de ajuste suportados:**
| Ajuste | Impacto | Recalcula |
|--------|---------|-----------|
| Mudar quantidade (sapatos, bolsas) | Dimensoes zona | calc + interference + nesting |
| Mudar material/cor | Visual + custo | calc (precos) + imagem encantamento |
| Mudar dimensao zona | Layout | calc + interference + nesting + CAD |
| Adicionar/remover zona | Layout completo | tudo |
| Mudar ferragem | Custo | calc (precos) |

**Complexidade de implementacao:** Alta (14-18h)
- Delta engine: identificar o que mudou e o que precisa recalcular
- Versionamento de projetos no banco de dados
- Re-execucao parcial do pipeline
- Novo email com versao atualizada

---

### ESTIMATIVA DE ESFORCO — FLUXO CONVERSACIONAL

| Fase | Descricao | Complexidade | Horas |
|------|-----------|-------------|-------|
| Fase 1 | Recepcao e parsing multi-fonte | Media | 10-14h |
| Fase 2 | Validacao checklist obrigatorio | Baixa | 4-6h |
| Fase 3 | Perguntas inteligentes com transparencia | Media-Alta | 12-16h |
| Fase 4 | Double check e confirmacao | Baixa-Media | 6-8h |
| Fase 5 | Execucao pipeline com progress | Alta | 20-25h |
| Fase 5B | Entrega chat preview + email dossie | Media | 10-14h |
| Fase 6 | Revisoes conversacionais | Alta | 14-18h |
| **TOTAL FLUXO CONVERSACIONAL** | | | **76-101h** |

### Impacto na Estimativa Total

A estimativa original (Levantamento 4) era 130-186h. Com o detalhamento do fluxo conversacional:

| Componente | Estimativa Original | Estimativa Revisada |
|------------|--------------------|--------------------|
| Parsing (PDF + Croqui + Audio) | 16-24h | Incluido na Fase 1 |
| Backend (schema, CRUD, chat, tools) | 32-44h | Incluido nas Fases 2-4 |
| Geracao automatica (folhas + 3D + render) | 46-70h | Incluido na Fase 5 |
| Frontend + bots (web + Telegram + WhatsApp) | 28-36h | Mantido (interface do chat) |
| Testes e integracao | 8-12h | Mantido |
| Entrega por email | — | Fase 5B (novo) |
| Revisoes conversacionais | — | Fase 6 (novo) |
| **TOTAL REVISADO** | **130-186h** | **148-210h** |

**MVP revisado (chat web + PDF → folhas + email):** ~100h
**Produto completo (3 canais + audio + render + revisoes):** ~210h

---

### SYSTEM PROMPT DO AGENTE SOMA ID (rascunho)

```
Voce e o assistente de projetos do SOMA ID, uma plataforma de marcenaria
industrial inteligente. Voce atua como um projetista senior de moveis
planejados.

PERSONALIDADE:
- Profissional mas acessivel
- Fala portugues brasileiro (clientes sao brasileiros em South Florida)
- Usa linguagem tecnica de marcenaria quando necessario
- Nunca inventa dados — sempre pergunta quando nao sabe
- Sempre confirma antes de executar

FLUXO:
1. Receba briefing (PDF, fotos, audio, texto)
2. Parse e apresente resumo do que entendeu
3. Identifique lacunas e informe quantas perguntas tem ANTES de perguntar
4. Faca perguntas em blocos de 3, agrupadas por tema
5. Quando completo, apresente double check para confirmacao
6. Apos confirmacao, execute pipeline e mostre progresso
7. Entregue: imagem de encantamento no chat, dossie por email
8. Aceite revisoes conversacionais

REGRAS:
- NUNCA comece a processar sem confirmacao explicita do usuario
- NUNCA faca mais de 3 perguntas por mensagem
- SEMPRE diga quantas perguntas faltam
- SEMPRE valide medidas contra regras ergonomicas (CLAUDE.md)
- Se detectar conflito fisico, avise ANTES de prosseguir
- Imagem de encantamento SEMPRE vem primeiro na entrega
- Email e a entrega principal, chat e preview

TOOLS DISPONIVEIS:
- parse_briefing(pdf/image/audio) → parsed_briefing.json
- validate_checklist(parsed_data) → gaps[]
- run_calc_engine(parsed_data) → bom.json
- run_interference_engine(bom, constraints) → conflicts[]
- run_nesting_engine(bom) → nesting.json
- run_cad_engine(parsed_data, bom) → step, stl, manifest
- generate_tech_sheets(all_data) → 8x html
- generate_enchantment_image(parsed_data) → image_url
- generate_3d_viewer(manifest) → viewer_url
- send_email_dossier(email, project) → sent/failed
```
