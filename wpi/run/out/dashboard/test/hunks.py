import difflib,sys,json
old=open(sys.argv[1]).read(); new=open(sys.argv[2]).read()
a=old.split('\n'); b=new.split('\n')
ops=[o for o in difflib.SequenceMatcher(None,a,b,autojunk=False).get_opcodes() if o[0]!='equal']
# merge ops closer than 3 lines
m=[]
for o in ops:
    if m and o[1]-m[-1][2]<=3: m[-1]=('r',m[-1][1],o[2],m[-1][3],o[4])
    else: m.append(o)
out=[]; cur=old
for t,i1,i2,j1,j2 in m:
    c=0
    while True:
        lo,hi=max(0,i1-c),min(len(a),i2+c)
        os_='\n'.join(a[lo:hi]); 
        if os_ and old.count(os_)==1 and len(os_)>=20: break
        c+=1
    ns='\n'.join(a[lo:i1]+b[j1:j2]+a[i2:hi])
    out.append((os_,ns))
# verify applying sequentially reproduces new
s=old
for o,n in out:
    assert s.count(o)==1; s=s.replace(o,n)
assert s==new
json.dump(out,open(sys.argv[3],'w'),ensure_ascii=False)
print(len(out),sum(len(o)+len(n) for o,n in out))
