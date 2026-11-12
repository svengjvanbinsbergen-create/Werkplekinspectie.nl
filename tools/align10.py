import sys, re
sys.path.insert(0,'/home/claude/app/tools'); import gen_p as G
from align import prim
D='/home/claude/app/screens/phone/'
SPEC={'P10-acties-toetsen':('Mijn acties en toetsen','Mijn acties','Hoofd S&amp;M · wo 11 nov',prim('Afronden','nog 1 afvinken'),True),
      'P10b-uitgevoerd-melden':('Actie uitgevoerd melden','Mijn acties','Coördinator 2 (fictief) · di 10 nov',prim('Melden','naar Hoofd S&amp;M'),False)}
for code,(tt,t,sub,p,dis) in SPEC.items():
    s=open(D+code+'.html',encoding='utf-8').read()
    a=s.index('<div id="inhoud"'); b=s.rindex('<nav')
    mid=s[a:b]
    open(D+code+'.html','w',encoding='utf-8').write(G.head(code,tt)+G.header(t,sub,'Online')+mid+G.nav(p,disabled=dis,icon=None))
    print(code)
