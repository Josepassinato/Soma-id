#!/usr/bin/env python3
"""Generate final delivery PDF for Sabrina Parkland closet project."""

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch, mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import json
import os

DIR = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(DIR, "05_ENTREGA_FINAL_SABRINA_PARKLAND.pdf")

# Colors
DARK = HexColor("#1a1a2e")
BLUE = HexColor("#16213e")
GREEN = HexColor("#16a34a")
RED = HexColor("#dc2626")
AMBER = HexColor("#f59e0b")
LIGHT_BG = HexColor("#f8f9fa")
LIGHT_BLUE = HexColor("#eef2ff")

styles = getSampleStyleSheet()

# Custom styles
styles.add(ParagraphStyle(name='CoverTitle', fontName='Helvetica-Bold',
    fontSize=28, textColor=white, alignment=TA_CENTER, spaceAfter=10))
styles.add(ParagraphStyle(name='CoverSub', fontName='Helvetica',
    fontSize=14, textColor=HexColor("#a0a0c0"), alignment=TA_CENTER, spaceAfter=6))
styles.add(ParagraphStyle(name='SectionTitle', fontName='Helvetica-Bold',
    fontSize=16, textColor=DARK, spaceBefore=14, spaceAfter=8))
styles.add(ParagraphStyle(name='SubTitle', fontName='Helvetica-Bold',
    fontSize=12, textColor=BLUE, spaceBefore=10, spaceAfter=6))
styles.add(ParagraphStyle(name='Body', fontName='Helvetica',
    fontSize=10, textColor=black, spaceAfter=4, leading=14))
styles.add(ParagraphStyle(name='Small', fontName='Helvetica',
    fontSize=8, textColor=HexColor("#666"), spaceAfter=3, leading=10))
styles.add(ParagraphStyle(name='Pass', fontName='Helvetica-Bold',
    fontSize=10, textColor=GREEN))
styles.add(ParagraphStyle(name='Fail', fontName='Helvetica-Bold',
    fontSize=10, textColor=RED))
styles.add(ParagraphStyle(name='Warn', fontName='Helvetica-Bold',
    fontSize=10, textColor=AMBER))
styles.add(ParagraphStyle(name='MonoSmall', fontName='Courier',
    fontSize=7, textColor=HexColor("#334155"), leading=9))

def cover_page(story):
    """Full cover page."""
    story.append(Spacer(1, 2*inch))

    # Logo area
    cover_data = [
        [Paragraph("SOMA ID", styles['CoverTitle'])],
        [Paragraph("Industrial Carpentry Intelligence", styles['CoverSub'])],
        [Spacer(1, 0.4*inch)],
        [Paragraph("ENTREGA DE PROJETO", ParagraphStyle('ct2', fontName='Helvetica-Bold',
            fontSize=18, textColor=HexColor("#4ade80"), alignment=TA_CENTER))],
        [Spacer(1, 0.2*inch)],
        [Paragraph("Closet Sabrina - Parkland, FL", ParagraphStyle('ct3', fontName='Helvetica',
            fontSize=16, textColor=white, alignment=TA_CENTER))],
    ]
    cover_table = Table(cover_data, colWidths=[5.5*inch])
    cover_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), DARK),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 30),
        ('RIGHTPADDING', (0,0), (-1,-1), 30),
        ('ROUNDEDCORNERS', [12, 12, 12, 12]),
    ]))
    story.append(cover_table)
    story.append(Spacer(1, 0.5*inch))

    # Info
    info_data = [
        ["Cliente:", "Sabrina", "Designer:", "Alana"],
        ["Referencia:", "B.Home Concept (Silmara)", "Local:", "Parkland, FL"],
        ["Data Entrada:", "17/03/2026", "Data Entrega:", "A definir"],
        ["Tipo:", "Closet Completo", "Moeda:", "USD"],
    ]
    info_table = Table(info_data, colWidths=[1.2*inch, 2*inch, 1.2*inch, 2*inch])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('FONTNAME', (2,0), (2,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('TEXTCOLOR', (0,0), (0,-1), DARK),
        ('TEXTCOLOR', (2,0), (2,-1), DARK),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('LINEBELOW', (0,0), (-1,-2), 0.5, HexColor("#e5e7eb")),
    ]))
    story.append(info_table)
    story.append(PageBreak())

