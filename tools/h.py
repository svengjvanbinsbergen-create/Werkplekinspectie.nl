# Helpers voor telefoonschermen (inline styles volgens ontwerp.md)
def svg(paths, size=20, sw=1.75):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{sw}" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none;display:block;">{paths}</svg>')
I = {
 'link':'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
 'pen':'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
 'mark':'<circle cx="9" cy="9" r="5"/><path d="M13 13l7 7"/><path d="M20 15v5h-5"/>',
 'phone':'<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 17.5h2"/>',
 'clock':'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
 'cloud':'<path d="M7 18a4 4 0 0 1-.5-8 6 6 0 0 1 11.5 1.5A3.5 3.5 0 0 1 17.5 18z"/>',
 'cloudok':'<path d="M7 18a4 4 0 0 1-.5-8 6 6 0 0 1 11.5 1.5A3.5 3.5 0 0 1 17.5 18z"/><path d="M9.5 13.5l2 2 3.5-3.5"/>',
 'chev_d':'<path d="m6 9 6 6 6-6"/>','chev_l':'<path d="M15 5l-7 7 7 7"/>','chev_r':'<path d="m9 5 7 7-7 7"/>',
 'chat':'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
 'cal':'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
 'check':'<path d="M5 12.5l4.5 4.5L19 7.5"/>','x':'<path d="M6 6l12 12M18 6 6 18"/>',
 'camera':'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
 'mic':'<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M19 11a7 7 0 0 1-14 0"/><path d="M12 18v3"/>',
 'wait':'<path d="M4 7h10M4 12h7M4 17h5"/><circle cx="17" cy="15" r="4"/><path d="M17 13.5V15l1 1"/>',
 'offline':'<path d="M3 3l18 18"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5 12.5a10 10 0 0 1 4-2.3"/><path d="M19 12.5a10 10 0 0 0-3.2-2"/><path d="M12 20h.01"/>',
 'alert':'<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5h.01"/>',
 'plus':'<path d="M12 5v14M5 12h14"/>',
 'lock':'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
}
JIJ = '<span style="display:inline-flex;align-items:center;height:22px;vertical-align:1px;padding:0 8px;border-radius:999px;background:#EEF0F3;color:#141A22;font-size:14px;font-weight:700;flex:none;">Jij</span>'
VOORSTEL = '<span style="display:inline-flex;align-items:center;height:22px;vertical-align:1px;padding:0 8px;border-radius:999px;background:#6B4FD8;color:#FFFFFF;font-size:14px;font-weight:700;flex:none;">Voorstel</span>'
def optoestel():
    return '<span style="display:inline-flex;align-items:center;gap:4px;font-size:14px;color:#4A5565;white-space:nowrap;">'+svg(I['phone'],16)+'op toestel</span>'
def wacht(t='voorstel volgt bij bereik'):
    return ('<span style="display:inline-flex;align-items:center;gap:6px;font-size:14px;line-height:18px;color:#5235C0;font-weight:600;white-space:nowrap;">'
            +svg(I['wait'],16)+t+'</span>')
def chip_online():
    return ('<div role="status" style="display:flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:999px;background:#FFFFFF;border:1px solid #DDE1E7;color:#4A5565;font-size:14px;font-weight:500;flex:none;">'
            +svg(I['cloudok'],18)+'Online</div>')
def chip_offline():
    return ('<div role="status" style="display:flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:999px;background:#141A22;color:#FFFFFF;font-size:14px;font-weight:600;flex:none;">'
            +svg(I['offline'],18)+'Offline</div>')
def btn2(label, w=None, h=48, icon=None, extra='', fs=16, aria=''):
    ws = f'width:{w}px;' if w else 'flex:1;min-width:0;'
    ic = svg(I[icon],20) if icon else ''
    a = f' aria-label="{aria}"' if aria else ''
    return (f'<button{a} style="{ws}height:{h}px;border-radius:8px;background:#FFFFFF;border:1.5px solid #6B7584;color:#141A22;font-size:{fs}px;font-weight:600;'
            f'display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 10px;white-space:nowrap;flex:none;{extra}">{ic}{label}</button>')

