# Sound for reel 3: a droid-style voice for the potato (R2-D2 / WALL-E chirps),
# cartoon foley, and a mood-following ukulele score. Pure numpy, no samples.
import sys, json, numpy as np, wave
SR = 44100
rng = np.random.default_rng(3)
T = lambda d: np.arange(int(d * SR)) / SR

def env(n, a=.004, r=.03):
    t = np.arange(n) / SR; d = n / SR
    return np.minimum(1, t / a) * np.minimum(1, np.maximum(0, d - t) / r)
def osc(freq, shape='sine'):
    ph = np.cumsum(freq) / SR
    if shape == 'sine': return np.sin(2 * np.pi * ph)
    if shape == 'tri': return 2 * np.abs(2 * (ph % 1) - 1) - 1
    if shape == 'sq': return np.sign(np.sin(2 * np.pi * ph)) * .6
    if shape == 'saw': return 2 * (ph % 1) - 1
def glide(f0, f1, d, curve=1.0):
    k = np.linspace(0, 1, int(d * SR)) ** curve
    return f0 * (f1 / f0) ** k
def lp(x, a=.2):  # one-pole low-pass
    y = np.zeros_like(x); acc = 0.0
    for i in range(len(x)): acc += a * (x[i] - acc); y[i] = acc
    return y
def lpf(x, k=8): return np.convolve(x, np.ones(k) / k, 'same')
def noise(d): return rng.uniform(-1, 1, int(d * SR))
def cat(*xs): return np.concatenate(xs)
def sil(d): return np.zeros(int(d * SR))
def add(*xs):  # sum arrays of different lengths
    out = np.zeros(max(len(x) for x in xs))
    for x in xs: out[:len(x)] += x
    return out

# ---------- droid voice: FM chirps with pitch glides ----------
def chirp(f0, f1, d, vib=0, vibr=18, fm=.6, curve=1.0, amp=1.0):
    f = glide(f0, f1, d, curve)
    if vib: f = f * (1 + vib * np.sin(2 * np.pi * vibr * T(d)[:len(f)]))
    mod = np.sin(2 * np.pi * np.cumsum(f * 2.0) / SR) * fm
    car = np.sin(2 * np.pi * np.cumsum(f) / SR + mod)
    return car * env(len(f), .003, min(.03, d / 3)) * amp
def voice(kind):
    if kind == 'gasp': return cat(chirp(500, 2300, .12, curve=.6), chirp(2300, 2600, .08, vib=.04))
    if kind == 'grumble':
        d = .5; f = 170 + 30 * np.sin(2 * np.pi * 7 * T(d)); x = osc(f, 'saw') * .6 + osc(f * 1.5, 'sq') * .3
        return lpf(x, 6) * env(len(x), .02, .08) * (0.6 + .4 * np.sin(2 * np.pi * 11 * T(d)))
    if kind == 'angry':
        return cat(*[lpf(osc(glide(300 - i * 25, 220 - i * 25, .11), 'saw'), 5) * env(int(.11 * SR)) for i in range(5)]) * .9
    if kind == 'content': return cat(chirp(700, 900, .1), chirp(900, 650, .22, vib=.03))
    if kind == 'sigh': return chirp(900, 300, .7, vib=.02, curve=.7, fm=.3) * .8 + lpf(noise(.7), 30) * np.linspace(.3, 0, int(.7 * SR))
    if kind == 'impatient': return cat(chirp(1100, 1100, .07), sil(.04), chirp(1100, 1100, .07), sil(.04), chirp(1100, 1500, .12))
    if kind == 'wired':
        return cat(*[chirp(1200 + 900 * rng.random(), 1500 + 1200 * rng.random(), .045, fm=1.2) for _ in range(12)])
    if kind == 'happy': return cat(*[chirp(f, f * 1.25, .07) for f in (900, 1150, 1400, 1800)], chirp(2100, 2600, .16, vib=.05))
    if kind == 'phew': return chirp(1400, 600, .4, curve=.6, fm=.2) * .8 + lpf(noise(.4), 25) * np.linspace(.4, 0, int(.4 * SR))
    if kind == 'yay_small': return cat(chirp(1000, 1600, .08), chirp(1300, 2000, .12))
    if kind == 'uhoh': return cat(chirp(950, 980, .14, fm=.3), sil(.05), chirp(700, 620, .22, fm=.3, vib=.02))
    if kind == 'shock': return cat(chirp(400, 1800, .1, curve=.5), chirp(1800, 1700, .25, vib=.06, vibr=30))
    if kind == 'aww': return chirp(500, 1300, .9, vib=.035, vibr=7, fm=.25, curve=1.4)
    if kind == 'yay': return cat(*[chirp(f, f * 1.3, .06, fm=.8) for f in (800, 1000, 1300, 1600, 2000)], chirp(2400, 3000, .25, vib=.06, vibr=25))
    if kind == 'love': return cat(chirp(900, 1300, .18, vib=.03), chirp(1300, 1000, .3, vib=.04, vibr=8))
    if kind == 'whine': return chirp(1300, 450, .9, vib=.05, vibr=9, fm=.25, curve=.8)
    raise SystemExit('voice? ' + kind)