def page1_project_data(story):
    """Page 1: Project overview."""
    story.append(Paragraph("1. Dados do Projeto", styles['SectionTitle']))

    story.append(Paragraph("Espaco", styles['SubTitle']))
    space_data = [
        ["Area total:", "18.67 m2", "Pe-direito:", "3.00 m"],
        ["Formato:", "Irregular (~5.13m x 3.64m)", "Entrada:", "Parede sul, 0.90m"],
        ["Cores:", "Lana (corpo) + Lord (frentes)", "Mood:", "Elegant Neutral"],
    ]
    t = Table(space_data, colWidths=[1.3*inch, 2*inch, 1.3*inch, 2*inch])
    t.setStyle(TableStyle([
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('FONTNAME', (2,0), (2,-1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.2*inch))

    story.append(Paragraph("Zonas do Projeto", styles['SubTitle']))
    zones = [
        ["Zona", "Dimensoes", "Items Principais"],
        ["Closet Her", "3.64m x 3.81m", "Cabides, prateleiras, sapateira (30+6), vitrines (15 bolsas), malas"],
        ["Ilha Central", "1.20m x 0.60m", "Tampo vidro + veludo (joias), 5 gavetas categorizadas"],
        ["Makeup Area", "1.19m x 1.93m", "Bancada, espelho, iluminacao, constraint 800mm passagem"],
        ["Area Armas", "1.36m x 0.60m", "Porta espelho, prateleiras LED + sensor, cases"],
        ["Closet His", "4.03m x 0.60m", "Prateleiras, sapateira, area cabide"],
    ]
    zt = Table(zones, colWidths=[1.3*inch, 1.3*inch, 3.8*inch])
    zt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), DARK),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor("#dee2e6")),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, LIGHT_BG]),
    ]))
    story.append(zt)
    story.append(PageBreak())

def page2_briefing_json(story):
    """Page 2: Parsed briefing JSON."""
    story.append(Paragraph("2. Briefing Parseado (JSON Estruturado)", styles['SectionTitle']))
    story.append(Paragraph("Output do parser de briefing — formato unificado para os 3 engines.", styles['Body']))
    story.append(Spacer(1, 0.1*inch))

    # Load and format JSON
    with open(os.path.join(DIR, "01_parsed_briefing.json")) as f:
        data = json.load(f)

    # Remove _meta for cleaner display
    data.pop("_meta", None)
    json_text = json.dumps(data, indent=2, ensure_ascii=False)

    # Split into manageable chunks
    lines = json_text.split('\n')
    chunk_size = 60
    for i in range(0, len(lines), chunk_size):
        chunk = '\n'.join(lines[i:i+chunk_size])
        story.append(Paragraph(chunk.replace('<', '&lt;').replace('>', '&gt;').replace('\n', '<br/>').replace('  ', '&nbsp;&nbsp;'), styles['MonoSmall']))
        if i + chunk_size < len(lines):
            story.append(Spacer(1, 0.05*inch))

    story.append(PageBreak())

