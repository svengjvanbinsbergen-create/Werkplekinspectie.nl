import json,sys
old=open(sys.argv[1]).read(); new=open(sys.argv[2]).read(); H=json.load(open(sys.argv[3]))
s=old; out=[]
for o,n in H:
    p=0
    while p<min(len(o),len(n)) and o[p]==n[p]: p+=1
    q=0
    while q<min(len(o),len(n))-p and o[-1-q]==n[-1-q]: q+=1
    pos=s.index(o); a=pos+p; b=pos+len(o)-q; ins=n[p:len(n)-q]
    # widen until unique and >= 15 chars
    L=a; R=b
    while True:
        frag=s[L:R]
        if len(frag)>=15 and s.count(frag)==1: break
        if L>0: L-=1
        if R<len(s) and (len(frag)>=15 or True): R+=1
    of=s[L:R]; nf=s[L:a]+ins+s[b:R]
    out.append((of,nf)); s=s[:L]+nf+s[R:]
assert s==new
json.dump(out,open(sys.argv[4],'w'),ensure_ascii=False)
print(len(out),sum(len(x)+len(y) for x,y in out))
