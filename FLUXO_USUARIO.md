# SOMA-ID - Fluxo de Processamento do Usuário

## 📋 Visão Geral

O SOMA-ID é um sistema de marcenaria industrial que utiliza Inteligência Artificial (Gemini 2.5 Flash) para converter briefings de clientes em projetos técnicos completos com renders, plantas e lista de cortes para fábrica.

---

## 🗺️ JORNADA COMPLETA DO USUÁRIO

### **FASE 1: ACESSO AO SISTEMA**

```
┌─────────────────────────────────────────────────────────────┐
│                    LANDING PAGE                              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            SOMA-ID INDUSTRIAL ENGINE                  │   │
│  │                                                       │   │
│  │     [🚀 INICIAR OPERAÇÃO]                            │   │
│  │                                                       │   │
│  │     Seletor de Idioma: [PT] [EN] [ES]                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Passo 1.1:** Usuário acessa a página inicial
**Passo 1.2:** Seleciona o idioma desejado (PT/EN/ES)
**Passo 1.3:** Clica em "INICIAR OPERAÇÃO"

---

### **FASE 2: AUTENTICAÇÃO**

```
┌─────────────────────────────────────────────────────────────┐
│                    TELA DE LOGIN                             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  📧 Email: _________________________                  │   │
│  │  🔒 Senha: _________________________                  │   │
│  │                                                       │   │
│  │  [ENTRAR]        [REGISTRAR]                         │   │
│  │                                                       │   │
│  │  ─────────── ou ───────────                          │   │
│  │                                                       │   │
│  │  [🧪 ACESSO SANDBOX (Modo Demonstração)]             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Passo 2.1:** Login com email/senha (Supabase Auth)
**Passo 2.2:** OU registro de nova conta
**Passo 2.3:** OU acesso como convidado (Sandbox)

---

### **FASE 3: DASHBOARD DE PROJETOS**

```
┌─────────────────────────────────────────────────────────────┐
│  SOMA-ID │ Dashboard                    [Tokens: 1000] [Sair]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [+ NOVO ATENDIMENTO]              [⚙️ AUDITORIA]           │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  PROJETOS RECENTES                                   │    │
│  │                                                      │    │
│  │  📁 Cliente Maria - Cozinha      [RASCUNHO]         │    │
│  │  📁 Cliente João - Closet        [APROVADO]         │    │
│  │  📁 Cliente Ana - Quarto         [PROCESSANDO]      │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**Passo 3.1:** Visualiza projetos existentes
**Passo 3.2:** Verifica saldo de tokens
**Passo 3.3:** Clica em "+ NOVO ATENDIMENTO" para criar projeto

---

### **FASE 4: CAPTURA DE BRIEFING (5 Métodos)**

```
┌─────────────────────────────────────────────────────────────┐
│  NOVO ATENDIMENTO SOMA-ID                                    │
│  :: CAPTURA MULTIMODAL DE BRIEFING ::                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [🎙️ ÁUDIO LIVE] [📸 FOTO] [📐 PLANTA BAIXA] [📤 ÁUDIO] [📄 PDF]│
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │              (Área de captura/upload)                │    │
│  │                                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  [VOLTAR]                        [ANALISAR BRIEFING →]      │
└─────────────────────────────────────────────────────────────┘
```

#### **Método 4.1: Áudio Live**
```
Passo 4.1.1: Clica no botão de gravação
Passo 4.1.2: Grava conversa com o cliente (briefing verbal)
Passo 4.1.3: Para a gravação
Passo 4.1.4: Clica em "ANALISAR BRIEFING"
```

#### **Método 4.2: Foto/Upload**
```
Passo 4.2.1: Clica na área de upload
Passo 4.2.2: Seleciona foto do ambiente ou tira foto com câmera
Passo 4.2.3: Clica em "ANALISAR BRIEFING"
```

#### **Método 4.3: Planta Baixa (NOVO!)**
```
Passo 4.3.1: Seleciona aba "PLANTA BAIXA"
Passo 4.3.2: Faz upload da planta arquitetônica
Passo 4.3.3: Clica em "ANALISAR PLANTA"
Passo 4.3.4: IA extrai todos os cômodos automaticamente
Passo 4.3.5: Responde dúvidas da IA via chat (se houver)
Passo 4.3.6: Seleciona cômodo para criar projeto
Passo 4.3.7: Clica em "CRIAR PROJETO"
```

#### **Método 4.4: Upload de Áudio**
```
Passo 4.4.1: Seleciona aba "ÁUDIO"
Passo 4.4.2: Faz upload de arquivo MP3/WAV/M4A
Passo 4.4.3: Clica em "ANALISAR BRIEFING"
```

#### **Método 4.5: Upload de PDF**
```
Passo 4.5.1: Seleciona aba "PDF"
Passo 4.5.2: Faz upload de documento de briefing
Passo 4.5.3: Clica em "ANALISAR BRIEFING"
```

---

### **FASE 5: ANÁLISE DE IA (Automática)**

```
┌─────────────────────────────────────────────────────────────┐
│                  IA PROCESSANDO...                           │
│                                                              │
│                    ⏳                                        │
│                                                              │
│            "Extraindo informações do briefing..."            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**O que a IA extrai automaticamente:**
- ✅ Nome do cliente
- ✅ Tipo de ambiente (Cozinha, Quarto, Closet, etc.)
- ✅ Medidas (largura, altura, profundidade)
- ✅ Estilo desejado
- ✅ Materiais sugeridos
- ✅ Briefing técnico detalhado
- ✅ Tipo de instalação (Piso ou Suspenso)

