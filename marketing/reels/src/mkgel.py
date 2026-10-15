import numpy as np
from PIL import Image, ImageFilter
rng=np.random.default_rng(7)
W,H=900,640
img=np.full((H,W),235.0)
# gentle background gradient + noise
img-= np.linspace(0,10,H)[:,None]
nl=10; x0=70; lw=60; gap=16
ladder=[250,130,100,70,55,35,25,15,10]
def y_of(kda): # log-linear migration
    import math
    return 70+ (math.log10(250)-math.log10(kda))/(math.log10(250)-math.log10(8.5))*520
def band(cx,y,inten,thick=7,width=lw):
    yy,xx=np.mgrid[0:H,0:W]
    prof=np.exp(-((yy-y)/thick)**2)*np.clip(1-np.abs((xx-cx)/(width/2))**6,0,1)
    return prof*inten
samples=[None,[(70,90),(55,40),(25,60)],[(70,120),(55,40),(25,55)],[(70,150),(55,45),(25,60)],[(70,175),(55,40),(25,58)],
         [(100,60),(35,110)],[(100,90),(35,110)],[(100,130),(35,105)],[(130,40),(15,80)],[(130,70),(15,85)]]
for i in range(nl):
    cx=x0+i*(lw+gap)+lw/2
    # smear
    yy,xx=np.mgrid[0:H,0:W]
    if i>0: img-= 10*np.exp(-((xx-cx)/(lw/2.2))**8)*((yy>60)&(yy<600))
    if i==0:
        for k in ladder: img-=band(cx,y_of(k),170 if k in (10,25,70) else 105,5)
    else:
        for kda,inten in samples[i]: img-=band(cx+rng.normal(0,1),y_of(kda)+rng.normal(0,2),inten,7)
# wells
for i in range(nl):
    cx=x0+i*(lw+gap)+lw/2
    img[34:44,int(cx-lw/2):int(cx+lw/2)]-=70
img+=rng.normal(0,2.5,img.shape)
img=np.clip(img,0,255)
g=Image.fromarray(img.astype('uint8')).filter(ImageFilter.GaussianBlur(0.9))
# coomassie tint
a=np.asarray(g).astype(float)/255
a=a**1.6; rgb=np.stack([20+a*225,35+a*205,95+a*150],-1)
Image.fromarray(np.clip(rgb,0,255).astype('uint8')).rotate(-0.5,fillcolor=(232,234,240),resample=Image.BICUBIC).save('gel.png')
print('ok')
