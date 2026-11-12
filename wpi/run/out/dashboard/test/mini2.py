import json,sys,difflib
old=open(sys.argv[1]).read(); new=open(sys.argv[2]).read()
sm=difflib.SequenceMatcher(None,old,new,autojunk=False)
ops=[o for o in sm.get_opcodes() if o[0]!='equal']
g=[]
for o in ops:
    if g and o[1]-g[-1][2]<60: g[-1]=[g[-1][0],g[-1][1],o[2],g[-1][3],o[4]]
    else: g.append(list(o))
s=old; out=[]; shift=0
for _,i1,i2,j1,j2 in g:
    a,b=i1+shift,i2+shift; ins=new[j1:j2]
    L,R=a,b
    while not (R-L>=15 and s.count(s[L:R])==1):
        L=max(0,L-1); R=min(len(s),R+1)
    of=s[L:R]; nf=s[L:a]+ins+s[b:R]; out.append((of,nf)); s=s[:L]+nf+s[R:]; shift+=len(ins)-(i2-i1)
assert s==new
json.dump(out,open(sys.argv[3],'w'),ensure_ascii=False)
print(len(out),sum(len(x)+len(y) for x,y in out),max(len(x)+len(y) for x,y in out))
