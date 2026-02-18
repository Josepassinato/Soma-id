# DXF Contract v0.1 — SOMA-ID → Produção (Promob/CAM-ready)

## 0) Objetivo do contrato
Garantir que qualquer DXF exportado:
- seja determinístico
- tenha semântica operacional (não só geometria)
- seja validável automaticamente (lint)
- seja mapeável para Promob/CAM sem edição manual por peça

## 1) Perfil e unidade
### 1.1 Versão DXF
- AC1015 (AutoCAD 2000)
- Proibido variar por ambiente.
### 1.2 Unidade
- $INSUNITS = 4 (milímetros)
- Lint: se $INSUNITS != 4 → REPROVAR export.

## 2) Sistema de coordenadas e origem (isso mata ou salva)
### 2.1 Origem padrão
- ORIGIN = canto inferior esquerdo do painel (BOTTOM_LEFT)
- Coordenadas de todas as entidades devem ser: x >= 0, y >= 0
### 2.2 Orientação do painel
- Eixo X → largura do painel
- Eixo Y → altura do painel
### 2.3 Rotação permitida
- Apenas 0° (padrão).
- Se precisar rotação, faz isso no nesting, não no DXF de peça.
### 2.4 Face (A/B)
- Este contrato v0.1 é somente FACE_A (uma face por arquivo).
- FACE_B vira v0.2 (senão você explode complexidade cedo demais).
### Lint:
- Se qualquer entidade cair em coordenada negativa → reprova
- Se bounding box do CUT_OUT não começar em (0,0) → reprova

## 3) Estrutura de arquivo (um DXF = uma peça)
### 3.1 Regra
- 1 arquivo DXF por peça (não por chapa).
- Nesting DXF pode existir, mas é arquivo separado (auditoria/otimização).
- Isso é essencial pra Promob/CAM e pra rastreabilidade.

## 4) Layers oficiais (semântica industrial)
Você hoje tem: CHAPA, CORTE_EXTERNO, FURACAO_ESTRUTURAL, FURACAO_FERRAGEM, FURACAO_SISTEMA, ETIQUETAS
Isso é um começo, mas ainda "genérico demais". Vamos travar um conjunto mínimo operacional:
### 4.1 Layers v0.1 (MVP industrial)
- **Obrigatórios**
    - CUT_OUT → contorno externo (polyline fechada)
    - DRILL_V → furação vertical (círculos/blocos)
    - TEXT_ID → identificação de peça (texto OU bloco de atributos)
- **Opcionais (mas recomendo)**
    - REF → marcas de referência (pequenas cruzes)
    - EDGE_BAND → indicações de fita de borda (se você quiser sinalização visual)
### 4.2 Mapeamento do seu código (pra ajustar rápido)
- `CORTE_EXTERNO` → `CUT_OUT`
- `FURACAO_ESTRUTURAL` / `FERRAGEM` / `SISTEMA` → no v0.1, você simplifica pra `DRILL_V`
- `ETIQUETAS` → `TEXT_ID`
- `CHAPA` fica só no DXF de nesting, não no DXF de peça.
### Lint:
- Se o DXF tiver layers fora da whitelist → reprova (ou move pra 0 e registra warning; eu recomendo reprovar).

## 5) Entidades permitidas (pra não virar bagunça)
### Permitidas
- LWPOLYLINE (contornos e rasgos)
- CIRCLE (furos simples)
- TEXT (apenas para ID — ou substitui por bloco)
- INSERT (blocos, recomendado)
### Proibidas
- SPLINE, ELLIPSE, HATCH, DIMENSION, MTEXT (no v0.1)

## 6) Blocos padrão (o pulo do gato pra "industrial")
Você quer que Promob/CAM entenda intenção. Então:
### 6.1 Bloco PART_INFO (obrigatório)
- Um bloco inserido em (10, 10) em layer TEXT_ID com atributos:
    - PART_ID (string) — ex: P_BASE_600_LADO_E
    - MODULE_ID (string) — ex: COZINHA_BASE_01
    - THICKNESS_MM (int) — ex: 18
    - MATERIAL (string) — ex: MDF_BP_BRANCO
    - EDGE_FRONT (0/1)
    - EDGE_LEFT (0/1)
    - EDGE_RIGHT (0/1)
    - EDGE_BACK (0/1)
### Lint:
- se não existir PART_INFO → reprova
- se THICKNESS_MM não bater com o padrão → warning (v0.1) / reprova (v0.2)
### 6.2 Bloco DRILL_V (recomendado)
- Ao invés de círculo solto, use INSERT com atributos:
    - DIA_MM
    - DEPTH_MM (no v0.1 pode ser igual à espessura)
    - TOOL_ID (opcional)
- Se você não quiser bloco agora, mantém CIRCLE mas o lint exige:
    - diâmetro dentro de um set permitido (ex: 3, 5, 8) — você define
- Importante: eu não vou mentir dizendo "Promob exige blocos X". O que é verdade: blocos + atributos tornam o pipeline muito mais robusto e automação-friendly.

## 7) Nomeação de arquivos (rastreabilidade ou morte)
### Formato:
`{PROJECT_ID}__{MODULE_ID}__{PART_ID}__{FACE}.dxf`
Ex: `BC001__COZ_BASE_01__P_BASE_600_E__A.dxf`
### Lint:
- se nome não bate regex → warning (v0.1), reprova (v0.2)

## 8) Regras de validação automática (DXF Lint v0.1)
Você vai implementar um "porteiro" antes de liberar DXF. Checklist de reprovação:
### Hard fail (reprova export)
- `$INSUNITS != 4`
- não existe layer `CUT_OUT`
- `CUT_OUT` não é polyline fechada
- bounding box do `CUT_OUT` não começa em (0,0)
- qualquer entidade com x<0 ou y<0
- não existe bloco `PART_INFO`
- existem entidades proibidas (SPLINE, HATCH, DIMENSION, …)
### Soft fail (warning)
- texto com caracteres fora do set permitido
- furos com diâmetro fora do set padrão
- furo muito próximo de borda (você define regra depois)

## Como isso encaixa no teu código (cirúrgico)
No seu `services/dxfService.ts` hoje:
- você gera DXF de nesting (chapa + peças posicionadas + furos)
- layers atuais são mais "categorias internas"
O contrato v0.1 pede dois exportadores (separados):
- `generatePartDxf(part)` → 1 peça, origem em (0,0), layers CUT_OUT, DRILL_V, TEXT_ID, PART_INFO
- `generateNestingDxf(nesting)` → pode continuar existindo (auditoria), mas não é o DXF de produção
Se você tentar usar nesting DXF como produção, você vai sofrer pra sempre.
