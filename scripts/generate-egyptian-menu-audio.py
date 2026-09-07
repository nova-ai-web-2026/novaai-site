import math, random, wave, struct
from pathlib import Path

SR=44100
BPM=100
BEAT=60.0/BPM
BARS=2
DUR=BARS*4*BEAT
N=int(DUR*SR)
L=[0.0]*N
R=[0.0]*N
random.seed(2409)

def add(sig,start,pan=0.0,gain=1.0):
    pos=int(start*SR)
    if pos>=N:return
    left=math.cos((pan+1)*math.pi/4)*gain
    right=math.sin((pan+1)*math.pi/4)*gain
    for i,x in enumerate(sig):
        j=pos+i
        if j>=N:break
        L[j]+=x*left; R[j]+=x*right

def envelope(length,attack=.01,release=.08):
    a=max(1,int(attack*SR)); r=max(1,int(release*SR))
    out=[1.0]*length
    for i in range(min(a,length)):out[i]=i/a
    for k in range(min(r,length)):
        i=length-r+k
        if i>=0:out[i]*=(r-k)/r
    return out

def dum(start,amp=1.0):
    d=.22; m=int(d*SR); sig=[]
    for i in range(m):
        t=i/SR; f=55+95*math.exp(-11*t)
        ph=2*math.pi*f*t
        body=math.sin(ph)+.22*math.sin(2*ph)
        n=(random.random()*2-1)*.06
        sig.append((body+n)*math.exp(-12*t))
    add(sig,start,-.05,.23*amp)

def tak(start,amp=1.0):
    d=.085; m=int(d*SR); sig=[]
    for i in range(m):
        t=i/SR
        n=(random.random()*2-1)
        tone=math.sin(2*math.pi*(900-380*t)*t)
        sig.append((.34*tone+.66*n)*math.exp(-35*t))
    add(sig,start,.12,.07*amp)

def riq(start,amp=1.0):
    d=.07; m=int(d*SR); freqs=(2650,3270,4090,5180)
    sig=[]
    for i in range(m):
        t=i/SR
        metal=sum(math.sin(2*math.pi*f*t) for f in freqs)/len(freqs)
        n=(random.random()*2-1)*.45
        sig.append((metal*.55+n)*math.exp(-29*t))
    add(sig,start,.28,.045*amp)

def accordion(freq,start,dur,amp=.05):
    m=int(dur*SR); sig=[]
    for i in range(m):
        t=i/SR; vib=1+.0022*math.sin(2*math.pi*5.2*t)
        x=0.0
        for cents,g in ((-8,.32),(0,.46),(7,.28)):
            f=freq*(2**(cents/1200))*vib
            ph=2*math.pi*f*t
            x+=g*(math.sin(ph)+.42*math.sin(2*ph)+.16*math.sin(3*ph))
        a=min(1,t/.035); rel=min(1,max(0,(dur-t)/.11))
        sig.append(x*a*rel)
    add(sig,start,-.25,amp)

def arghul(freq,start,dur,amp=.052,slide=None):
    m=int(dur*SR); sig=[]; phase=0.0
    for i in range(m):
        t=i/SR
        base=freq
        if slide and t<.07: base=slide+(freq-slide)*(t/.07)
        vib=1+.0045*math.sin(2*math.pi*6.1*t)+.0015*math.sin(2*math.pi*8.6*t)
        phase+=2*math.pi*(base*vib)/SR
        x=math.sin(phase)+.58*math.sin(2*phase)+.33*math.sin(3*phase)+.18*math.sin(5*phase)
        x+=(random.random()*2-1)*.035
        a=min(1,t/.018); rel=min(1,max(0,(dur-t)/.06))
        sig.append(x*a*rel)
    add(sig,start,.18,amp)

# D Bayati: the second degree is E half-flat (~quarter-tone colour).
BAYATI=[293.66,320.24,349.23,392.00,440.00,466.16,523.25,587.33]
SIX=BEAT/4
for bar in range(BARS):
    base=bar*4*BEAT
    for s in (0,4,8,12): dum(base+s*SIX,1.0 if s==0 else .80)
    for s in (2,6,10,14): tak(base+s*SIX,.95 if s in (6,14) else .72)
    for s in (1,3,5,7,9,11,13,15): riq(base+s*SIX,.55 if s%4==1 else .36)
    accordion(146.83,base,4*BEAT,.050)
    accordion(220.00,base,4*BEAT,.028)

phrases=((0,1,2,1,0,3,2,1),(0,1,2,3,2,1,0,4))
EIGHT=BEAT/2
for bar,p in enumerate(phrases):
    base=bar*4*BEAT
    for i,idx in enumerate(p):
        f=BAYATI[idx]
        slide=f*(2**(-45/1200)) if i in (1,5) else None
        arghul(f,base+i*EIGHT,EIGHT*.78,.060 if i in (0,4) else .050,slide)
    # short shaabi keyboard call-response at the end of each bar
    for j,f in enumerate((BAYATI[2],BAYATI[1],BAYATI[0])):
        accordion(f,base+2.55*BEAT+j*.17,.20,.042)

# Soft saturation and normalize.
peak=1e-9
for i in range(N):
    L[i]=math.tanh(L[i]*1.35); R[i]=math.tanh(R[i]*1.35)
    peak=max(peak,abs(L[i]),abs(R[i]))
scale=.90/peak
fade=int(.008*SR)
for i in range(N):
    f=1.0
    if i<fade:f=i/fade
    elif i>=N-fade:f=(N-i-1)/fade
    L[i]*=scale*f; R[i]*=scale*f

out=Path('egypt-life-sim-v2/assets')
out.mkdir(parents=True,exist_ok=True)
wav=out/'egyptian-menu-loop.wav'
with wave.open(str(wav),'w') as w:
    w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR)
    frames=bytearray()
    for a,b in zip(L,R):
        frames+=struct.pack('<hh',int(max(-1,min(1,a))*32767),int(max(-1,min(1,b))*32767))
    w.writeframes(frames)

# A short unmistakable button sting using the same Bayati/tabla palette.
D2=.85; M=int(D2*SR); sL=[0.0]*M; sR=[0.0]*M
oldL,oldR,oldN=L,R,N
L,R,N=sL,sR,M
dum(0,1.1);riq(.12,.9);arghul(BAYATI[0],.18,.18,.075);arghul(BAYATI[1],.36,.18,.078,BAYATI[0]);accordion(BAYATI[2],.54,.26,.080)
peak=max(max(map(abs,L)),max(map(abs,R)),1e-9); sc=.90/peak
sting=out/'egyptian-button-sting.wav'
with wave.open(str(sting),'w') as w:
    w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR)
    frames=bytearray()
    for a,b in zip(L,R):frames+=struct.pack('<hh',int(max(-1,min(1,a*sc))*32767),int(max(-1,min(1,b*sc))*32767))
    w.writeframes(frames)
print(wav,sting)
