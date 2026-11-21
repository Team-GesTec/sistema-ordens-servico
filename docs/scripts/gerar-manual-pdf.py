from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.units import mm
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from xml.sax.saxutils import escape
from pathlib import Path
import re
root=Path(__file__).resolve().parents[2]
src=(root/'docs/Manual-Usuario.md').read_text()
out=root/'frontend/public/manual/Manual-Usuario.pdf'
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='CoverTitle', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=25, leading=31, textColor=colors.HexColor('#090C5C'), alignment=TA_CENTER, spaceAfter=14))
styles.add(ParagraphStyle(name='CoverSub', parent=styles['Normal'], fontSize=12, leading=18, textColor=colors.HexColor('#527189'), alignment=TA_CENTER))
styles.add(ParagraphStyle(name='H1x', parent=styles['Heading1'], fontSize=17, leading=22, textColor=colors.HexColor('#090C5C'), spaceBefore=15, spaceAfter=8, keepWithNext=True))
styles.add(ParagraphStyle(name='H2x', parent=styles['Heading2'], fontSize=12.5, leading=16, textColor=colors.HexColor('#1589CA'), spaceBefore=10, spaceAfter=5, keepWithNext=True))
styles.add(ParagraphStyle(name='H3x', parent=styles['Heading3'], fontSize=10.5, leading=14, textColor=colors.HexColor('#15243A'), spaceBefore=8, spaceAfter=4, keepWithNext=True))
styles.add(ParagraphStyle(name='Bodyx', parent=styles['BodyText'], fontSize=8.8, leading=13, textColor=colors.HexColor('#25364A'), spaceAfter=6))
styles.add(ParagraphStyle(name='Smallx', parent=styles['BodyText'], fontSize=7.4, leading=10, textColor=colors.HexColor('#42566B')))
styles.add(ParagraphStyle(name='TOCTitle', parent=styles['Heading1'], fontSize=18, textColor=colors.HexColor('#090C5C'), spaceAfter=12))
class Doc(BaseDocTemplate):
 def afterFlowable(self, flowable):
  if isinstance(flowable, Paragraph) and getattr(flowable,'_outlineLevel',None) is not None:
   level=flowable._outlineLevel; text=flowable.getPlainText(); key=f'h{self.seq.nextf("heading")}'
   self.canv.bookmarkPage(key); self.canv.addOutlineEntry(text,key,level,0)
   self.notify('TOCEntry',(level,text,self.page,key))
class Heading(Paragraph):
 def __init__(self,text,style,level): super().__init__(text,style); self._outlineLevel=level

def footer(canvas,doc):
 canvas.saveState(); w,h=A4
 if doc.page>1:
  canvas.setStrokeColor(colors.HexColor('#D6E8F3')); canvas.line(18*mm,15*mm,w-18*mm,15*mm)
  canvas.setFont('Helvetica',7); canvas.setFillColor(colors.HexColor('#627B91'))
  canvas.drawString(18*mm,10*mm,'SGOS • Manual completo do usuário')
  canvas.drawRightString(w-18*mm,10*mm,f'Página {doc.page}')
 canvas.restoreState()
