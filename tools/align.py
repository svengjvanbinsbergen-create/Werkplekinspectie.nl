# Zet P06–P10b op de bouwstenen van gen_p.py (kop met verbindingschip, Direct gevaar-balk boven de onderbalk, onderbalk).
import sys, re
sys.path.insert(0,'/home/claude/app/tools'); import gen_p as G
D='/home/claude/app/screens/phone/'
def inner(s):
    m=re.search(r'<div id="inhoud" style="[^"]*">',s)
    a=m.end(); g=s.find('<div style="flex:none;padding:4px 16px 6px 16px;">',a)
    b=g if g!=-1 else s.rindex('<nav'); seg=s[a:b].rstrip()
    assert seg.endswith('</div>'); return seg[:-6]
def prim(t, sub=None):
    return t if not sub else f'<span style="display:flex;flex-direction:column;align-items:center;line-height:18px;"><span>{t}</span><span style="font-size:12px;line-height:14px;font-weight:600;">{sub}</span></span>'
SPEC={ # code: (titel, sub, conn, stap, gevaar, primair, disabled, icon)
 'P06-foto':('Foto 3','bij DAM-2.07','Offline',4,True,prim('Opslaan'),False,None),
 'P07-bevinding-actie':('Onderwerp G','Bevinding 2 van 5','Online',6,True,prim('Opslaan','eerst prioriteit'),True,None),
 'P07c-termijn':('Onderwerp G','Bevinding 2 van 5','Online',6,True,prim('Opslaan','eerst termijn'),True,None),
 'P07b-actie-offline':('Onderwerp G','Bevinding 2 van 5','Offline',6,True,prim('Opslaan','lokaal'),False,None),
 'P08-afsluiten':('Afsluiten','Damwand · stap 7','Online',7,True,prim('Klopt','eerst voorstel'),True,None),
 'P09-rapport-klaar':('Rapport klaar','Damwand','Offline',8,False,prim('Delen','lokaal PDF'),False,None),
}
def run():
  for code,(t,sub,conn,stap,gev,p,dis,ic) in SPEC.items():
      s=open(D+code+'.html',encoding='utf-8').read()
      body=inner(s)
      title=re.search(r'<title>(.*?)</title>',s).group(1).split('—')[-1].split('·')[-1].strip()
      html=(G.head(code,title)+G.header(t,sub,conn)+G.progress(stap)+G.content(body,5)
            +(G.gevaar() if gev else '')+G.nav(p,disabled=dis,icon=ic))
      html=html.replace('<div style="flex:1;min-height:0;overflow:hidden;padding:0 16px 2px 16px;','<div id="inhoud" style="flex:1;min-height:0;overflow:hidden;padding:0 16px 2px 16px;',1)
      open(D+code+'.html','w',encoding='utf-8').write(html)
      print(code,'ok')

if __name__=='__main__':
    run()