---

### **FASE 6: REVISÃO DO BRIEFING**

```
┌─────────────────────────────────────────────────────────────┐
│  REVISÃO DE BRIEFING                                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  👤 Cliente: Maria Silva          [Editar]                  │
│  🏠 Ambiente: Cozinha             [Editar]                  │
│  📏 Largura: 4000mm               [Editar]                  │
│  📐 Altura: 2700mm                [Editar]                  │
│  🎨 Estilo: Moderno Orgânico      [Editar]                  │
│                                                              │
│  📝 Briefing Técnico:                                       │
│  "Cozinha moderna com ilha central, armários até o teto..." │
│                                                              │
│  🪵 Materiais Sugeridos:                                    │
│  • Madeira Nogueira Americana                               │
│  • Quartzito Patagonia                                      │
│  • Inox Escovado                                            │
│                                                              │
│  [VOLTAR]                    [CONFIRMAR E CONTINUAR →]      │
└─────────────────────────────────────────────────────────────┘
```

**Passo 6.1:** Revisa dados extraídos pela IA
**Passo 6.2:** Edita campos se necessário
**Passo 6.3:** Confirma e continua

---

### **FASE 7: CONFIGURAÇÃO DO PROJETO**

```
┌─────────────────────────────────────────────────────────────┐
│  CONFIGURAÇÃO DO PROJETO                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🎨 ESTILO VISUAL:                                          │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐               │
│  │Moderno │ │Japandi │ │Coastal │ │Luxury  │               │
│  │Orgânico│ │  Zen   │ │Hamptons│ │ Noir   │               │
│  └────────┘ └────────┘ └────────┘ └────────┘               │
│                                                              │
│  🪵 MATERIAL/TEXTURA:                                       │
│  [📷 Upload foto do material]                               │
│                                                              │
│  🎨 PALETA DE MATERIAIS:                                    │
│  [Selecionar materiais do catálogo]                         │
│                                                              │
│  [ABORTAR]              [CRIAR PROJETO E GERAR RENDER →]    │
└─────────────────────────────────────────────────────────────┘
```

**Passo 7.1:** Seleciona estilo visual (8 opções 2025)
**Passo 7.2:** Faz upload de foto de material/textura (opcional)
**Passo 7.3:** Seleciona materiais do catálogo
**Passo 7.4:** Clica em "CRIAR PROJETO E GERAR RENDER"

---

### **FASE 8: GERAÇÃO DE IA (Digital Twin)**

