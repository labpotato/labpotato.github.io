# 8-bit sound design: synthesises the SFX events (and an optional chiptune loop) to a WAV.
import sys, json, numpy as np, wave
SR = 44100
def sq(f, t, duty=.5): return np.where((f * t) % 1 < duty, 1.0, -1.0) if np.isscalar(f) else np.where((np.cumsum(f) / SR) % 1 < duty, 1.0, -1.0)
def tri(phase): return 2 * np.abs(2 * (phase % 1) - 1) - 1
def env(n, a=.005, d=None):
    t = np.arange(n) / SR; e = np.minimum(1, t / a)
    return e * (np.exp(-t / d) if d else 1)
def sweep(f0, f1, dur, duty=.5, curve=1):
    n = int(dur * SR); k = np.linspace(0, 1, n) ** curve
    f = f0 + (f1 - f0) * k; return sq(f, None, duty)
def noise(n): return np.random.default_rng(1).uniform(-1, 1, n)
def S(name, dur=None):
    if name == 'pop':   x = sweep(500, 1100, .07, .25) * env(int(.07 * SR), d=.03)
    elif name == 'tick': x = sq(1760, np.arange(int(.035 * SR)) / SR, .25) * env(int(.035 * SR), d=.012)
    elif name == 'hop': x = sweep(250, 800, .13, .5, .6) * env(int(.13 * SR), d=.08)
    elif name == 'boing':
        n = int(.38 * SR); t = np.arange(n) / SR
        f = 160 + 380 * (t / .38) + 60 * np.sin(2 * np.pi * 18 * t)
        x = sq(f, None, .5) * env(n, d=.18)
    elif name == 'whoosh':
        n = int(.5 * SR); x = noise(n); x = np.convolve(x, np.ones(12) / 12, 'same'); x *= np.sin(np.linspace(0, np.pi, n)) ** 2
    elif name == 'click': x = noise(int(.02 * SR)) * env(int(.02 * SR), d=.005)
    elif name == 'bump':
        n = int(.2 * SR); t = np.arange(n) / SR; x = np.sin(2 * np.pi * (110 - 200 * t) * t) * env(n, d=.07) + .4 * noise(n) * env(n, d=.02)
    elif name == 'kick':
        n = int(.25 * SR); t = np.arange(n) / SR; x = np.sin(2 * np.pi * (140 - 300 * t) * t) * env(n, d=.08) + .6 * noise(n) * env(n, d=.03)
    elif name == 'ding':   # 8-bit coin
        a = sq(988, np.arange(int(.07 * SR)) / SR, .5); b = sq(1319, np.arange(int(.4 * SR)) / SR, .5) * env(int(.4 * SR), d=.15)
        x = np.concatenate([a, b])
    elif name == 'sparkle':
        x = np.concatenate([sq(f, np.arange(int(.05 * SR)) / SR, .25) * env(int(.05 * SR), d=.03) for f in (1047, 1319, 1568, 2093, 2637)])
    elif name == 'wahwah':
        parts = []
        for f, d in ((392, .28), (370, .28), (349, .28), (330, .9)):
            n = int(d * SR); t = np.arange(n) / SR; vib = 1 + (.03 if d > .5 else 0) * np.sin(2 * np.pi * 6 * t)
            parts.append(sq(f * vib, None, .5) * np.minimum(1, t / .03) * np.minimum(1, (d - t) / .05))
        x = np.concatenate(parts) * .7
    elif name == 'snore':
        n = int(.9 * SR); t = np.arange(n) / SR; x = (noise(n) * .5 + .5 * sq(70, t, .3)) * np.sin(np.pi * t / .9) ** 2 * .5
    elif name == 'rumble':
        n = int(dur * SR); t = np.arange(n) / SR; ramp = (t / dur) ** 1.5
        x = sq(55 + 30 * ramp, t, .5) * .5 * ramp + noise(n) * .35 * ramp * (np.sin(2 * np.pi * 13 * t) > .3)
        x *= np.minimum(1, (dur - t) / .05)
    elif name == 'swipe':
        n = int(.25 * SR); x = noise(n); x = np.convolve(x, np.ones(6) / 6, 'same') * np.sin(np.linspace(0, np.pi, n))
    elif name == 'type':
        x = np.concatenate([sq(1200 + 200 * (i % 3), np.arange(int(.025 * SR)) / SR, .25) * env(int(.025 * SR), d=.008) * (1 if i % 2 == 0 else 0) for i in range(12)])
    else: raise SystemExit('unknown sfx ' + name)
    return x.astype(float)
VOL = {'pop': .28, 'tick': .22, 'hop': .3, 'boing': .32, 'whoosh': .35, 'click': .4, 'bump': .6, 'kick': .6, 'ding': .3, 'sparkle': .25, 'wahwah': .3, 'snore': .35, 'rumble': .35, 'swipe': .3, 'type': .25}

def music(dur, bpm=128):
    # cheerful 8-bit loop: bass (triangle) + lead (12.5% square) + hats, I–vi–IV–V in C
    n = int(dur * SR); out = np.zeros(n); beat = 60 / bpm
    chords = [(48, [60, 64, 67]), (45, [57, 60, 64]), (41, [53, 57, 60]), (43, [55, 59, 62])]
    mel = [72, 76, 79, 76, 74, 72, 69, 72, 69, 72, 76, 72, 71, 74, 79, 74]
    hz = lambda m: 440 * 2 ** ((m - 69) / 12)
    step = beat / 2; i = 0; t0 = 0
    while t0 < dur:
        bar = int(t0 / (4 * beat)) % 4; root, tri_notes = chords[bar]
        s0 = int(t0 * SR); m = int(step * SR); tt = np.arange(m) / SR
        bass = tri(hz(root - 12 + (12 if i % 2 else 0)) * tt) * env(m, d=.12) * .5
        arp = sq(hz(tri_notes[i % 3] + 12), tt, .25) * env(m, d=.05) * .12
        lead = sq(hz(mel[i % 16]), tt, .125) * env(m, d=.09) * (.16 if i % 2 == 0 else .1)
        hat = noise(m) * env(m, d=.01) * (.08 if i % 2 else .03)
        seg = bass + arp + lead + hat
        e = min(n, s0 + m); out[s0:e] += seg[:e - s0]; t0 += step; i += 1
    fade = np.minimum(1, (dur - np.arange(n) / SR) / 1.0); return out * fade * .55

if __name__ == '__main__':
    ev = json.load(open(sys.argv[1])); dur = float(sys.argv[2]); outp = sys.argv[3]; with_music = sys.argv[4] == '1'
    n = int(dur * SR); mix = np.zeros(n)
    if with_music: mix += music(dur)
    for e in ev:
        name, t = e[0], e[1]
        x = S(name, (e[2] - e[1]) if len(e) > 2 else None) * VOL[name]
        s0 = int(t * SR); e1 = min(n, s0 + len(x)); mix[s0:e1] += x[:e1 - s0]
    mix = np.tanh(mix * 1.1) * .8
    pcm = (mix * 32767).astype(np.int16); st = np.stack([pcm, pcm], 1)
    w = wave.open(outp, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes()); w.close()