# ---------- foley ----------
def bell(f, d, dec=.4):
    t = T(d); return sum(np.sin(2 * np.pi * f * m * t) * a for m, a in ((1, 1), (2.76, .5), (5.4, .25))) * np.exp(-t / dec)
def sfx(name, dur=None):
    if name == 'alarm':
        d = dur; t = T(d); hammer = (np.sin(2 * np.pi * 24 * t) > 0).astype(float)
        x = (np.sin(2 * np.pi * 2350 * t) + .7 * np.sin(2 * np.pi * 2960 * t) + .3 * np.sin(2 * np.pi * 5200 * t)) * (.35 + .65 * hammer)
        return x * env(len(x), .005, .02) * .55
    if name == 'snore':
        d = .45; return lpf(noise(d), 40) * np.sin(np.pi * T(d) / d) ** 2 * .8 + .25 * osc(np.full(int(d * SR), 90.0), 'saw') * np.sin(np.pi * T(d) / d) ** 2
    if name == 'bubblepop': return chirp(600, 1400, .05, fm=0) * .8 + noise(.05) * np.exp(-T(.05) / .006) * .5
    if name == 'stretch': return osc(glide(200, 900, .14), 'tri') * env(int(.14 * SR)) * .7
    if name == 'slam': d = .3; t = T(d); return np.sin(2 * np.pi * (120 - 180 * t) * t) * np.exp(-t / .07) + noise(d) * np.exp(-t / .02) * .9
    if name == 'thud': d = .2; t = T(d); return np.sin(2 * np.pi * (90 - 100 * t) * t) * np.exp(-t / .06) + noise(d) * np.exp(-t / .01) * .4
    if name == 'sproing': d = .5; t = T(d); f = 300 + 160 * np.sin(2 * np.pi * 14 * t) * np.exp(-t / .25); return osc(f, 'tri') * np.exp(-t / .2) * .8
    if name in ('whoosh', 'whip', 'zoomoff', 'toss', 'punch'):
        d = {'whoosh': .35, 'whip': .3, 'zoomoff': .45, 'toss': .3, 'punch': .35}[name]
        x = lpf(noise(d), 4 if name != 'toss' else 8) * np.sin(np.pi * T(d) / d) ** 1.5
        if name == 'zoomoff': x = x + .4 * chirp(300, 1800, d, fm=0)
        if name == 'punch': x = x + .8 * np.sin(2 * np.pi * (80 - 60 * T(d)) * T(d)) * np.exp(-T(d) / .12)
        return x
    if name == 'run': d = dur; t = T(d); return (np.sin(2 * np.pi * 14 * t) > .7) * noise(d) * .5
    if name == 'skid': d = .3; return lpf(noise(d), 3) * np.linspace(1, 0, int(d * SR)) * .7 + chirp(1800, 900, d, fm=0) * .15
    if name == 'drip': d = .12; t = T(d); return np.sin(2 * np.pi * np.cumsum(glide(1600, 500, d)) / SR) * np.exp(-t / .03)
    if name == 'tap': d = .06; return noise(d) * np.exp(-T(d) / .008) * .7 + np.sin(2 * np.pi * 900 * T(d)) * np.exp(-T(d) / .01) * .4
    if name == 'grab': return add(noise(.08) * np.exp(-T(.08) / .015) * .6, bell(1800, .2, .05) * .2)
    if name == 'gulp': d = .16; t = T(d); return np.sin(2 * np.pi * np.cumsum(glide(420, 120, d)) / SR) * np.exp(-t / .05) + noise(d) * np.exp(-t / .006) * .3
    if name == 'zing': return chirp(250, 3200, .45, vib=.02, vibr=30, fm=1.0, curve=.7) * .8
    if name == 'clink': return bell(2600, .35, .08) * .6
    if name == 'pip': return add(noise(.025) * np.exp(-T(.025) / .004) * .8, chirp(1500, 2200, .04, fm=0) * .3)
    if name == 'bump': return add(sfx('thud') * .8, bell(1900, .25, .06) * .25)
    if name == 'wobble': d = dur; t = T(d); return bell(2200, d, 10) * (np.sin(2 * np.pi * 16 * t) > .5) * .3
    if name == 'slowmo': d = 1.0; t = T(d); return lpf(noise(d), 40) * np.sin(np.pi * t / d) * .8 + np.sin(2 * np.pi * 55 * t) * np.sin(np.pi * t / d) * .5
    if name == 'catch': return add(sfx('thud') * .6, bell(2400, .3, .06) * .3)
    if name == 'slide': d = .35; return lpf(noise(d), 6) * np.linspace(.8, 0, int(d * SR))
    if name == 'bonk': d = .35; t = T(d); return bell(520, d, .09) + np.sin(2 * np.pi * (200 - 300 * t) * t) * np.exp(-t / .05)
    if name == 'shatter':
        d = .6; t = T(d); x = noise(d) * np.exp(-t / .07) * .8
        for i in range(10):
            f = 2500 + 4000 * rng.random(); o = int(rng.random() * .25 * SR)
            b = bell(f, d - o / SR, .05 + .1 * rng.random()) * .15; x[o:o + len(b)] += b
        return x
    if name == 'blink': return chirp(2200, 2600, .03, fm=0) * .3
    if name == 'error':
        d = .5; t = T(d); return osc(np.full(len(t), 110.0), 'sq') * (np.sin(2 * np.pi * 8 * t) > 0) * env(len(t)) * .6
    if name == 'steam': d = dur; return lpf(noise(d), 2) * np.linspace(.2, .8, int(d * SR)) * .6
    if name == 'rattle': d = .4; t = T(d); return sum(bell(1500 + 700 * k, d, .04) * (np.roll((t * 30 % 1) < .08, k * 400)) for k in range(3)) * .25
    if name == 'scribble': d = dur; t = T(d); return lpf(noise(d), 3) * (.4 + .6 * np.abs(np.sin(2 * np.pi * 9 * t))) * .55
    if name == 'crumple':
        d = .3; x = np.zeros(int(d * SR))
        for _ in range(60): o = int(rng.random() * (len(x) - 300)); x[o:o + 300] += noise(300 / SR) * np.exp(-np.arange(300) / 40) * rng.random()
        return x * .5
    if name == 'rim': return add(bell(1300, .4, .12) * .7, sfx('thud') * .3)
    if name == 'timelapse':
        d = dur; t = T(d); ticks = (np.sin(2 * np.pi * np.cumsum(glide(8, 30, d)) / SR) > .97).astype(float)
        return lpf(noise(d), 3) * ticks * .8 + chirp(200, 1200, d, fm=0) * .15 + lpf(noise(d), 20) * np.linspace(0, .4, len(t))
    if name == 'button': return chirp(1500, 1500, .06, fm=0) * .5
    if name == 'hum': d = dur; t = T(d); return (np.sin(2 * np.pi * 120 * t) * .2 + lpf(noise(d), 30) * .2) * env(len(t), .1, .1)
    if name == 'ding': return add(bell(1568, 1.4, .5) * .7, bell(2093, 1.4, .4) * .4)
    if name == 'sparkle': return cat(*[chirp(f, f, .05, fm=0) * .4 for f in (2093, 2637, 3136, 4186, 3136, 4186)])
    if name == 'hop': return chirp(300, 900, .1, fm=0) * .5
    if name == 'tada': return cat(chirp(784, 784, .1, fm=.2), chirp(1047, 1047, .35, vib=.02, fm=.2)) * .7
    if name == 'kiss': d = .12; t = T(d); return noise(d) * np.exp(-t / .01) * .4 + chirp(1800, 3000, d, fm=0) * .4
    if name == 'boing': d = .45; t = T(d); return osc(200 + 300 * t / d + 80 * np.sin(2 * np.pi * 16 * t), 'tri') * np.exp(-t / .2) * .7
    if name == 'spin': d = .4; return lpf(noise(d), 5) * np.abs(np.sin(2 * np.pi * 6 * T(d))) * .6
    if name == 'confetti':
        d = .8; x = np.zeros(int(d * SR)); x[:2000] += noise(2000 / SR) * np.exp(-np.arange(2000) / 200)
        for _ in range(40): o = int(rng.random() * (len(x) - 200)); x[o:o + 200] += noise(200 / SR) * .2
        return x * .8
    raise SystemExit('sfx? ' + name)