```
┌─────────────────────────────────────────────────────────────┐
│  MÓDULO DE ENCANTAMENTO                                      │
│  :: GERANDO DIGITAL TWIN ::                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Status: PROCESSANDO → RENDERIZANDO → APROVAÇÃO_VISUAL      │
│  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 35%              │
│                                                              │
│  ⏳ Gerando prompt arquitetônico...                         │
│  ⏳ IA processando Digital Twin 4K...                       │
│  ⏳ Sincronizando ativos na nuvem...                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Processamento automático:**
1. Gera prompt arquitetônico otimizado
2. Cria descrição detalhada do render
3. Salva imagens na nuvem (Supabase Storage)

---

### **FASE 9: VISUALIZAÇÃO DO PROJETO**

```
┌─────────────────────────────────────────────────────────────┐
│  PROJETO: Maria Silva - Cozinha                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Visual & Encantamento] [Engenharia] [Industrial]          │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │              [RENDER 4K DO PROJETO]                  │    │
│  │                                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  📏 Medidas: 4000mm x 2700mm x 600mm                        │
│  🎨 Estilo: Moderno Orgânico 2025                           │
│  🪵 Material: Nogueira Americana                            │
│                                                              │
│  [VOLTAR]  [APROVAR VISUAL]  [FINALIZAR ENGENHARIA →]       │
└─────────────────────────────────────────────────────────────┘
```

**Passo 9.1:** Visualiza render gerado
**Passo 9.2:** Revisa especificações
**Passo 9.3:** Aprova visual OU solicita alterações
**Passo 9.4:** Avança para engenharia

---

### **FASE 10: ENGENHARIA DE FÁBRICA (Roadmap)**

```
┌─────────────────────────────────────────────────────────────┐
│  ENGENHARIA INDUSTRIAL                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📋 LISTA DE CORTES:                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Peça          │ Largura │ Altura │ Qtd │ Material    │   │
│  │ Porta Alta    │ 450mm   │ 2100mm │ 4   │ Nogueira   │   │
│  │ Gaveta Frente │ 600mm   │ 180mm  │ 6   │ Nogueira   │   │
│  │ Lateral Base  │ 580mm   │ 720mm  │ 4   │ MDF Branco │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  📊 Eficiência: 94%                                         │
│  📦 Chapas: 3 unidades                                      │
│  🔧 Total Peças: 47                                         │
│                                                              │
│  [DOWNLOAD DXF/CNC]    [EXPORTAR CORTECLOUD]                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 FLUXO DE PLANTA BAIXA (Detalhado)

```
┌─────────────────────────────────────────────────────────────┐
│                   ANALISADOR DE PLANTA BAIXA                 │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  1. UPLOAD                                                   │
│     • Usuário faz upload da planta (JPG/PNG/PDF)            │
│     • Sistema exibe preview da imagem                        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  2. ANÁLISE IA (Gemini 2.5 Flash)                           │
│     • Extrai todos os cômodos                                │
│     • Identifica dimensões                                   │
│     • Detecta oportunidades de marcenaria                   │
│     • Gera perguntas se houver dúvidas                      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  3. RESULTADOS                                               │
│     • Mostra: X Quartos | Y Banheiros | Z Cômodos           │
│     • Lista todos os cômodos com dimensões                  │
│     • Destaca oportunidades de marcenaria por cômodo        │
└─────────────────────────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│  4A. CHAT COM IA        │   │  4B. SELEÇÃO DIRETA     │
│  • Responde dúvidas     │   │  • Clica no cômodo      │
│  • Esclarece medidas    │   │  • Seleciona tipo de    │
│  • Sugere materiais     │   │    marcenaria           │
└─────────────────────────┘   └─────────────────────────┘
              │                         │
              └────────────┬────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  5. GERAÇÃO DO PROJETO                                       │
│     • IA converte dados da planta em briefing SOMA-ID       │
│     • Cria projeto automaticamente                          │
│     • Redireciona para Fase 7 (Configuração)                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 CUSTOS DE TOKENS

| Operação | Custo |
|----------|-------|
| Análise de Briefing | 10 tokens |
| Geração de Render (Encantamento) | 50 tokens |
| Engenharia de Fábrica | 30 tokens |
| Análise de Planta Baixa | 20 tokens |

---

## 🔧 ENDPOINTS DA API

| Endpoint | Função |
|----------|--------|
| `POST /api/gemini/analyze-consultation` | Analisa briefing |
| `POST /api/gemini/generate-prompt` | Gera prompt de render |
| `POST /api/gemini/generate-technical-data` | Dados técnicos |
| `POST /api/floorplan/analyze` | Analisa planta baixa |
| `POST /api/floorplan/chat` | Chat sobre planta |
| `POST /api/floorplan/select-room` | Seleciona cômodo |

---

## 🌐 IDIOMAS SUPORTADOS

- 🇧🇷 **Português (PT)** - Padrão
- 🇺🇸 **Inglês (EN)**
- 🇪🇸 **Espanhol (ES)**

A IA responde automaticamente no idioma selecionado pelo usuário.

---

*SOMA-ID Industrial Engine v2.5 - Powered by Gemini 2.5 Flash*
