import sys; sys.path.insert(0,'/home/claude/tools'); from h import *
D='/home/claude/app/screens/phone/'
src=open(D+'P08-afsluiten.html').read()
HEAD=src[:src.index('<body>')]
LBL='font-size:14px;font-weight:600;color:#4A5565;line-height:18px;'
def seg(flex,minw,bg,fg,t):
    return f'<div style="flex:{flex} 1 0;min-width:{minw}px;height:28px;border-radius:4px;background:{bg};display:flex;align-items:center;justify-content:center;color:{fg};font-size:14px;font-weight:700;white-space:nowrap;">{t}</div>'
bar=('<div role="img" aria-label="17 regels: Conform 10, Afwijking 4, Verbeterpunt 1, Geen afwijking waargenomen 1, Niet beoordeeld 1, Niet van toepassing 0" style="display:flex;gap:2px;">'
  +seg(10,0,'#1E7A4C','#FFFFFF','C 10')+seg(4,0,'#B42318','#FFFFFF','A 4')+seg(1,40,'#8A4B00','#FFFFFF','V 1')+seg(1,46,'#4A5565','#FFFFFF','GA 1')
  +seg(1,48,'repeating-linear-gradient(135deg,#FFFFFF 0 4px,#C3C9D2 4px 8px)','#141A22','NB 1')+'</div>')
def ochip(code,woord,fg,bg):
    return f'<span style="display:inline-flex;align-items:center;height:24px;padding:0 8px;border-radius:999px;background:{bg};color:{fg};font-size:14px;font-weight:600;white-space:nowrap;flex:none;">[{code}]&nbsp;{woord}</span>'
NBBG='repeating-linear-gradient(135deg,#EEF0F3 0 5px,#DDE1E7 5px 10px)'
chev=svg(I['chev_r'],20)
dekking=('<section style="background:#EFEBFD;border:1.5px solid #6B4FD8;border-radius:10px;padding:6px 12px 8px 12px;flex:none;display:flex;flex-direction:column;gap:6px;">'
  '<div style="display:flex;align-items:center;justify-content:space-between;">'+VOORSTEL+'<span style="font-size:14px;font-weight:600;color:#5235C0;">17 regels · 15 waargenomen · 0 n.v.t.</span></div>'+bar+
  '<div style="display:flex;align-items:center;gap:8px;">'+ochip('GA','Geen afwijking waargenomen','#4A5565','#EEF0F3')+'<span style="font-size:14px;color:#4A5565;">1</span></div>'
  '<div style="display:flex;justify-content:space-between;font-size:16px;line-height:20px;margin-top:-2px;"><span>F Werkplek en omgeving</span><span style="font-size:14px;color:#4A5565;">alleen bevestigd</span></div>'
  '<button aria-label="Niet beoordeelde regel bekijken" style="display:flex;align-items:center;gap:8px;width:100%;min-height:48px;background:#FFFFFF;border:1.5px solid #6B7584;border-radius:8px;padding:2px 6px 2px 10px;text-align:left;color:#141A22;">'
  '<span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;">'+ochip('NB','Niet beoordeeld','#4A5565',NBBG).replace('flex:none;','flex:none;align-self:flex-start;')+'<span style="font-size:16px;line-height:20px;">DAM-2.02 Fysieke belasting</span></span><span style="font-size:14px;font-weight:600;color:#1F5FBF;">bekijken</span>'+chev+'</button>'
  '</section>')
def brow(ref,klasse,code,n):
    col={'A':'#B42318','V':'#8A4B00'}[code]
    return (f'<div style="display:flex;align-items:baseline;gap:4px;font-size:16px;line-height:21px;"><b style="color:{col};font-weight:700;font-size:14px;width:26px;flex:none;">[{code}]</b>'
            f'<span style="font-size:14px;font-weight:600;color:#4A5565;width:70px;flex:none;white-space:nowrap;">{ref}</span><span style="flex:1;min-width:0;white-space:nowrap;">{klasse}</span></div>')
def prio(t,st):
    return f'<span style="display:inline-flex;align-items:center;height:24px;padding:0 8px;border-radius:999px;{st}font-size:14px;font-weight:600;white-space:nowrap;flex:none;">{t}</span>'
def check(t):
    return '<div style="display:flex;align-items:flex-start;gap:6px;font-size:14px;line-height:19px;"><span style="color:#1E7A4C;display:flex;padding-top:1px;">'+svg(I['check'],16)+f'</span><span>{t}</span></div>'
