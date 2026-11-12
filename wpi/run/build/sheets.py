from PIL import Image
import glob, sys
fs=sorted(glob.glob('/tmp/pg/p-*.jpg')); print(len(fs))
ims=[Image.open(f) for f in fs]
n=int(sys.argv[1]) if len(sys.argv)>1 else 4
for k in range(0,len(ims),n):
    g=ims[k:k+n]; h=max(i.size[1] for i in g); w=sum(i.size[0] for i in g)
    s=Image.new('RGB',(w,h),'white'); x=0
    for im in g: s.paste(im,(x,0)); x+=im.size[0]
    s.save(f'/tmp/pg/sheet{k//n}.jpg',quality=85)
