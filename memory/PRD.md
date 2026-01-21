# SOMA-ID PRD - Product Requirements Document

## Descrição do Projeto
SOMA-ID é uma aplicação de marcenaria industrial que usa IA (Google Gemini) para:
- Analisar briefings de projetos (texto, áudio, imagem, PDF)
- Analisar plantas baixas arquitetônicas e identificar oportunidades de marcenaria
- Gerar renders 3D/Digital Twins de ambientes
- Produzir dados técnicos para fabricação CNC

## Stack Tecnológica
- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI**: Google Gemini (texto/visão) + Gemini Nano Banana (geração de imagens)
- **Auth**: Supabase
- **i18n**: PT, EN, ES

## Arquitetura
```
/app
├── backend/               # FastAPI Backend
│   ├── .env               # MONGO_URL, GEMINI_API_KEY, EMERGENT_LLM_KEY
│   ├── requirements.txt
│   └── server.py          # Main API endpoints
├── components/            # React Components
├── context/               # React Contexts (Auth, Project, Translation)
├── services/              # Frontend API services
├── tests/                 # Backend tests
└── test_reports/          # Test results
```

## Funcionalidades Implementadas

### ✅ Concluído
1. **Análise de Briefing** - IA extrai dados de texto/áudio/imagem/PDF
2. **Analisador de Planta Baixa** - Identifica cômodos e sugere marcenaria (agora com suporte a PDF)
3. **Chat com IA** - Conversa sobre análise de planta baixa
4. **Geração de Imagem** - Renders 3D com Gemini Nano Banana (CORRIGIDO)
5. **Dados Técnicos** - Gera dados para CNC
6. **Sistema i18n** - Suporte completo PT/EN/ES
7. **Página de Login Traduzida** - AuthPage.tsx com i18n (CORRIGIDO)
8. **Campos Editáveis** - BriefingReview.tsx já tem campos editáveis
9. **Campo de Descrição Adicional** - Usuário pode adicionar contexto para ajudar a IA (21/01/2026)
10. **Apresentação de Projeto Estilo Promob** - Documento profissional com resumo, medidas, materiais, render (21/01/2026)
11. **QR Code para Compartilhamento** - Cliente pode visualizar/aprovar projeto via link ou QR Code (21/01/2026)
12. **Suporte a PDF para Plantas Baixas** - Upload e análise de plantas baixas em formato PDF (NOVO - 21/01/2026)
13. **Briefing Estruturado** - Formulário de cotação estilo americano com áreas, materiais, ferragens, componentes (NOVO - 21/01/2026)

### 🟡 Mocked/Limitado
- `liveService.ts` - Áudio em tempo real é mock
- `materialService.ts` - Usa fallback quando Supabase indisponível
- Tabelas Supabase (`modules`, `catalog`) - Não populadas

### 🔴 Pendente/Futuro
1. Implementar WebSockets para áudio real-time
2. Histórico de análises
3. Migrar de `google.generativeai` para `google.genai`
4. Criar página pública `/projeto/:id` para clientes visualizarem

## Endpoints da API

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/` | GET | Health check |
| `/api/gemini/health` | GET | Status da API Gemini |
| `/api/gemini/analyze-consultation` | POST | Analisa briefing (agora com userDescription) |
| `/api/gemini/generate-prompt` | POST | Gera prompt para render |
| `/api/gemini/generate-image` | POST | Gera imagem (Nano Banana) |
| `/api/gemini/generate-technical-data` | POST | Dados técnicos CNC |
| `/api/floorplan/analyze` | POST | Analisa planta baixa |
| `/api/floorplan/chat` | POST | Chat sobre planta |
| `/api/floorplan/select-room` | POST | Seleciona cômodo |

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
REACT_APP_BACKEND_URL=https://xxx.preview.emergentagent.com
```

## Última Atualização: 21/01/2026
- Corrigido bug de geração de imagem congelando
- Integrado Gemini Nano Banana via emergentintegrations
- Traduzida página de login (AuthPage.tsx)
- Adicionado campo de descrição adicional para upload de imagens
- Implementada apresentação de projeto estilo Promob (documento profissional)
- Adicionado QR Code para compartilhamento com cliente
- Seção de aprovação com campos para assinatura
- Adicionado suporte a PDF para plantas baixas
- Todos os testes passando (11/11 backend, frontend OK)
