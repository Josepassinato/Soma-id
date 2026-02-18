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
- **Database**: MongoDB (projetos) + Supabase (auth + catálogo)
- **AI**: Gemini 2.5 Flash via Emergent LLM Key (`emergentintegrations`)
- **Auth**: Supabase
- **i18n**: PT, EN, ES

## Arquitetura
```
/app
├── backend/               # FastAPI Backend
│   ├── .env               # MONGO_URL, EMERGENT_LLM_KEY
│   ├── requirements.txt
│   └── server.py          # Main API endpoints
├── components/            # React Components
├── context/               # React Contexts (Auth, Project, Translation)
├── services/              # Frontend API services
│   ├── dxfService.ts      # Geração de DXF industrial (v0.1)
│   ├── layoutService.ts   # Geração de SVG de layout
│   ├── supabaseClient.ts  # Cliente Supabase
│   └── ...
├── docs/                  # Documentação técnica
├── pricing_data.ts        # Dados de custos e complexidade
├── config.ts              # Configuração
└── test_reports/          # Test results
```

## Funcionalidades Implementadas

### ✅ Core Features
1. **Análise de Briefing** - IA extrai dados de texto/áudio/imagem/PDF
2. **Analisador de Planta Baixa** - Identifica cômodos e sugere marcenaria (PDF suportado)
3. **Chat com IA** - Conversa sobre análise de planta baixa
4. **Geração de Imagem** - Renders 3D com Emergent Integration (Nano Banana)
5. **Dados Técnicos** - Gera dados para CNC
6. **Sistema i18n** - Suporte completo PT/EN/ES
7. **Campos Editáveis** - BriefingReview.tsx com campos editáveis
8. **Campo de Descrição Adicional** - Contexto extra para IA
9. **Apresentação de Projeto** - Documento profissional estilo Promob
10. **QR Code para Compartilhamento** - Cliente visualiza/aprova via link
11. **Briefing Estruturado** - Formulário multi-step de cotação
12. **Importação via URL** - IA extrai dados de documentos online
13. **Múltiplos Projetos por Ambiente** - Cria projetos separados por área

### ✅ Atualizações 18/02/2026
14. **Inventário Melhorado** - DXF Service v0.1, Layout Service, Pricing Data
15. **Credenciais Supabase Corrigidas** - Usando Anon Key JWT correta
16. **Gemini via Emergent LLM Key** - Todas as chamadas IA funcionando
17. **SDK Atualizado** - Usando `emergentintegrations` para Gemini

### 🟢 Sistema de Áudio
- **Gravação**: Usuário grava áudio → envia para análise
- **Status**: Funcionando (não usa WebSockets)

### 🟡 Mocked/Limitado
- Tabelas Supabase (`modules`, `materials`) - Usando fallback local

### 🔴 Futuro/Backlog
1. Popular tabelas Supabase com dados de produção
2. Histórico de análises do usuário
3. Página pública `/projeto/:id` para clientes

## Variáveis de Ambiente

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=soma_id_db
EMERGENT_LLM_KEY=sk-emergent-xxx
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=https://floor-plan-ai-1.preview.emergentagent.com
VITE_SUPABASE_URL=https://eruolbsvomarfxuxchjx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Endpoints da API

| Endpoint | Método | Status |
|----------|--------|--------|
| `/health` | GET | ✅ |
| `/api/gemini/health` | GET | ✅ |
| `/api/gemini/analyze-consultation` | POST | ✅ |
| `/api/gemini/generate-prompt` | POST | ✅ |
| `/api/gemini/generate-image` | POST | ✅ |
| `/api/gemini/generate-technical-data` | POST | ✅ |
| `/api/floorplan/analyze` | POST | ✅ |
| `/api/floorplan/chat` | POST | ✅ |
| `/api/floorplan/select-room` | POST | ✅ |
| `/api/briefing/import-from-url` | POST | ✅ |
| `/api/catalog/modules` | GET | ✅ |
| `/api/catalog/materials` | GET | ✅ |

## Última Atualização: 18/02/2026
- ✅ Gemini funcionando via Emergent LLM Key
- ✅ Supabase conectado com credenciais corretas
- ✅ Sistema de áudio mantido (gravação → análise)
- ✅ Inventário melhorado integrado do GitHub