acties=('<section style="background:#FFFFFF;border:1px solid #DDE1E7;border-radius:10px;padding:6px 12px 8px 12px;flex:none;display:flex;flex-direction:column;gap:1px;">'
  '<div style="display:flex;align-items:center;gap:6px;"><span style="font-family:\'Space Grotesk\',Inter,sans-serif;font-size:18px;font-weight:600;white-space:nowrap;margin-right:4px;">9 acties</span>'
  +prio('direct 1','background:#B42318;color:#FFFFFF;')+prio('kort 5','background:#FFFFFF;color:#8A4B00;border:1.5px solid #B86A00;')+prio('planmatig 3','background:#FFFFFF;color:#4A5565;border:1.5px solid #8A94A3;')+'</div>'
  f'<div style="{LBL}margin-top:2px;">5 bevindingen · classificatie (VCA 7.2)</div>'
  +brow('A','Documenten en voorbereiding','A',2)+brow('G','Gevaarlijke stoffen en hygiëne','A',2)
  +brow('DAM-2.03','Hijsen','V',1)+brow('DAM-2.06','Gevaarlijke stoffen en hygiëne','A',2)+brow('DAM-2.07','Besloten ruimte en gas','A',2)+
  '<div style="border-top:1px solid #DDE1E7;margin-top:3px;padding-top:4px;display:flex;flex-direction:column;gap:1px;">'
  +'<div style="display:flex;align-items:center;gap:6px;font-size:14px;line-height:19px;height:22px;"><span style="color:#5235C0;display:flex;">'+svg(I['wait'],16)+'</span><b style="flex:1;font-weight:600;color:#141A22;">Nog 1 voorstel te bevestigen</b><a href="#" style="display:inline-flex;align-items:center;height:48px;margin:-13px 0;padding:0 2px;font-weight:600;white-space:nowrap;text-decoration:none;color:#1F5FBF;">Foto 3 bekijken</a></div>'
  +check('1 al afgerond ter plaatse, getoetst door jou <span style="white-space:nowrap;">(…-C2-4)</span>')
  +check('Toetser ≠ actiehouder bij alle 9')
  +check('Gesprek met monteurs vastgelegd, 2 ideeën')
  +check('Positief: 10 Conform + hijsen en afzetting')+'</div></section>')
open_v=('<button aria-label="Voorstel bekijken en bevestigen" style="flex:none;display:flex;align-items:center;gap:8px;width:100%;min-height:52px;background:#FFFFFF;border:1.5px solid #6B4FD8;border-radius:10px;padding:4px 8px 4px 12px;text-align:left;color:#141A22;">'
  '<span style="color:#5235C0;display:flex;">'+svg(I['wait'],20)+'</span><span style="flex:1;min-width:0;display:flex;flex-direction:column;"><b style="font-size:16px;line-height:20px;font-weight:600;">Nog 1 voorstel te bevestigen</b><span style="font-size:14px;line-height:18px;color:#4A5565;">toelichting Foto 3, kwam bij bereik</span></span>'
  '<span style="color:#1F5FBF;display:flex;">'+svg(I['chev_r'],22)+'</span></button>')
afsluit=('<button aria-expanded="false" aria-label="Hele antwoord tonen" style="flex:none;display:flex;align-items:center;gap:6px;width:100%;height:48px;text-align:left;background:#FFFFFF;border:1px solid #DDE1E7;border-radius:10px;padding:0 6px 0 12px;color:#141A22;">'
  +JIJ+'<span style="font-size:14px;color:#4A5565;flex:none;">0:07</span><span style="flex:1;min-width:0;font-size:16px;line-height:22px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">&#8220;Werkplek en omgeving: niks op aan te merken. Fysieke belasting niet bekeken.&#8221;</span>'
  '<span style="display:inline-flex;align-items:center;gap:2px;color:#1F5FBF;font-size:14px;font-weight:600;flex:none;">alles'+svg(I['chev_d'],18)+'</span></button>')
body=afsluit+dekking+acties
html=(HEAD+'<body>\n<main id="scherm" data-scherm="P08" aria-label="P08 Afsluitvraag en samenvatting" style="position:relative;width:390px;height:844px;overflow:hidden;background:#F6F7F9;margin:0 auto;display:flex;flex-direction:column;">\n'
  '<div style="height:44px;flex:none;" aria-hidden="true"></div>\n'+header('Afsluiten','Damwand · demontage')+'\n'+steprow(7,'Stap 7 van 8 · Afsluiten',True)+'\n'
  '<div id="inhoud" style="flex:1;min-height:0;overflow:hidden;padding:0 16px 4px 16px;display:flex;flex-direction:column;gap:4px;">'+body+'</div>\n'
  +nav3('Klopt','eerst voorstel',False)+'\n</main>\n</body>\n</html>\n')
open(D+'P08-afsluiten.html','w').write(html)
