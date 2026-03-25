/**
 * premium-page-system.ts
 * P2.4 — Premium editorial design system.
 * Centralizes typography, spacing, hierarchy, tables, callouts
 * for a consistently premium look across all SOMA-ID outputs.
 */

/* ============================================================
   Premium Design Tokens
   ============================================================ */

export const PREMIUM_TOKENS = {
  // Typography
  fontPrimary: "'Segoe UI', system-ui, -apple-system, sans-serif",
  fontMono: "'SF Mono', 'Cascadia Code', 'Consolas', monospace",
  fontSerif: "'Georgia', 'Times New Roman', serif",

  // Sizes
  sizeH1: "22px",
  sizeH2: "16px",
  sizeH3: "13px",
  sizeBody: "11px",
  sizeSmall: "10px",
  sizeMicro: "8px",
  sizeLabel: "9px",

  // Colors
  colorPrimary: "#1a1a1a",
  colorSecondary: "#444444",
  colorTertiary: "#777777",
  colorMuted: "#aaaaaa",
  colorAccent: "#c9a84c",       // SOMA-ID gold
  colorAccentDark: "#a8873a",
  colorSuccess: "#2e7d32",
  colorWarning: "#e6a817",
  colorDanger: "#c62828",
  colorBg: "#ffffff",
  colorBgSubtle: "#f8f8f6",
  colorBorder: "#e5e5e0",
  colorBorderStrong: "#333333",

  // Spacing
  spacingXs: "4px",
  spacingSm: "8px",
  spacingMd: "16px",
  spacingLg: "24px",
  spacingXl: "40px",

  // Borders
  borderThin: "1px solid #e5e5e0",
  borderMedium: "2px solid #333333",
  borderAccent: "3px solid #c9a84c",
};

/* ============================================================
   Premium CSS — Complete stylesheet
   ============================================================ */