def danger():
    return ('<button aria-label="Direct gevaar: werk stilleggen. Houd 2 seconden ingedrukt." style="flex:none;height:52px;border-radius:8px;background:#FFFFFF;border:2px solid #B42318;color:#B42318;display:flex;align-items:center;gap:6px;padding:0 10px 0 8px;text-align:left;">'
            +svg(I['alert'],20)+'<span style="display:flex;flex-direction:column;align-items:flex-start;white-space:nowrap;"><span style="font-size:14px;line-height:16px;font-weight:700;">Direct gevaar</span>'
            '<span style="font-size:14px;line-height:16px;font-weight:600;">werk stilleggen</span><span style="font-size:12px;line-height:14px;font-weight:600;">houd 2 s ingedrukt</span></span></button>')

def bar8(n):
    return '<div style="display:flex;gap:4px;">'+''.join(
        f'<div style="flex:1;height:4px;border-radius:999px;background:{"#1F5FBF" if i<n else "#DDE1E7"};"></div>' for i in range(8))+'</div>'

def steprow(n, tekst, online, gevaar=True):
    chip = chip_online() if online else chip_offline()
    right = danger() if gevaar else ''
    return ('<div style="flex:none;padding:0 16px 8px 16px;">'+bar8(n)+
            '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:4px;">'
            '<div style="display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-width:0;">'
            f'<div style="font-size:14px;line-height:18px;color:#4A5565;white-space:nowrap;">{tekst}</div>'+chip+'</div>'+right+'</div></div>')

def nav3(rechts, sub='', actief=True, icon_r=None, foto_label='Foto'):
    left=('<div style="margin-top:8px;"><button style="width:124px;height:56px;border-radius:8px;background:#FFFFFF;color:#141A22;border:1.5px solid #6B7584;display:flex;align-items:center;justify-content:center;gap:8px;font-size:16px;font-weight:600;">'
          +svg(I['camera'],24)+foto_label+'</button></div>')
    mic=('<div style="display:flex;flex-direction:column;align-items:center;width:84px;"><button aria-label="Inspreken" style="width:72px;height:72px;border-radius:999px;background:#1F5FBF;color:#FFFFFF;border:0;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 4px 16px rgba(20,26,34,.10);">'
         +svg(I['mic'],32,2)+'</button><div style="font-size:14px;line-height:18px;font-weight:600;margin-top:4px;color:#141A22;white-space:nowrap;">Inspreken</div></div>')
    st = 'background:#1F5FBF;color:#FFFFFF;' if actief else 'background:#DDE1E7;color:#4A5565;'
    dis = '' if actief else ' aria-disabled="true"'
    ic = svg(I[icon_r],20) if icon_r else ''
    inner = (f'<span style="display:flex;flex-direction:column;align-items:center;line-height:18px;font-size:16px;font-weight:600;white-space:nowrap;"><span>{rechts}</span><span style="font-size:12px;line-height:14px;">{sub}</span></span>'
             if sub else f'<span style="font-size:16px;font-weight:600;white-space:nowrap;">{rechts}</span>')
    right=(f'<div style="margin-top:8px;"><button{dis} style="{st}border:0;width:124px;height:56px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 6px;">{ic}{inner}</button></div>')
    return ('<nav aria-label="Bediening" style="flex:none;height:120px;background:#FFFFFF;border-top:1px solid #DDE1E7;display:flex;align-items:flex-start;justify-content:space-between;padding:12px 16px 0 16px;box-sizing:border-box;">'
            +left+mic+right+'</nav>')

def header(titel, sub, terug=True):
    tb = ('<button aria-label="Terug" style="width:48px;height:48px;border:0;background:transparent;color:#141A22;display:flex;align-items:center;justify-content:center;border-radius:8px;flex:none;padding:0;">'+svg(I['chev_l'],24)+'</button>') if terug else '<div style="width:12px;flex:none;"></div>'
    return ('<header style="height:56px;flex:none;display:flex;align-items:center;gap:4px;padding:0 12px 0 4px;">'+tb+
            '<div style="flex:1;min-width:0;"><div style="font-family:\'Space Grotesk\',Inter,system-ui,sans-serif;font-size:18px;font-weight:600;line-height:22px;white-space:nowrap;">'+titel+'</div>'
            f'<div style="font-size:14px;line-height:18px;color:#4A5565;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{sub}</div></div>'
            '<div style="flex:none;align-self:flex-start;margin-top:8px;font-size:12px;line-height:16px;font-weight:600;color:#4A5565;border:1px solid #DDE1E7;background:#FFFFFF;border-radius:999px;padding:3px 8px;white-space:nowrap;">Voorbeeldinhoud · fictief</div></header>')
