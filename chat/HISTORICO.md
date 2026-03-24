# HISTORICO — SOMA ID Chat

## 2026-03-24 (v2) — Fix Planta Baixa + Interior Details + Briefing Questions

### O que foi feito

**FRENTE B — Briefing Interpreter (Problema 6):**
- Fix critico em `questions.ts`: `generateQuestions()` agora envia briefing COMPLETO ao Gemini (dimensoes reais, itens, materiais) em vez de apenas contagens. Impede Gemini de perguntar sobre dados ja extraidos pelo interpreter.
- Prompt atualizado com regra #6 (verificar valores reais antes de perguntar) e #8 (confiar gaps do interpreter).
- `checklist.ts`: zones_dimensions exclui zonas freestanding/master bath que nao precisam de dimensoes explicitas.

**FRENTE A — Visual Report (Problemas 1-5):**
- Planta baixa: zonas agora posicionadas nas paredes corretas (north/south/east/west) baseado no campo `wall` do briefing. Ilha Central no centro com indicador de folga 600mm. Figura humana adicionada.
- Elevacoes: fills clareados (#FAFAFA vs #E8E8E8), detalhes interiores visiveis — cabideiro com V-hangers, sapateira com prateleiras inclinadas + silhuetas de sapatos, vitrine com vidro tracejado + LED amarelo, armas com hachura diagonal de espelho, gavetas com puxadores.
- Texto duplicado: labels genéricos movidos para base do módulo, dimensões abaixo do módulo.
- Pés reguláveis: já estavam com preço $5/set (sessão anterior).

### Estado atual
- PM2 `soma-id-chat` rodando na porta 8091
- Report tecnico com 11 pranchas, visual profissional
- Sessao de teste: sess_mn4ybt2t_b3xafe (Sabrina Parkland)

### Pontos de atencao
- Zonas na planta baixa dependem do campo `wall` estar preenchido no briefing. Se ausente, fallback para north.
- Sandbox em `/root/sandbox/soma-id_20260324_v2/` — manter até confirmar estabilidade.

---

## 2026-03-24 — Upgrade Briefing Interpreter + Fix Visuais Report

### O que foi feito

**FRENTE B — Briefing Interpreter (Problema 8):**
- Reescrita completa do prompt do Claude Sonnet para cross-referencing entre documentos
- Schema de output expandido com `gaps[]` estruturados (field, description, priority, category)
- Fix do bug principal: após merge de documentos complementares (`/session/:id/add-documents`), os `question_blocks` agora são regenerados com base nos gaps ATUALIZADOS — antes o Gemini perguntava coisas que o croqui já tinha respondido
- ParsedBriefing expandido: `wall`, `position`, `priority_rule`, `segments`, `color_assignments`, `cross_reference_notes`

**FRENTE A — Visual Report (Problemas 1-7):**
- Deploy do código de interior rendering que já existia no disco mas não estava compilado no PM2
- Confirmado via Playwright: cabideiro com barra+cabides, sapateira inclinada 15°, vitrine com vidro tracejado+LED, armas com prateleiras+LED+cases, gavetas com puxadores, maleiro com silhuetas de mala, vanity com espelho+bancada

### Estado atual
- PM2 `soma-id-chat` rodando na porta 8091
- Report técnico com 13 pranchas numeradas corretamente
- Pés reguláveis com preço no orçamento ($5.00/set x4)
- Planta baixa com zonas distribuídas nas paredes corretas
- Elevações com detalhes internos profissionais

### Integracoes ativas
- Claude Sonnet API (Anthropic): briefing interpreter + merge
- Gemini 2.5 Flash: perguntas, STT, extração de briefing (fallback)
- Supabase: catálogo de materiais
- MongoDB local: sessions (agent-mongodb container)

### Pontos de atencao
- Documentos de teste (Sabrina Parkland) não estão em `/mnt/user-data/uploads/` — testar com uploads reais
- USE_CLAUDE_INTERPRETER env var deve estar `true` para usar o interpreter
- Sandbox em `/root/sandbox/soma-id_20260324/` pode ser deletado após confirmação
