# Kleine hulpfuncties voor W07, W13, W14, W15 (bovenop de gedeelde lib.py; lib.py zelf niet wijzigen)
import sys
sys.path.insert(0, '/home/claude/app/tools')
from lib import *

GRIP = TXT3  # vaste kleur voor sleepgrepen (geen #8A94A3)

def _chip():
    return (f'<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;border:1px solid {LINE};'
            f'background:#FFFFFF;color:{TXT2};font-size:12px;font-weight:500;line-height:16px;white-space:nowrap">Voorbeeldinhoud · fictief</span>')

def kop(crumb, title, sub=None, knoppen=''):
    # gebruikt de gedeelde page_head; voegt de chip alleen toe als die er (nog) niet in zit
    h = page_head(crumb, title, sub, knoppen)
    if 'Voorbeeldinhoud' in h:
        return h
    right = (f'<div style="display:flex;flex-direction:column;align-items:flex-end;gap:10px">{_chip()}'
             f'<div style="display:flex;gap:8px">{knoppen}</div></div>')
    return page_head(crumb, title, sub, right)

def p(text, size=14, color=None, extra=''):
    c = color or TXT
    return f'<div style="font-size:{size}px;color:{c};line-height:1.5;{extra}">{text}</div>'
