# SOMA-ID PRD - Product Requirements Document

## Descrição do Projeto
SOMA-ID é uma aplicação de marcenaria industrial que usa IA (Google Gemini) para:
- Analisar briefings de projetos (texto, áudio, imagem, PDF)
- Analisar plantas baixas arquitetônicas e identificar oportunidades de marcenaria
- Gerar renders 3D/Digital Twins de ambientes
- Produzir dados técnicos para fabricação CNC
- Gerenciar orçamentos e contratos com rastreabilidade

## Stack Tecnológica
- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI**: Google Gemini SDK (`google-genai`) + Emergent Integration (geração de imagens)
- **Auth**: Supabase (variáveis de ambiente obrigatórias)
- **i18n**: PT, EN, ES

## Arquitetura
```
/app
├── backend/               # FastAPI Backend
│   ├── .env               # MONGO_URL, GEMINI_API_KEY, EMERGENT_LLM_KEY
│   ├── requirements.txt
│   └── server.py          # Main API endpoints (usa google-genai SDK)
├── components/            # React Components
├── context/               # React Contexts (Auth, Project, Translation)
├── services/              # Frontend API services
│   ├── dxfService.ts      # Geração de DXF industrial (v0.1)
│   ├── layoutService.ts   # Geração de SVG de layout
│   └── ...
├── docs/                  # Documentação técnica
│   ├── DXF_CONTRACT_v0.1.md
│   └── SOMA-ID_PRD_Fase_2_Projeto_Tecnico.md
├── pricing_data.ts        # Dados de custos e complexidade
├── config.ts              # Configuração (Supabase via env vars apenas)
├── tests/                 # Backend tests
└── test_reports/          # Test results
```

## Funcionalidades Implementadas

### ✅ Concluído
1. **Análise de Briefing** - IA extrai dados de texto/áudio/imagem/PDF
2. **Analisador de Planta Baixa** - Identifica cômodos e sugere marcenaria (com suporte a PDF)
3. **Chat com IA** - Conversa sobre análise de planta baixa
4. **Geração de Imagem** - Renders 3D com Emergent Integration
5. **Dados Técnicos** - Gera dados para CNC
6. **Sistema i18n** - Suporte completo PT/EN/ES
7. **Página de Login Traduzida** - AuthPage.tsx com i18n
8. **Campos Editáveis** - BriefingReview.tsx com campos editáveis
9. **Campo de Descrição Adicional** - Usuário pode adicionar contexto para ajudar a IA
10. **Apresentação de Projeto Estilo Promob** - Documento profissional com resumo, medidas, materiais, render
11. **QR Code para Compartilhamento** - Cliente pode visualizar/aprovar projeto via link ou QR Code
12. **Suporte a PDF para Plantas Baixas** - Upload e análise de plantas baixas em formato PDF
13. **Briefing Estruturado** - Formulário de cotação com áreas, materiais, ferragens, componentes
14. **Importação Automática de Briefing via URL** - Cole link do documento e a IA extrai especificações

### ✅ Corrigido em 18/02/2026
15. **Credenciais Supabase** - Removidas credenciais hardcoded de config.ts (usa apenas variáveis de ambiente)
16. **SDK Gemini Migrado** - Migrado de `google.generativeai` (deprecated) para `google-genai`
17. **Criação de Múltiplos Projetos** - Implementada funcionalidade completa para criar projetos separados por ambiente

### ✅ Inventário Melhorado (18/02/2026)
18. **DXF Service Industrial v0.1** - Geração de DXF compatível com Promob/CAM
    - `generatePartDxf()` - Exporta peça individual com metadados
    - `generateNestingDxf()` - Exporta plano de corte completo
    - Lint automático para validação de qualidade
    - Suporte a furos horizontais (DRILL_H) e verticais (DRILL_V)
19. **Layout Service** - Geração de layouts SVG para visualização
20. **Pricing Data** - Sistema de custos configurável

### 🟡 Mocked/Limitado
- `liveService.ts` - Áudio em tempo real é mock
- `materialService.ts` - Usa fallback quando Supabase indisponível
- Tabelas Supabase (`modules`, `catalog`) - Não populadas

### 🔴 Pendente/Futuro
1. Implementar WebSockets para áudio real-time
2. Histórico de análises
3. Criar página pública `/projeto/:id` para clientes visualizarem
4. Popular tabelas Supabase (`modules`, `catalog`)

## Endpoints da API

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/` | GET | Health check |
| `/health` | GET | Health check raiz (Kubernetes) |
| `/api/gemini/health` | GET | Status da API Gemini |
| `/api/gemini/analyze-consultation` | POST | Analisa briefing |
| `/api/gemini/generate-prompt` | POST | Gera prompt para render |
| `/api/gemini/generate-image` | POST | Gera imagem (Emergent) |
| `/api/gemini/generate-technical-data` | POST | Dados técnicos CNC |
| `/api/floorplan/analyze` | POST | Analisa planta baixa |
| `/api/floorplan/chat` | POST | Chat sobre planta |
| `/api/floorplan/select-room` | POST | Seleciona cômodo |
| `/api/briefing/import-from-url` | POST | Importa briefing de URLs |

## Variáveis de Ambiente

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=soma_id_db
GEMINI_API_KEY=xxx
EMERGENT_LLM_KEY=sk-emergent-xxx
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=https://floor-plan-ai-1.preview.emergentagent.com
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

## Última Atualização: 18/02/2026
- ✅ Removidas credenciais Supabase hardcoded de config.ts
- ✅ Migrado SDK de `google.generativeai` para `google-genai` (novo SDK oficial)
- ✅ Implementada criação de múltiplos projetos por ambiente
- ✅ Integrado inventário melhorado do GitHub (DXF, Layout, Pricing)
- ✅ Documentação técnica atualizada