def page3_bom(story):
    """Pages 3-4: Bill of materials."""
    story.append(Paragraph("3. Lista de Materiais (Bill of Materials)", styles['SectionTitle']))
    story.append(Paragraph("Calculado pelo calcEngine com base no briefing parseado.", styles['Body']))
    story.append(Spacer(1, 0.1*inch))

    # Main materials table
    story.append(Paragraph("Chapas e Paineis", styles['SubTitle']))
    mat_data = [
        ["Material", "Qtd Chapas", "Pecas", "Preco Unit", "Total USD"],
        ["MDP 18mm Lana (corpo)", "11", "127", "$85.00", "$935.00"],
        ["MDP 18mm Lord (frentes)", "2", "14", "$92.00", "$184.00"],
        ["MDF 6mm (fundos)", "2", "8", "$35.00", "$70.00"],
        ["Vidro temperado 6mm", "-", "16 (6.27m2)", "$45.00/m2", "$282.15"],
        ["Espelho 4mm", "-", "2 (3.93m2)", "$55.00/m2", "$216.15"],
    ]
    mt = Table(mat_data, colWidths=[2.2*inch, 0.9*inch, 1.1*inch, 1*inch, 1*inch])
    mt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), DARK),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor("#dee2e6")),
        ('ALIGN', (1,0), (-1,-1), 'CENTER'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, LIGHT_BG]),
    ]))
    story.append(mt)
    story.append(Spacer(1, 0.15*inch))

    # Hardware
    story.append(Paragraph("Ferragens e Hardware", styles['SubTitle']))
    hw_data = [
        ["Item", "Qtd", "Total USD"],
        ["Fita LED 3000K/4000K", "25.29m", "$113.81"],
        ["Sensor magnetico + drivers LED", "3 un", "$72.00"],
        ["Barras cabide cromadas 25mm", "6.7m + 10 suportes", "$88.60"],
        ["Corredicas telescopicas soft-close", "7 pares", "$122.00"],
        ["Dobradicas conceito 110 soft-close", "4 un", "$48.00"],
        ["Puxadores embutidos", "7 un", "$56.00"],
        ["Pes regulaveis 100mm", "24 un", "$60.00"],
        ["Kit fixacao (minifix + cavilhas)", "3 kits", "$135.00"],
    ]
    ht = Table(hw_data, colWidths=[2.8*inch, 1.6*inch, 1.2*inch])
    ht.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), DARK),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor("#dee2e6")),
        ('ALIGN', (1,0), (-1,-1), 'CENTER'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, LIGHT_BG]),
    ]))
    story.append(ht)
    story.append(Spacer(1, 0.15*inch))

    # Acabamentos
    story.append(Paragraph("Acabamentos", styles['SubTitle']))
    ac_data = [
        ["Item", "Qtd", "Total USD"],
        ["Fita de borda Lana 22mm", "180m", "$81.00"],
        ["Fita de borda Lord 22mm", "25m", "$12.50"],
        ["Veludo cinza (divisores ilha)", "0.66 m2", "$16.50"],
    ]
    at = Table(ac_data, colWidths=[2.8*inch, 1.6*inch, 1.2*inch])
    at.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), DARK),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor("#dee2e6")),
        ('ALIGN', (1,0), (-1,-1), 'CENTER'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(at)
    story.append(Spacer(1, 0.15*inch))

    # Totals
    totals = [
        ["CATEGORIA", "TOTAL USD"],
        ["Chapas MDP/MDF", "$1,189.00"],
        ["Vidros e Espelhos", "$498.30"],
        ["Iluminacao LED", "$185.81"],
        ["Ferragens e Hardware", "$509.60"],
        ["Acabamentos", "$110.00"],
        ["TOTAL GERAL MATERIAIS", "$2,492.71"],
    ]
    tt = Table(totals, colWidths=[4*inch, 2*inch])
    tt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), DARK),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BACKGROUND', (0,-1), (-1,-1), GREEN),
        ('TEXTCOLOR', (0,-1), (-1,-1), white),
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('FONTSIZE', (0,-1), (-1,-1), 12),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor("#dee2e6")),
        ('ALIGN', (1,0), (1,-1), 'RIGHT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-2), [white, LIGHT_BG]),
    ]))
    story.append(tt)
    story.append(PageBreak())

def page5_interference(story):
    """Page 5: Interference report."""
    story.append(Paragraph("4. Relatorio de Interferencia", styles['SectionTitle']))
    story.append(Paragraph("Validacao de constraints fisicos pelo interferenceEngine.", styles['Body']))
    story.append(Spacer(1, 0.1*inch))

    with open(os.path.join(DIR, "03_interference_report.json")) as f:
        report = json.load(f)

    # Summary bar
    s = report["summary"]
    sum_data = [
        ["Total Checks", "PASS", "FAIL", "Warnings", "Status"],
        [str(s["total_checks"]), str(s["passed"]), str(s["critical_failures"]),
         str(s["warnings"]), s["overall_status"]],
    ]
    st = Table(sum_data, colWidths=[1.2*inch, 1*inch, 1*inch, 1*inch, 1.6*inch])
    st.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), DARK),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor("#dee2e6")),
        ('TEXTCOLOR', (1,1), (1,1), GREEN),
        ('TEXTCOLOR', (2,1), (2,1), RED),
        ('TEXTCOLOR', (3,1), (3,1), AMBER),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(st)
    story.append(Spacer(1, 0.15*inch))

    # Each check
    for chk in report["checks"]:
        result = chk["result"]
        color = GREEN if result == "PASS" else RED
        badge = "PASS" if result == "PASS" else "FAIL"

        margin_txt = ""
        if "margin_mm" in chk:
            margin_txt = f"  |  Margem: {chk['margin_mm']}mm"
        elif "deficit_mm" in chk:
            margin_txt = f"  |  Deficit: {chk['deficit_mm']}mm"

        row_data = [
            [chk["id"], chk["name"], badge, chk.get("severity", ""),
             chk.get("notes", "")[:80] + ("..." if len(chk.get("notes", "")) > 80 else "")]
        ]
        # Simplified: just add as paragraph
        result_style = styles['Pass'] if result == "PASS" else styles['Fail']
        story.append(Paragraph(
            f"<b>{chk['id']}</b> — {chk['name']}", styles['Body']))
        story.append(Paragraph(
            f"Result: <b>{badge}</b>{margin_txt}  |  Severity: {chk.get('severity', 'INFO')}",
            result_style))
        if chk.get("notes"):
            story.append(Paragraph(chk["notes"], styles['Small']))
        story.append(Spacer(1, 0.08*inch))

    # Blocking issues
    if report["summary"]["blocking_issues"]:
        story.append(Spacer(1, 0.1*inch))
        story.append(Paragraph("BLOQUEIOS:", styles['Fail']))
        for issue in report["summary"]["blocking_issues"]:
            story.append(Paragraph(f"  {issue}", styles['Body']))

    story.append(PageBreak())

