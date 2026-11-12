import sys; sys.path.insert(0,'/home/claude/tools'); from h import *
D='/home/claude/app/screens/phone/'
src=open(D+'P07-bevinding-actie.html').read()
HEAD=src[:src.index('<body>')]
NR='WPI-20261105-DAM-C2-2'
TR=('&#8220;Geen handenwasset in de bus. Ze hebben water, zeep en papier uit het gebouw gehaald en bij de werkplek gezet. '
    'Opgelost is het daarmee niet. Ik zorg dat de bus van deze ploeg een handenwasset krijgt. De monteurs willen hem vast in elke wagen.&#8221;')
LBL='font-size:14px;font-weight:600;color:#4A5565;line-height:18px;'

def bar(n):
    return '<div style="display:flex;gap:4px;margin-bottom:4px;">'+''.join(
        f'<div style="flex:1;height:4px;border-radius:999px;background:{"#1F5FBF" if i<n else "#DDE1E7"};"></div>' for i in range(8))+'</div>'

def page(code,title,online,body,nav):
    chip = chip_online() if online else chip_offline()
    return (HEAD.replace('<title>P07 — Bevinding uitwerken tot actie</title>',f'<title>{code} — {title}</title>')+'<body>\n'
     f'<main id="scherm" data-scherm="{code}" aria-label="{code} {title}" style="position:relative;width:390px;height:844px;overflow:hidden;background:#F6F7F9;margin:0 auto;display:flex;flex-direction:column;">\n'
     '<div style="height:44px;flex:none;" aria-hidden="true"></div>\n'
     '<header style="height:56px;flex:none;display:flex;align-items:center;gap:4px;padding:0 12px 0 4px;"><button aria-label="Terug" style="width:48px;height:48px;border:0;background:transparent;color:#141A22;display:flex;align-items:center;justify-content:center;border-radius:8px;flex:none;padding:0;">'+svg(I['chev_l'],24)+'</button>'
     '<div style="flex:1;min-width:0;"><div style="font-family:\'Space Grotesk\',Inter,system-ui,sans-serif;font-size:18px;font-weight:600;line-height:22px;white-space:nowrap;">Onderwerp G</div>'
     f'<div style="font-size:14px;line-height:18px;color:#4A5565;white-space:nowrap;">{NR}</div></div>'
     '<div style="flex:none;align-self:flex-start;margin-top:8px;font-size:12px;line-height:16px;font-weight:600;color:#4A5565;border:1px solid #DDE1E7;background:#FFFFFF;border-radius:999px;padding:3px 8px;white-space:nowrap;">Voorbeeldinhoud · fictief</div></header>\n'
     +steprow(6,'Stap 6 van 8 · bevinding 2/5',online)+'\n'
     '<div id="inhoud" style="flex:1;min-height:0;overflow:hidden;padding:0 16px 4px 16px;display:flex;flex-direction:column;gap:5px;">'+body+'</div>\n'
     +nav+'\n</main>\n</body>\n</html>\n')

def prevnext(van):
    nb=lambda a,ic: f'<button aria-label="{a}" style="width:48px;height:48px;border-radius:8px;border:1.5px solid #6B7584;background:#fff;color:#141A22;display:flex;align-items:center;justify-content:center;padding:0;flex:none;">'+svg(I[ic],22)+'</button>'
    return ('<div style="display:flex;align-items:center;gap:6px;height:48px;flex:none;">'+nb('Vorige actie','chev_l')+
      '<div style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:2px;">'
      f'<span style="font-size:14px;line-height:18px;font-weight:600;white-space:nowrap;">{NR}</span>'
      '<span style="display:flex;align-items:center;gap:6px;"><span style="display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:999px;background:#FDECEA;color:#B42318;font-size:14px;font-weight:600;white-space:nowrap;">[A]&nbsp;Afwijking</span>'
      f'<span style="font-size:14px;color:#4A5565;white-space:nowrap;">actie 1/{van}</span></span></div>'+nb('Volgende actie','chev_r')+
      '<button aria-label="Nog een actie bij deze bevinding" style="width:48px;height:48px;border-radius:8px;border:1.5px solid #6B7584;background:#fff;color:#141A22;display:flex;align-items:center;justify-content:center;padding:0;flex:none;">'+svg(I['plus'],22)+'</button></div>')

