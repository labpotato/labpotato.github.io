// Renders a reel HTML to MP4 (1080x1920, 30 fps) + two audio versions.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const { spawn, execFileSync } = require('child_process'); const fs = require('fs'); const path = require('path');
(async () => {
  const [, , file, outBase, fpsArg] = process.argv; const FPS = +(fpsArg || 30);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + path.resolve(file));
  await p.evaluate(() => document.fonts.load('700 40px "Pixelify Sans"'));
  const dur = await p.evaluate(() => window.DURATION); const sfx = await p.evaluate(() => window.SFX || []);
  fs.writeFileSync(outBase + '.sfx.json', JSON.stringify(sfx));
  const N = Math.round(dur * FPS);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-tune', 'animation', outBase + '.video.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = 0; f < N; f++) {
    await p.evaluate(async t => { await render(t); }, f / FPS);
    const buf = await p.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 60 === 0) process.stdout.write(`frame ${f}/${N}\n`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close();
  for (const [m, suf] of [['1', ''], ['0', '_sfx-only']]) {
    execFileSync('python3', ['sfx.py', outBase + '.sfx.json', String(dur), outBase + suf + '.wav', m]);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', outBase + '.video.mp4', '-i', outBase + suf + '.wav', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', outBase + suf + '.mp4']);
  }
  console.log('done');
})();