doc=Doc(str(out),pagesize=A4,rightMargin=18*mm,leftMargin=18*mm,topMargin=19*mm,bottomMargin=22*mm,title='SGOS — Manual completo do usuário',author='Equipe SGOS')
frame=Frame(doc.leftMargin,doc.bottomMargin,doc.width,doc.height,id='normal')
doc.addPageTemplates([PageTemplate(id='main',frames=frame,onPage=footer)])
story=[]
story += [Spacer(1,48*mm),Paragraph('SGOS',styles['CoverTitle']),Paragraph('Sistema de Gestão de Ordens de Serviço',styles['CoverSub']),Spacer(1,10*mm),Paragraph('MANUAL COMPLETO DO USUÁRIO',ParagraphStyle('CoverLabel',parent=styles['CoverSub'],fontSize=15,textColor=colors.HexColor('#15243A'))),Spacer(1,8*mm),Paragraph('Guia de instalação e configuração<br/>Manual do Gestor • Manual do Técnico • Manual do Analista',styles['CoverSub']),Spacer(1,75*mm),Paragraph('Versão documental 1.1 • Novembro de 2026',styles['CoverSub']),PageBreak()]
story += [Paragraph('Sumário geral',styles['TOCTitle'])]
toc=TableOfContents(); toc.levelStyles=[ParagraphStyle(name='TOC0',fontName='Helvetica-Bold',fontSize=9,leading=14,leftIndent=0,textColor=colors.HexColor('#090C5C'),spaceBefore=4),ParagraphStyle(name='TOC1',fontName='Helvetica',fontSize=8,leading=11,leftIndent=12,textColor=colors.HexColor('#42566B'))]
story += [toc,PageBreak()]
lines=src.splitlines(); in_code=False; code=[]; table=[]; list_items=[]; skip_source_toc=False
def flush_list():
 global list_items
 if list_items:
  for item in list_items: story.append(Paragraph('• '+inline(item),styles['Bodyx']))
  list_items=[]
def flush_table():
 global table
 if table:
  rows=[]
  for row in table:
   cells=[Paragraph(inline(c.strip()),styles['Smallx']) for c in row.strip('|').split('|')]
   if all(re.fullmatch(r'[-: ]+',c.strip()) for c in row.strip('|').split('|')): continue
   rows.append(cells)
  if rows:
   t=Table(rows,repeatRows=1,hAlign='LEFT',colWidths=[doc.width/len(rows[0])]*len(rows[0]))
   t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#EAF5FB')),('TEXTCOLOR',(0,0),(-1,0),colors.HexColor('#090C5C')),('GRID',(0,0),(-1,-1),.35,colors.HexColor('#D6E8F3')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5)])); story.append(t); story.append(Spacer(1,5))
  table=[]
def inline(s):
 s=escape(s)
 s=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',s)
 s=re.sub(r'`([^`]+)`',r'<font name="Courier" size="8">\1</font>',s)
 s=re.sub(r'\[([^\]]+)\]\((#[^)]+)\)',r'\1',s)
 s=re.sub(r'\[([^\]]+)\]\((https?://[^)]+)\)',r'<link href="\2" color="#1589CA">\1</link>',s)
 return s
for line in lines:
 if line.strip() == '## Sumário geral':
  flush_list(); skip_source_toc=True; continue
 if skip_source_toc:
  if line.strip() == '---': skip_source_toc=False
  continue
 if line.startswith('```'):
  flush_list(); flush_table()
  if not in_code: in_code=True; code=[]
  else:
   text='<br/>'.join(escape(x) for x in code)
   story.append(Paragraph(text,ParagraphStyle('Code',parent=styles['Code'],fontName='Courier',fontSize=7.2,leading=10,backColor=colors.HexColor('#F2F7FA'),borderPadding=6,spaceAfter=7))); in_code=False
  continue
 if in_code: code.append(line); continue
 if line.startswith('|'):
  flush_list(); table.append(line); continue
 flush_table()
 if not line.strip() or line.strip()=='---': flush_list(); continue
 if line.startswith('# '):
  flush_list()
  if line[2:].startswith('SGOS'): continue
  story.append(Heading(inline(line[2:]),styles['H1x'],0)); continue
 if line.startswith('## '):
  flush_list(); text=inline(line[3:])
  story.append(Heading(text,styles['H2x'],1))
  continue
 if line.startswith('### '): flush_list(); story.append(Heading(inline(line[4:]),styles['H3x'],2)); continue
 if line.startswith('#### '): flush_list(); story.append(Paragraph(inline(line[5:]),styles['Bodyx'])); continue
 if line.startswith('- '): list_items.append(line[2:]); continue
 if re.match(r'^\d+\. ',line): flush_list(); story.append(Paragraph(inline(line),styles['Bodyx'])); continue
 flush_list(); story.append(Paragraph(inline(line),styles['Bodyx']))
flush_list(); flush_table()
doc.multiBuild(story)
print(out, out.stat().st_size)