def transcript(lines, toestel=False):
    if not toestel:
        return ('<button aria-expanded="false" aria-label="Hele transcript tonen" style="flex:none;display:flex;align-items:center;gap:6px;width:100%;height:48px;text-align:left;background:#FFFFFF;border:1px solid #DDE1E7;border-radius:10px;padding:0 6px 0 12px;color:#141A22;">'
          +JIJ+'<span style="font-size:14px;color:#4A5565;flex:none;">0:24</span><span style="flex:1;min-width:0;font-size:16px;line-height:22px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+TR+'</span>'
          '<span style="display:inline-flex;align-items:center;gap:2px;color:#1F5FBF;font-size:14px;font-weight:600;flex:none;">alles'+svg(I['chev_d'],18)+'</span></button>')
    return ('<button aria-expanded="false" aria-label="Hele transcript tonen" style="flex:none;display:block;width:100%;text-align:left;background:#FFFFFF;border:1px solid #DDE1E7;border-radius:10px;padding:6px 10px 6px 12px;color:#141A22;">'
      '<div style="display:flex;align-items:center;gap:8px;">'+JIJ+'<span style="font-size:14px;color:#4A5565;">0:24</span>'+optoestel()+
      '<span style="margin-left:auto;display:inline-flex;align-items:center;gap:2px;color:#1F5FBF;font-size:14px;font-weight:600;">alles'+svg(I['chev_d'],18)+'</span></div>'
      f'<div style="font-size:16px;line-height:22px;margin-top:2px;display:-webkit-box;-webkit-line-clamp:{lines};-webkit-box-orient:vertical;overflow:hidden;">{TR}</div></button>')

def klasse_row(pad=''):
    return (f'<div style="{pad}"><div style="{LBL}">Classificatie (VCA 7.2) <span style="font-weight:500;">· uit onderwerp G</span></div>'
      '<div style="display:flex;align-items:center;gap:8px;height:24px;"><div style="flex:1;font-size:16px;line-height:22px;white-space:nowrap;">Gevaarlijke stoffen en hygiëne</div>'
      '<button style="background:transparent;color:#1F5FBF;border:0;height:48px;width:64px;border-radius:8px;font-size:16px;font-weight:600;flex:none;padding:0;margin:-12px -4px -12px 0;">Wijzig</button></div></div>')

def voorstel_box():
    f=lambda l,t,r='': (f'<div><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><div style="{LBL}">{l}</div>{r}</div><div style="font-size:16px;line-height:22px;">{t}</div></div>')
    gec='<div style="display:flex;align-items:center;gap:6px;font-size:14px;color:#4A5565;">direct gecorrigeerd: <b style="color:#141A22;font-weight:600;">nee</b>'+JIJ+'</div>'
    return ('<section style="background:#EFEBFD;border:1.5px solid #6B4FD8;border-radius:10px;padding:6px 12px 6px 12px;flex:none;">'
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:2px;">'+VOORSTEL+'<span style="font-size:14px;color:#5235C0;font-weight:600;">onderstreept: uit standaardset</span></div>'
      '<div style="display:flex;flex-direction:column;gap:2px;">'
      +f('Bevinding','De handenwasset ontbreekt in de bus.',gec)
      +f('Direct genomen maatregel','Water, zeep en papier uit het gebouw gehaald en bij de werkplek gezet.')
      +f('Verbeteractie','Montagewagen van deze ploeg aanvullen met een handenwasset <span style="color:#5235C0;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;">(jerrycan, zeep, papier, desinfectiegel)</span>.')
      +klasse_row()+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">'
      f'<div><div style="{LBL}">Actiehouder</div><div style="font-size:16px;line-height:22px;white-space:nowrap;">Coördinator 2 (jij)</div></div>'
      f'<div><div style="{LBL}">Toetser</div><div style="font-size:16px;line-height:22px;white-space:nowrap;">Hoofd S&amp;M</div></div></div>'
      '</div></section>')

def pchip(t,on=False):
    if on:
        return (f'<button aria-pressed="true" style="flex:1;min-width:0;height:48px;border-radius:999px;background:#1F5FBF;border:1.5px solid #1F5FBF;color:#FFFFFF;font-size:16px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;padding:0 6px;white-space:nowrap;">'+svg(I['check'],18)+t+'</button>')
    return (f'<button aria-pressed="false" style="flex:1;min-width:0;height:48px;border-radius:999px;background:#FFFFFF;border:1.5px solid #6B7584;color:#141A22;font-size:16px;font-weight:600;display:flex;align-items:center;justify-content:center;padding:0 6px;white-space:nowrap;">{t}</button>')

def chips(sel=None, items=('direct','kort','planmatig')):
    return '<div role="radiogroup" aria-label="Prioriteit" style="display:flex;gap:8px;">'+''.join(pchip(t,t==sel) for t in items)+'</div>'

ASK='<div style="display:flex;align-items:center;gap:8px;font-size:16px;line-height:22px;"><span style="color:#6B4FD8;display:flex;">'+svg(I['chat'],20)+'</span><b style="font-weight:700;">{q}</b><span style="font-size:14px;color:#4A5565;">{s}</span></div>'