export const PREMIUM_CSS = `
/* ============================================================
   P2.4 — SOMA-ID Premium Design System
   ============================================================ */

/* === Reset & Base === */
*{box-sizing:border-box}
body{
  font-family:${PREMIUM_TOKENS.fontPrimary};
  font-size:${PREMIUM_TOKENS.sizeBody};
  color:${PREMIUM_TOKENS.colorPrimary};
  line-height:1.5;
  -webkit-font-smoothing:antialiased;
  margin:0;padding:0;
  background:${PREMIUM_TOKENS.colorBg}
}

/* === Typography Hierarchy === */
h1{font-size:${PREMIUM_TOKENS.sizeH1};font-weight:700;letter-spacing:0.5px;margin:0 0 ${PREMIUM_TOKENS.spacingMd};color:${PREMIUM_TOKENS.colorPrimary}}
h2{font-size:${PREMIUM_TOKENS.sizeH2};font-weight:700;margin:${PREMIUM_TOKENS.spacingLg} 0 ${PREMIUM_TOKENS.spacingSm};color:${PREMIUM_TOKENS.colorPrimary};border-bottom:${PREMIUM_TOKENS.borderAccent};padding-bottom:6px}
h3{font-size:${PREMIUM_TOKENS.sizeH3};font-weight:600;margin:${PREMIUM_TOKENS.spacingMd} 0 ${PREMIUM_TOKENS.spacingXs};color:${PREMIUM_TOKENS.colorSecondary}}
p{margin:${PREMIUM_TOKENS.spacingXs} 0;color:${PREMIUM_TOKENS.colorSecondary}}

/* === Prancha Container (premium) === */
.prancha{
  background:${PREMIUM_TOKENS.colorBg};
  padding:${PREMIUM_TOKENS.spacingLg} ${PREMIUM_TOKENS.spacingXl} ${PREMIUM_TOKENS.spacingMd};
  margin:0;
  border-bottom:${PREMIUM_TOKENS.borderThin};
  min-height:600px;
  position:relative
}

/* === Header Bar === */
.prancha-header{
  display:flex;justify-content:space-between;align-items:center;
  padding:${PREMIUM_TOKENS.spacingSm} 0;
  border-bottom:${PREMIUM_TOKENS.borderAccent};
  margin-bottom:${PREMIUM_TOKENS.spacingMd};
  font-size:${PREMIUM_TOKENS.sizeSmall};
  color:${PREMIUM_TOKENS.colorTertiary}
}
.prancha-logo{
  font-size:14px;font-weight:800;letter-spacing:3px;
  color:${PREMIUM_TOKENS.colorPrimary}
}
.prancha-header-right{
  font-family:${PREMIUM_TOKENS.fontMono};
  font-size:${PREMIUM_TOKENS.sizeLabel};
  color:${PREMIUM_TOKENS.colorAccentDark};
  font-weight:600
}
.prancha-divider{
  color:${PREMIUM_TOKENS.colorBorder};
  margin:0 ${PREMIUM_TOKENS.spacingSm}
}

/* === Title Bar === */
.prancha-title-bar{margin-bottom:${PREMIUM_TOKENS.spacingMd}}
.prancha-title-bar h2{font-size:18px;border-bottom:none;padding-bottom:0;margin-bottom:2px}
.prancha-meta{
  font-size:${PREMIUM_TOKENS.sizeMicro};
  color:${PREMIUM_TOKENS.colorMuted};
  text-transform:uppercase;
  letter-spacing:1px
}

/* === Tables (premium) === */
table{
  width:100%;border-collapse:collapse;
  margin:${PREMIUM_TOKENS.spacingSm} 0;
  font-size:${PREMIUM_TOKENS.sizeSmall}
}
th{
  background:${PREMIUM_TOKENS.colorPrimary};
  color:${PREMIUM_TOKENS.colorBg};
  padding:6px 8px;
  text-align:left;
  font-weight:600;
  font-size:${PREMIUM_TOKENS.sizeMicro};
  text-transform:uppercase;
  letter-spacing:0.5px
}
td{
  padding:5px 8px;
  border-bottom:${PREMIUM_TOKENS.borderThin};
  vertical-align:top
}
tr:nth-child(even){background:${PREMIUM_TOKENS.colorBgSubtle}}
tr:hover{background:#f0f0ec}
.zone-header td{
  background:${PREMIUM_TOKENS.colorBgSubtle};
  font-weight:700;
  font-size:${PREMIUM_TOKENS.sizeSmall};
  color:${PREMIUM_TOKENS.colorSecondary};
  padding:8px;
  border-top:${PREMIUM_TOKENS.borderMedium}
}
.total-row td{
  font-weight:700;
  border-top:${PREMIUM_TOKENS.borderMedium};
  padding:8px;
  background:${PREMIUM_TOKENS.colorBgSubtle}
}

/* === Metrics Cards === */
.metrics{
  display:flex;gap:${PREMIUM_TOKENS.spacingSm};
  flex-wrap:wrap;
  margin:${PREMIUM_TOKENS.spacingSm} 0
}
.metric{
  flex:1;min-width:100px;
  text-align:center;
  padding:12px ${PREMIUM_TOKENS.spacingSm};
  border-radius:6px;
  border:${PREMIUM_TOKENS.borderThin}
}
.metric .val{
  font-size:24px;font-weight:800;
  font-family:${PREMIUM_TOKENS.fontMono};
  line-height:1.1
}
.metric .lbl{
  font-size:${PREMIUM_TOKENS.sizeMicro};
  text-transform:uppercase;
  letter-spacing:0.5px;
  color:${PREMIUM_TOKENS.colorTertiary};
  margin-top:2px
}
.metric.green{border-left:3px solid ${PREMIUM_TOKENS.colorSuccess}}.metric.green .val{color:${PREMIUM_TOKENS.colorSuccess}}
.metric.orange{border-left:3px solid ${PREMIUM_TOKENS.colorWarning}}.metric.orange .val{color:${PREMIUM_TOKENS.colorWarning}}
.metric.red{border-left:3px solid ${PREMIUM_TOKENS.colorDanger}}.metric.red .val{color:${PREMIUM_TOKENS.colorDanger}}
.metric.blue{border-left:3px solid #2196f3}.metric.blue .val{color:#2196f3}
.metric.purple{border-left:3px solid #7b1fa2}.metric.purple .val{color:#7b1fa2}

/* === Cost Box (premium) === */
.cost-box{
  text-align:center;
  padding:${PREMIUM_TOKENS.spacingMd};
  background:${PREMIUM_TOKENS.colorPrimary};
  color:${PREMIUM_TOKENS.colorBg};
  border-radius:8px;
  margin:${PREMIUM_TOKENS.spacingMd} 0
}
.cost-box .amount{
  font-size:28px;font-weight:800;
  color:${PREMIUM_TOKENS.colorAccent};
  font-family:${PREMIUM_TOKENS.fontMono}
}
.cost-box .desc{
  font-size:${PREMIUM_TOKENS.sizeSmall};
  opacity:0.8;margin-top:4px
}

/* === SVG Container === */
.svg-wrap{
  margin:${PREMIUM_TOKENS.spacingSm} 0;
  overflow-x:auto;
  border:${PREMIUM_TOKENS.borderThin};
  border-radius:4px;
  padding:${PREMIUM_TOKENS.spacingXs};
  background:${PREMIUM_TOKENS.colorBg}
}

/* === View Block (P0.7 + premium) === */
.view-block{margin:${PREMIUM_TOKENS.spacingMd} 0 ${PREMIUM_TOKENS.spacingSm}}
.view-block-header{
  display:flex;justify-content:space-between;align-items:baseline;
  border-bottom:${PREMIUM_TOKENS.borderThin};
  padding-bottom:4px;margin-bottom:${PREMIUM_TOKENS.spacingSm}
}
.view-title{font-size:${PREMIUM_TOKENS.sizeH3};font-weight:600;margin:0;color:${PREMIUM_TOKENS.colorSecondary}}
.view-scale{font-size:${PREMIUM_TOKENS.sizeMicro};color:${PREMIUM_TOKENS.colorMuted};font-style:italic;text-transform:uppercase;letter-spacing:0.5px}

/* === Footer & Carimbo === */
.prancha-footer{
  text-align:center;
  font-size:${PREMIUM_TOKENS.sizeMicro};
  color:${PREMIUM_TOKENS.colorMuted};
  padding:${PREMIUM_TOKENS.spacingSm} 0 0;
  margin-top:${PREMIUM_TOKENS.spacingMd};
  border-top:${PREMIUM_TOKENS.borderThin}
}
.prancha-footer-wrap{margin-top:${PREMIUM_TOKENS.spacingMd}}
.carimbo{
  border:${PREMIUM_TOKENS.borderMedium};
  font-size:${PREMIUM_TOKENS.sizeMicro};
  margin-top:${PREMIUM_TOKENS.spacingSm};
  width:480px;float:right;clear:both
}
.carimbo table{margin:0;font-size:${PREMIUM_TOKENS.sizeMicro}}
.carimbo td{padding:3px 6px;border:1px solid #ddd}
.carimbo-header{
  background:${PREMIUM_TOKENS.colorPrimary};
  color:${PREMIUM_TOKENS.colorBg};
  text-align:center;padding:8px
}
.carimbo-label{font-weight:600;width:80px;background:${PREMIUM_TOKENS.colorBgSubtle}}
.carimbo-value{color:${PREMIUM_TOKENS.colorSecondary}}

/* === Cover Page (premium) === */
.cover-brand{
  font-size:42px;font-weight:900;
  letter-spacing:8px;
  text-align:center;
  margin-top:80px;
  color:${PREMIUM_TOKENS.colorPrimary}
}
.cover-subtitle{
  text-align:center;
  font-size:${PREMIUM_TOKENS.sizeBody};
  color:${PREMIUM_TOKENS.colorTertiary};
  letter-spacing:2px;
  margin-bottom:${PREMIUM_TOKENS.spacingXl}
}
.cover-accent{
  width:80px;height:3px;
  background:${PREMIUM_TOKENS.colorAccent};
  margin:${PREMIUM_TOKENS.spacingMd} auto
}
.cover-info{
  max-width:500px;margin:0 auto;
  font-size:${PREMIUM_TOKENS.sizeBody};
  line-height:2
}
.cover-info td{
  padding:4px 12px;border:none
}
.cover-info .label{
  font-weight:600;text-transform:uppercase;
  font-size:${PREMIUM_TOKENS.sizeMicro};
  letter-spacing:1px;
  color:${PREMIUM_TOKENS.colorTertiary};
  text-align:right;width:140px
}
.cover-info .value{
  font-weight:700;
  color:${PREMIUM_TOKENS.colorPrimary}
}
.cover-id{
  text-align:center;
  font-size:${PREMIUM_TOKENS.sizeMicro};
  color:${PREMIUM_TOKENS.colorMuted};
  margin-top:${PREMIUM_TOKENS.spacingXl}
}
.cover-index{
  margin-top:${PREMIUM_TOKENS.spacingLg};
  max-width:500px;
  margin-left:auto;margin-right:auto
}
.cover-index td{padding:3px 8px;font-size:${PREMIUM_TOKENS.sizeSmall};border:none}
.cover-index .idx-num{
  font-family:${PREMIUM_TOKENS.fontMono};
  font-weight:700;
  color:${PREMIUM_TOKENS.colorAccentDark};
  width:40px;text-align:right
}

/* === Conflict Cards === */
.conflict-card{
  padding:${PREMIUM_TOKENS.spacingSm} ${PREMIUM_TOKENS.spacingMd};
  margin:${PREMIUM_TOKENS.spacingXs} 0;
  border-radius:4px;
  border-left:4px solid
}
.conflict-card.critical{border-color:${PREMIUM_TOKENS.colorDanger};background:#fef5f5}
.conflict-card.warning{border-color:${PREMIUM_TOKENS.colorWarning};background:#fffcf0}
.conflict-card .sev{font-weight:700;font-size:${PREMIUM_TOKENS.sizeSmall}}
.conflict-card .desc{font-size:${PREMIUM_TOKENS.sizeSmall};color:${PREMIUM_TOKENS.colorSecondary};margin:2px 0}
.conflict-card .meta{font-size:${PREMIUM_TOKENS.sizeMicro};color:${PREMIUM_TOKENS.colorTertiary}}

/* === Notes === */
.notes-list{margin:${PREMIUM_TOKENS.spacingXs} 0;padding-left:20px}
.notes-list li{font-size:${PREMIUM_TOKENS.sizeSmall};margin:2px 0;color:${PREMIUM_TOKENS.colorSecondary}}

/* === Dimension Labels === */
.dim-label{fill:#CC0000;font-weight:bold;font-family:Arial,sans-serif}

/* === Hachura Pattern === */
.hatch-pattern{fill:url(#hatchPattern)}

/* === Print === */
@media print{
  .prancha{padding:15px 20px;border:none;page-break-before:always;min-height:auto}
  .prancha:first-child{page-break-before:auto}
  .carimbo{width:400px}
  .metrics{gap:4px}
  .metric{padding:6px 4px}
  .metric .val{font-size:18px}
  body{font-size:9px}
}
`;