def page6_nesting(story):
    """Pages 6-7: Nesting plan."""
    story.append(Paragraph("5. Plano de Corte (Nesting)", styles['SectionTitle']))
    story.append(Paragraph("Otimizacao de corte pelo nestingEngine — shelf-packing com controle de rotacao.", styles['Body']))
    story.append(Spacer(1, 0.1*inch))

    with open(os.path.join(DIR, "04_nesting_plan.json")) as f:
        nesting = json.load(f)

    overall = nesting["summary"]["overall"]

    # Summary stats
    stats_data = [
        ["Chapas Total", "Pecas", "Eficiencia Media", "Tempo CNC", "Desperdicio"],
        [str(overall["total_sheets_all_materials"]), "149",
         f"{overall['weighted_avg_efficiency_pct']}%",
         f"{overall['estimated_machine_time_hours']}h",
         f"{overall['total_waste_m2']} m2"],
    ]
    st = Table(stats_data, colWidths=[1.2*inch, 1*inch, 1.2*inch, 1*inch, 1.2*inch])
    st.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), DARK),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor("#dee2e6")),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(st)
    story.append(Spacer(1, 0.15*inch))

    # Per-sheet table
    story.append(Paragraph("Eficiencia por Chapa", styles['SubTitle']))
    sheet_header = ["Chapa", "Material", "Pecas", "Eficiencia", "Desperdicio"]
    sheet_rows = [sheet_header]

    for group in nesting["material_groups"]:
        mat = group["material"]
        if "sheets" not in group:
            continue
        for sheet in group["sheets"]:
            eff = sheet.get("efficiency_pct", 0)
            waste = sheet.get("waste_area_m2", 0)
            sheet_rows.append([
                str(sheet["id"]),
                mat.replace("MDP 18mm ", "").replace("MDF 6mm (paineis de fundo)", "MDF 6mm"),
                str(sheet["pieces_count"]),
                f"{eff}%",
                f"{waste} m2" if isinstance(waste, (int, float)) else str(waste),
            ])

    nt = Table(sheet_rows, colWidths=[0.7*inch, 1.5*inch, 0.8*inch, 1*inch, 1*inch])
    nt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), DARK),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor("#dee2e6")),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, LIGHT_BG]),
    ]))
    story.append(nt)

    # Include nesting screenshot if available
    nesting_img = os.path.join(DIR, "04_nesting_plan.png")
    if os.path.exists(nesting_img):
        story.append(Spacer(1, 0.15*inch))
        story.append(Paragraph("Visualizacao do Plano de Corte", styles['SubTitle']))
        try:
            img = Image(nesting_img, width=6*inch, height=4*inch)
            img.hAlign = 'CENTER'
            story.append(img)
        except:
            story.append(Paragraph("[Screenshot do plano de corte — ver 04_nesting_plan.html]", styles['Body']))

    story.append(PageBreak())

