import { clamp, rnd } from '../engine/musicEngine';

export function playKickVoice({ audioRef, getLaneGain, trackNode, gc, ss, st, driveCurve, genreConfig, drumPreset, noiseMix, drumDecay, bassSubAmt, accent, time }) {
  const a = audioRef.current;
  const preset = drumPreset || {};
  const kickWeight = preset.kickWeight ?? 1;
  const kickClick = preset.kickClick ?? 0.3;
  const kickDrive = preset.kickDrive ?? 0.08;
  const kickPunch = preset.kickPunch ?? 1;
  const bodyType = preset.kickBodyType || 'sine';
  const kf = (genreConfig.kickFreq || 90) * clamp(0.9 + kickPunch * 0.1, 0.82, 1.18);
  const ke = Math.max(20, (genreConfig.kickEnd || 35) * clamp(0.85 + kickWeight * 0.15, 0.7, 1.3));
  const et = 0.08 + drumDecay * 0.12;
  const dt = (0.14 + drumDecay * 0.18) * clamp(0.9 + kickWeight * 0.15, 0.75, 1.4);

  const body = a.ctx.createOscillator();
  const bG = a.ctx.createGain();
  const sub = a.ctx.createOscillator();
  const sG = a.ctx.createGain();
  const click = a.ctx.createBufferSource();
  const cG = a.ctx.createGain();
  const mG = a.ctx.createGain();
  const sh = a.ctx.createWaveShaper();

  body.type = bodyType;
  body.frequency.setValueAtTime(kf, time);
  body.frequency.exponentialRampToValueAtTime(ke, time + et);

  sub.type = 'sine';
  sub.frequency.setValueAtTime(kf * 0.5, time);
  sub.frequency.exponentialRampToValueAtTime(Math.max(18, ke * 0.5), time + et);

  const cb = a.ctx.createBuffer(1, Math.floor(a.ctx.sampleRate * 0.004), a.ctx.sampleRate);
  const cd = cb.getChannelData(0);
  for (let i = 0; i < cd.length; i += 1) cd[i] = rnd() * 2 - 1;
  click.buffer = cb;
  driveCurve(sh, kickDrive + noiseMix * 0.08);

  bG.gain.setValueAtTime(0, time);
  bG.gain.linearRampToValueAtTime(0.82 * accent * kickWeight, time + 0.001);
  bG.gain.exponentialRampToValueAtTime(0.001, time + dt);

  sG.gain.setValueAtTime(0, time);
  sG.gain.linearRampToValueAtTime(0.5 * accent * bassSubAmt * (preset.kickSub ?? 1), time + 0.001);
  sG.gain.exponentialRampToValueAtTime(0.001, time + dt * 1.2);

  cG.gain.setValueAtTime(0, time);
  cG.gain.linearRampToValueAtTime(kickClick * accent, time + 0.0005);
  cG.gain.exponentialRampToValueAtTime(0.001, time + 0.006);

  body.connect(sh); sh.connect(bG); sub.connect(sG); click.connect(cG);
  bG.connect(mG); sG.connect(mG); cG.connect(mG);
  mG.connect(getLaneGain('kick') || a.bus);

  const dur = (dt + 0.1) * 1000 + 200;
  trackNode(dur);
  gc(body, [sub, click, bG, sG, cG, mG, sh], dur);
  ss(body, time); ss(sub, time); ss(click, time);
  st(body, time + dt + 0.05); st(sub, time + dt + 0.08); st(click, time + 0.008);
}

export function playSnareVoice({ audioRef, getLaneGain, noiseBuffer, gc, ss, st, genreConfig, drumPreset, noiseMix, compress, drumDecay, accent, time }) {
  const a = audioRef.current;
  const preset = drumPreset || {};
  const snap = preset.snareSnap ?? 1;
  const color = preset.snareColor || genreConfig.noiseColor || 'white';
  const nb = noiseBuffer(0.18, (0.24 + noiseMix * 0.5) * snap, color);
  const src = a.ctx.createBufferSource();
  const fil = a.ctx.createBiquadFilter();
  const g = a.ctx.createGain();
  src.buffer = nb;
  fil.type = 'bandpass';
  fil.frequency.value = (1600 + noiseMix * 400) * (preset.snareTone ?? 1);
  fil.Q.value = 1 + compress * 0.4 + (preset.snareQ ?? 0);
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(0.55 * accent * snap, time + 0.002);
  g.gain.exponentialRampToValueAtTime(0.001, time + (0.055 + drumDecay * 0.12) * (preset.snareDecay ?? 1));
  src.connect(fil); fil.connect(g); g.connect(getLaneGain('snare') || a.bus);
  gc(src, [fil, g], 500); ss(src, time); st(src, time + 0.2);
}

export function playHatVoice({ audioRef, getLaneGain, noiseBuffer, gc, ss, st, genreConfig, drumPreset, noiseMix, drumDecay, accent, time, open = false }) {
  const a = audioRef.current;
  const preset = drumPreset || {};
  const nb = noiseBuffer(open ? 0.3 : 0.12, 0.18 + noiseMix * 0.35, genreConfig.noiseColor || 'white');
  const src = a.ctx.createBufferSource();
  const fil = a.ctx.createBiquadFilter();
  const g = a.ctx.createGain();
  src.buffer = nb;
  fil.type = 'highpass';
  const hatBrightness = preset.hatBrightness ?? 1;
  fil.frequency.value = (open ? 7000 : 8500) * hatBrightness;
  const hatDecay = preset.hatDecay ?? 1;
  const decay = open
    ? (0.08 + drumDecay * 0.25) * (preset.hatOpenDecay ?? hatDecay)
    : (0.008 + drumDecay * 0.04) * hatDecay;
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime((0.3 * (preset.hatLevel ?? 1)) * accent, time + 0.001);
  g.gain.exponentialRampToValueAtTime(0.001, time + decay);
  src.connect(fil); fil.connect(g); g.connect(getLaneGain('hat') || a.bus);
  gc(src, [fil, g], 650); ss(src, time); st(src, time + (open ? 0.35 : 0.15));
}
