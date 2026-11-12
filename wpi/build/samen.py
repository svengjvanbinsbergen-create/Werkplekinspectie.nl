k=open('kop_v4.py',encoding='utf-8').read(); s=open('deel_v4.py',encoding='utf-8').read()
b=open('bouw_v4.py',encoding='utf-8').read()
ms=b[b.index('def maak_sjabloon():'):b.index('# ============================================================ velden en trends')]
open('bouw_v4.py','w',encoding='utf-8').write(k+'\n'+ms+s)