def page8_summary(story):
    """Page 8: Executive summary."""
    story.append(Paragraph("6. Resumo Executivo", styles['SectionTitle']))
    story.append(Spacer(1, 0.1*inch))

    # Key metrics
    story.append(Paragraph("Metricas do Projeto", styles['SubTitle']))
    metrics = [
        ["Metrica", "Valor"],
        ["Custo total materiais", "$2,492.71 USD"],
        ["Total chapas MDP/MDF", "14 chapas"],
        ["Total pecas cortadas", "149 pecas"],
        ["Area vidro temperado", "6.27 m2 (16 pecas)"],
        ["Area espelho", "3.93 m2 (2 pecas)"],
        ["LED total", "25.29 metros lineares"],
        ["Fita de borda total", "205 metros"],
        ["Aproveitamento medio (nesting)", "81.3%"],
        ["Tempo estimado CNC", "4.5 horas"],
        ["Tempo estimado fita de borda", "2.0 horas"],
        ["Tempo total producao estimado", "6.5 horas"],
    ]
    mt = Table(metrics, colWidths=[3*inch, 3*inch])
    mt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), DARK),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor("#dee2e6")),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, LIGHT_BG]),
    ]))
    story.append(mt)
    story.append(Spacer(1, 0.2*inch))

    # Interference summary
    story.append(Paragraph("Status de Validacao", styles['SubTitle']))
    val_data = [
        ["Check", "Status"],
        ["Passagem makeup (min 800mm)", "PASS (830mm, margem 30mm)"],
        ["Swing porta armas", "PASS (1116mm livre)"],
        ["Clearance ilha — lados", "PASS (620mm, margem 20mm — apertado)"],
        ["Clearance ilha — frente/fundo", "FAIL (360mm, deficit 240mm)"],
        ["Altura area malas", "PASS (2200mm — no limite)"],
        ["Gavetas ilha vs paredes", "PASS (120mm livre)"],
        ["Closet Her vs parede", "PASS (790mm sobra)"],
        ["Closet His vs parede", "PASS (0mm — encaixe exato, WARNING)"],
    ]
    vt = Table(val_data, colWidths=[2.5*inch, 3.5*inch])
    vt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), DARK),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor("#dee2e6")),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('TEXTCOLOR', (1,4), (1,4), RED),
        ('FONTNAME', (1,4), (1,4), 'Helvetica-Bold'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, LIGHT_BG]),
    ]))
    story.append(vt)
    story.append(Spacer(1, 0.2*inch))

    # Alerts
    story.append(Paragraph("Alertas e Acoes Necessarias", styles['SubTitle']))
    alerts = [
        "1. [BLOQUEANTE] Ilha central: clearance frente/fundo insuficiente (360mm vs 600mm minimo). Reposicionar ou reduzir profundidade para 450mm.",
        "2. [WARNING] Closet His: modulos encaixam exato na parede (0mm margem). Reduzir ultimo modulo em 15mm.",
        "3. [WARNING] Area malas: altura no limite (2200mm). Considerar baixar para 2000mm ou instalar barra retratil.",
        "4. [WARNING] Passagem makeup: margem de apenas 30mm. Reduzir bancada para 450mm ganha 50mm extra.",
        "5. [WARNING] Ilha lateral: clearance de 620mm (20mm acima do minimo). Reduzir ilha para 1100mm largura.",
        "6. [INFO] Espelho porta armas (1324x2364mm): peca grande — verificar transporte e disponibilidade.",
        "7. [INFO] Chapa Lord 33.8% eficiencia — avaliar meia-chapa com fornecedor.",
    ]
    for a in alerts:
        story.append(Paragraph(a, styles['Body']))

    story.append(Spacer(1, 0.3*inch))

    # Footer
    story.append(Paragraph("NAO inclui: mao de obra, transporte, instalacao, acabamento final.", styles['Small']))
    story.append(Paragraph("Precos baseados em valores tipicos de South Florida wholesale. Vidro sob medida pode variar +/-15%.", styles['Small']))
    story.append(Spacer(1, 0.2*inch))
    story.append(Paragraph("Gerado por SOMA ID Pipeline — 22/03/2026", ParagraphStyle(
        'footer', fontName='Helvetica-Bold', fontSize=9, textColor=DARK, alignment=TA_CENTER)))
    story.append(Paragraph("Engine Status: calcEngine (simulated) | interferenceEngine (simulated) | nestingEngine (simulated)", ParagraphStyle(
        'footer2', fontName='Helvetica', fontSize=7, textColor=HexColor("#888"), alignment=TA_CENTER)))


# Build PDF
doc = SimpleDocTemplate(OUT, pagesize=letter,
    topMargin=0.6*inch, bottomMargin=0.5*inch,
    leftMargin=0.7*inch, rightMargin=0.7*inch)

story = []
cover_page(story)
page1_project_data(story)
page2_briefing_json(story)
page3_bom(story)
page5_interference(story)
page6_nesting(story)
page8_summary(story)

doc.build(story)
print(f"PDF generated: {OUT}")
print(f"Size: {os.path.getsize(OUT) / 1024:.1f} KB")
