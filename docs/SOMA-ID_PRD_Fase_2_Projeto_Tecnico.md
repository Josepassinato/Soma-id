# PRD (Product Requirements Document) – SOMA-ID Fase 2: Projeto Técnico Industrial

## 🎯 1. Contexto e Gate de Entrada

Este documento define os requisitos e o fluxo da Fase 2 do SOMA-ID, focando na transição de um projeto comercialmente aprovado para um pacote técnico-industrial pronto para fabricação.

**Pré-condição para Entrada na Fase 2:**
*   **`handoff_projeto/meta/integrity.json`:** Deve ser válido e existir.
*   **Estado:** O estado do projeto deve ser `RELEASED_TO_TECH`.
*   **Cadeia de Custódia:** Todos os hashes no `integrity.json` (para `budget.json`, `budget_approval.json`, `contract.txt`, `contract_acceptance.json`) devem corresponder aos hashes dos arquivos no `handoff_projeto/` no filesystem.

**Regra:** Se qualquer uma dessas pré-condições falhar, a entrada na Fase 2 é um **NO-GO automático**. A Fase 2 não negocia, ela executa com base em uma entrada verificada e inquestionável.

## 🚀 2. Objetivo da Fase 2

Converter um projeto aprovado comercial e juridicamente (conforme o pacote `handoff_projeto/`) em um pacote técnico determinístico, pronto para produção industrial, sem interpretação humana, minimizando erros e otimizando o processo fabril.

## 📥 3. Entradas Oficiais (Inputs)

A Fase 2 utilizará **exclusivamente** os seguintes artefatos do diretório `handoff_projeto/QT-YYYY-NNN/` como entrada:

*   `meta/integrity.json`: Contém os hashes e a lista dos arquivos da fase comercial/legal.
*   `commercial/budget.json`: Orçamento final aprovado.
*   `commercial/budget_approval.json`: Registro da aprovação digital do orçamento pelo cliente.
*   `legal/contract.txt`: Texto integral do contrato assinado.
*   `legal/contract_acceptance.json`: Registro do aceite eletrônico do contrato.
*   `concept/layout.svg`: Layout conceitual 2D do projeto.
*   `concept/enchant.png`: Imagem de encantamento (render 4K).
*   `commercial/style_selection.json` (Opcional): Detalhes da seleção de estilo e materiais (se um artefato formal for gerado).

**Regra:** Nenhuma informação fora desses artefatos pode ser introduzida ou inferida externamente para as decisões técnicas.

## ⚙️ 4. Motor de Estados (Formal)

O projeto transitará pelos seguintes estados técnicos, com artefatos mínimos exigidos para cada transição:

*   **`TECH_PENDING`**:
    *   **Descrição:** O projeto foi liberado pela fase comercial/legal (`RELEASED_TO_TECH`), mas ainda não iniciou o processamento técnico.
    *   **Artefato Necessário para Entrada:** `integrity.json` válido no `handoff_projeto/`.
    *   **Quem pode mudar:** Sistema automático após validação do `integrity.json`.

*   **`TECH_IN_PROGRESS`**:
    *   **Descrição:** O processo de tradução e geração de artefatos técnicos está em andamento.
    *   **Artefato Necessário para Entrada:** Início do processamento pelo Tradutor Conceito → Técnico.
    *   **Quem pode mudar:** Sistema automático.

*   **`TECH_VALIDATED`**:
    *   **Descrição:** Todos os artefatos técnicos foram gerados e passaram por validações internas de consistência.
    *   **Artefato Necessário para Entrada:** `technical/tech_integrity.json` válido e todos os arquivos técnicos listados gerados.
    *   **Quem pode mudar:** Sistema automático após validações de saída.

*   **`READY_FOR_FACTORY`**:
    *   **Descrição:** O pacote técnico final está completo, validado e pronto para ser consumido pela fábrica.
    *   **Artefato Necessário para Entrada:** `technical/tech_integrity.json` no estado `VALIDATED`.
    *   **Quem pode mudar:** Sistema automático.

**Regras de Transição:**
*   Não é permitido pular estados.
*   Cada estado exige a criação ou validação dos artefatos mínimos correspondentes.

## 🧠 5. Tradutor Conceito → Técnico (Core do Negócio)

Este é o componente central da Fase 2, responsável por converter os artefatos de entrada em dados técnicos estruturados e determinísticos.

**Princípios:**
*   **Determinismo:** Para as mesmas entradas, o Tradutor deve sempre produzir as mesmas saídas técnicas.
*   **Sem Interpretação Humana:** O Tradutor deve operar com base em regras explícitas, sem depender de julgamento humano para suas inferências.

**Exemplos do que será traduzido/inferido/calculado:**

*   **Layout SVG → Módulos e Peças:**
    *   **Inferência:** Identificar formas geométricas (retângulos, linhas) no `layout.svg` como representações de módulos e peças.
    *   **Cálculo:** Traduzir dimensões do SVG para medidas de fabricação (mm), aplicando regras de folgas, espessuras e encaixes com base no estilo e tipo de material.
    *   **Proibido Inferir:** A IA não deve inferir tipos de módulos complexos (ex: gaveteiros com corrediças específicas) sem uma regra explícita do `style_selection.json` ou de um catálogo de componentes técnicos.