def nav(rechts_label, rechts_sub, actief):
    left=('<div style="margin-top:8px;"><button style="background:#fff;color:#141A22;border:1.5px solid #6B7584;width:124px;height:56px;border-radius:8px;display:inline-flex;align-items:center;justify-content:flex-start;padding:0 8px;">'
      '<span style="display:flex;flex-direction:column;align-items:flex-start;line-height:18px;font-size:14px;font-weight:600;white-space:nowrap;"><span>+ Nog een actie</span><span style="font-size:12px;line-height:14px;">bij deze bevinding</span></span></button></div>')
    mic=('<div style="display:flex;flex-direction:column;align-items:center;width:84px;"><button aria-label="Inspreken" style="width:72px;height:72px;border-radius:999px;background:#1F5FBF;color:#FFFFFF;border:0;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 4px 16px rgba(20,26,34,.10);">'
      +svg(I['mic'],32,2)+'</button><div style="font-size:14px;line-height:18px;font-weight:600;margin-top:4px;color:#141A22;white-space:nowrap;">Inspreken</div></div>')
    st = 'background:#1F5FBF;color:#FFFFFF;' if actief else 'background:#DDE1E7;color:#4A5565;'
    dis = '' if actief else ' aria-disabled="true"'
    right=(f'<div style="margin-top:8px;"><button{dis} style="{st}border:0;width:124px;height:56px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;padding:0 6px;">'
      f'<span style="display:flex;flex-direction:column;align-items:center;line-height:18px;font-size:16px;font-weight:600;white-space:nowrap;"><span>{rechts_label}</span><span style="font-size:12px;line-height:14px;">{rechts_sub}</span></span></button></div>')
    return left+mic+right

# --- P07: online, prioriteit nog kiezen
prio1=('<section style="background:#FFFFFF;border:1.5px solid #6B4FD8;border-radius:10px;padding:8px 12px 10px 12px;flex:none;display:flex;flex-direction:column;gap:8px;">'
  +ASK.format(q='Prioriteit?',s='daarna termijnvoorstel')+chips()+'</section>')
p07=page('P07','Bevinding uitwerken tot actie',True, prevnext(2)+transcript(1)+voorstel_box()+prio1, nav3('Opslaan','eerst prioriteit',False))
open(D+'P07-bevinding-actie.html','w').write(p07)

# --- P07c: online, kort gekozen, termijn met één tik
prio2=('<section style="background:#FFFFFF;border:1.5px solid #6B4FD8;border-radius:10px;padding:8px 12px 8px 12px;flex:none;display:flex;flex-direction:column;gap:6px;">'
  +chips('kort')+
  '<div style="display:flex;gap:8px;">'+btn2('<span style="display:flex;flex-direction:column;align-items:flex-start;line-height:18px;"><span>Ja, do 19 nov</span><span style="font-size:12px;line-height:14px;color:#5235C0;font-weight:700;">Voorstel · kort = 2 weken</span></span>',h=48,extra='flex:1;min-width:0;justify-content:flex-start;')+btn2('Andere datum',h=48,icon='cal',extra='flex:1;min-width:0;')+'</div></section>')
p07c=page('P07c','Bevinding tot actie, termijn kiezen',True, prevnext(2)+transcript(1)+voorstel_box()+prio2, nav3('Opslaan','eerst termijn',False))
open(D+'P07c-termijn.html','w').write(p07c)

# --- P07b: offline, alles met de hand
wr=lambda l: (f'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:22px;"><span style="{LBL}white-space:nowrap;">{l}</span><span style="font-size:14px;color:#4A5565;white-space:nowrap;">leeg, jouw tekst geldt</span></div>')
velden=('<section style="background:#FFFFFF;border:1px dashed #6B4FD8;border-radius:10px;padding:8px 12px 8px 12px;flex:none;display:flex;flex-direction:column;gap:2px;">'
  +wacht()+wr('Bevinding')+wr('Direct genomen maatregel')+wr('Verbeteractie')+
  '<div style="border-top:1px solid #DDE1E7;margin-top:2px;padding-top:4px;">'+klasse_row()+'</div></section>')
def sel(l,v,sub=''):
    return (f'<button style="flex:1;min-width:0;height:56px;border-radius:8px;background:#FFFFFF;border:1.5px solid #6B7584;color:#141A22;display:flex;align-items:center;justify-content:space-between;gap:4px;padding:0 6px 0 10px;text-align:left;">'
      f'<span style="display:flex;flex-direction:column;min-width:0;"><span style="font-size:12px;line-height:16px;font-weight:600;color:#4A5565;white-space:nowrap;">{l}{sub}</span><span style="font-size:16px;line-height:20px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{v}</span></span>'+svg(I['chev_d'],18)+'</button>')
gec=('<div style="display:flex;align-items:center;gap:8px;"><span style="flex:1;font-size:16px;font-weight:600;">Direct gecorrigeerd?</span>'
  '<div style="display:flex;gap:8px;width:176px;">'+pchip('ja')+pchip('nee',True)+'</div></div>')
hand=('<section style="background:#FFFFFF;border:1px solid #DDE1E7;border-radius:10px;padding:8px 12px 8px 12px;flex:none;display:flex;flex-direction:column;gap:6px;">'
  +gec+chips('kort')+
  '<div style="display:flex;gap:8px;">'+sel('Actiehouder','Coördinator 2')+sel('Toetser','Hoofd S&amp;M',' · standaard')+'</div>'
  '<div style="display:flex;gap:8px;">'+sel('Termijn','do 19 nov',' · regel kort: 2 weken')+'</div></section>')
p07b=page('P07b','Bevinding tot actie zonder bereik',False, prevnext(1)+transcript(2,True)+velden+hand, nav3('Opslaan','lokaal',True))
open(D+'P07b-actie-offline.html','w').write(p07b)