GAIN = {'alarm': .45, 'v_': .5, 'shatter': .55, 'slam': .7, 'ding': .5}

# ---------- ukulele score (Karplus-Strong plucks) ----------
def pluck(f, d, bright=.5):
    n = int(d * SR); p = max(2, int(SR / f)); buf = rng.uniform(-1, 1, p) * bright; out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]; buf[i % p] = .996 * .5 * (buf[i % p] + buf[(i + 1) % p])
    return out
_pcache = {}
def P(f, d, b=.5):
    k = (round(f, 1), round(d, 2), b)
    if k not in _pcache: _pcache[k] = pluck(f, d, b)
    return _pcache[k]
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
STYLES = {
    'morning': dict(bpm=124, chords=[[60, 64, 67, 72], [55, 59, 62, 67], [57, 60, 64, 69], [53, 57, 60, 65]], vol=.32, pat='strum'),
    'tense': dict(bpm=124, chords=[[57, 60, 64], [53, 57, 60], [52, 56, 59], [57, 60, 64]], vol=.22, pat='pizz'),
    'night': dict(bpm=66, chords=[[57, 60, 64, 69], [53, 57, 60, 65]], vol=.2, pat='arp'),
    'triumph': dict(bpm=136, chords=[[60, 64, 67, 72], [65, 69, 72, 77], [67, 71, 74, 79], [60, 64, 67, 72]], vol=.34, pat='strum'),
}
def music(sections, dur):
    out = np.zeros(int(dur * SR))
    for name, a, b in sections:
        st = STYLES[name]; beat = 60 / st['bpm']; step = beat / 2; t = a; i = 0
        while t < b - .02:
            ch = st['chords'][int((t - a) / (4 * beat)) % len(st['chords'])]
            notes = []
            if st['pat'] == 'strum':
                if i % 8 in (0, 3, 4, 6, 7): notes = [(hz(m), .02 * j) for j, m in enumerate(ch)]
                if i % 4 == 0: notes.append((hz(ch[0] - 24), 0))
            elif st['pat'] == 'pizz':
                notes = [(hz(ch[i % len(ch)] - (12 if i % 2 else 0)), 0)]
            else:
                notes = [(hz(ch[i % len(ch)] + 12), 0)] + ([(hz(ch[0] - 12), 0)] if i % 4 == 0 else [])
            for f, off in notes:
                x = P(f, min(1.2, b - t + .3), .6 if st['pat'] != 'arp' else .35) * st['vol']
                s0 = int((t + off) * SR); e = min(len(out), s0 + len(x)); out[s0:e] += x[:e - s0]
            t += step; i += 1
        # soft release at the section end
        e0 = int(b * SR); e1 = min(len(out), e0 + int(.25 * SR)); out[e1:] = out[e1:]
    return out

if __name__ == '__main__':
    cues = json.load(open(sys.argv[1])); secs = json.load(open(sys.argv[2])); dur = float(sys.argv[3]); outp = sys.argv[4]; with_music = sys.argv[5] == '1'
    n = int(dur * SR); mix = np.zeros(n)
    if with_music: mix += music(secs, dur)
    for c in cues:
        name, t0 = c[0], c[1]; d = (c[2] - c[1]) if len(c) > 2 else None
        if name.startswith('v_'): x = voice(name[2:]) * GAIN['v_']
        else: x = sfx(name, d) * GAIN.get(name, .45)
        s0 = int(t0 * SR); e = min(n, s0 + len(x)); mix[s0:e] += x[:e - s0]
    mix = np.tanh(mix * 1.2) * .85
    # 10 ms fades so the loop point is click-free
    f = int(.01 * SR); mix[:f] *= np.linspace(0, 1, f); mix[-f:] *= np.linspace(1, 0, f)
    pcm = (mix * 32767).astype(np.int16); stv = np.stack([pcm, pcm], 1)
    w = wave.open(outp, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(stv.tobytes()); w.close()
    print('ok', outp)