*   **Estilo Aprovado (do `budget.json` / `style_selection.json`) → Parâmetros Técnicos:**
    *   **Regra:** Mapear o `styleId` (ex: "moderno_organico") para um conjunto de parâmetros técnicos:
        *   Espessuras de MDF (caixas, frentes).
        *   Tipos de acabamento de borda.
        *   Recuos padrão para portas/gavetas.
        *   Tipos básicos de ferragens (se não especificado em detalhes).
    *   **Proibido Inferir:** O Tradutor não deve inventar regras de estilo que não estejam formalmente definidas no sistema (ex: tipo de puxador exótico que não está no catálogo).

*   **Materiais Escolhidos (do `budget.json` / `style_selection.json`) → Constraints Mecânicas:**
    *   **Regra:** Associar materiais (ex: "Mármore Calacatta") a propriedades como:
        *   Peso por m² (para cálculo de reforços).
        *   Necessidade de usinagem específica (CNC vs. corte reto).
        *   Acabamentos de superfície (laca, pintura, selador).
    *   **Proibido Inferir:** A IA não deve inferir o comportamento de materiais em condições extremas ou combinações não testadas.

**Saídas do Tradutor:** O Tradutor gerará dados brutos que alimentarão os geradores de artefatos técnicos (módulos, peças, BOM).

## 📦 6. Artefatos Técnicos Gerados (Outputs)

A Fase 2 produzirá um pacote técnico final estruturado no diretório `handoff_projeto/QT-YYYY-NNN/technical/`:

*   `/technical/modules.json`: Lista detalhada de todos os módulos com suas dimensões e componentes principais.
*   `/technical/parts.json`: Lista de todas as peças individuais com medidas exatas, material e tipo de borda.
*   `/technical/bom.json` (Bill of Materials): Lista completa de materiais, ferragens e acessórios necessários para fabricação, com quantidades.
*   `/technical/dxf/`: Diretório contendo arquivos DXF para corte CNC (um arquivo por peça ou conjunto).
    *   `PART_001.dxf`, `PART_002.dxf`, etc.
*   `/technical/tech_integrity.json`: O `integrity.json` da fase técnica, contendo os hashes de todos os artefatos gerados nesta fase.

**Regras de Geração e Versionamento:**
*   DXF só nasce se `contract` = `SIGNED`.
*   BOM só nasce se `layout` = `APPROVED`.
*   Cada artefato deve ser versionado (implícita ou explicitamente). Se um artefato muda, seu hash muda, e uma nova versão do `tech_integrity.json` é gerada.
*   O `tech_integrity.json` fará o hash de todos os arquivos gerados no `/technical/`.

## ⚠️ 7. Validações e NO-GO da Fase Técnica

O sistema deve implementar validações robustas para garantir a integridade e viabilidade técnica.

**Bloqueios Automáticos (NO-GO):**
*   **`integrity.json` de Entrada Inválido:** Se o `integrity.json` do `handoff_projeto/` não for válido (hashes não batem, arquivos ausentes, estado incorreto), o processamento técnico é bloqueado.
*   **Inconsistência Geométrica:** Se o Tradutor Conceito → Técnico identificar sobreposições, furos em locais impossíveis ou dimensões negativas, o processo é bloqueado.
*   **Material Incompatível:** Se um material escolhido é incompatível com a usinagem necessária ou com as regras de estilo (ex: pedra em peças que exigem madeira), o processo é bloqueado.

**Retorno de Estado / Intervenção Humana:**
*   Em caso de bloqueio, o estado do projeto deve ser revertido para `TECH_PENDING` ou `TECH_ERROR`, e uma notificação clara (com os motivos do bloqueio) deve ser enviada para a equipe de engenharia para intervenção manual.
*   O sistema deve registrar detalhadamente o motivo de cada NO-GO.

## 🚫 8. Fora de Escopo

Os seguintes itens **não fazem parte do escopo** desta Fase 2 do Projeto Técnico Industrial:

*   **Interface de Usuário (UI):** Não há desenvolvimento de telas ou interações para esta fase.
*   **Integração com ERP:** A exportação para sistemas ERP ou de gestão de fábrica não está inclusa (será uma fase posterior).
*   **Logística e Chão de Fábrica:** Detalhes de transporte, montagem em campo, otimização de rota de corte em máquina (nesting) ou programação de máquinas CNC são escopos de outras fases.
*   **Micro-otimizações:** Otimizações de desempenho além do necessário para um fluxo determinístico.
*   **Mais IA "Criativa":** A IA nesta fase é puramente de tradução determinística e validação, não de design ou geração de novas ideias de conceito.
*   **Promessas de Automação Total:** O objetivo é o determinismo, não a eliminação completa da supervisão.

---
**SOMA-ID Industrial Engine v2.5 - Product Requirements Document (Fase 2: Projeto Técnico)**
