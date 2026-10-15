import sys,json,numpy as np
from PIL import Image
a=np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
# find ladder lane column: the darkest-banded column
cols=a.min(0); 
colprof=np.array([np.sort(a[:,x])[:20].mean() for x in range(a.shape[1])])
x=int(np.argmin(colprof[10:-10])+10)
col=a[:,max(0,x-3):x+3].mean(1)
base=np.median(col)
pk=[i for i in range(3,len(col)-3) if col[i]==col[i-3:i+4].min() and col[i]<base-25]
dep=[base-col[i] for i in pk]
thr=sorted(dep)[-3]-1 if len(dep)>=3 else 0
print(json.dumps([[x,i,bool(d>=thr)] for i,d in zip(pk,dep)]))
