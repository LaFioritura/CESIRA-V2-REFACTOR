/**
 * useAudioEngine
 * Owns the Web Audio context, synthesis, scheduling and transport.
 * Returns only the interface App needs: actions + reactive state.
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  clamp, rnd, pick,
  GENRES, MODES, NOTE_FREQ, NOTE_MIDI, CHROMA,
  GROOVE_MAPS, SECTIONS, SONG_ARCS,
  transposeNote, grooveAccent,
  MAX_STEPS, PAGE, SCHED, LOOK, UNDO,
} from '../engine/musicEngine';

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function safeStart(node, t) {
  try { node.start(t); } catch (_) {}
}
function safeStop(node, t) {
  try { node.stop(t); } catch (_) {}
}
function autoGC(src, extras, ms) {
  const cleanup = () => [src, ...extras].forEach(n => { try { n.disconnect(); } catch (_) {} });
  src.onended = cleanup;
  setTimeout(cleanup, ms);
}
function driveCurve(node, amt) {
  const k = 2 + clamp(amt, 0, 1) * 60;
  const size = 512;
  const curve = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const x = (i * 2) / size - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  node.curve = curve;
  node.oversample = '2x';
}
function identityCurve(node) {
  const curve = new Float32Array(512);
  for (let i = 0; i < 512; i++) curve[i] = (i * 2) / 512 - 1;
  node.curve = curve;
}
function reverbIR(ctx, dur = 1.2, dec = 2.6) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * dur);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / len, dec);
  }
  return buf;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAudioEngine({
  genre, modeName,
  bpmRef, swingRef, humanizeRef, grooveRef, grooveProfileRef,
  fmIdxRef, patternsRef, bassRef, synthRef, laneLenRef,
  noiseMix, drumDecay, bassSubAmt, synthFilter, bassFilter,
  space, tone, drive, compress, master,
  polySynth, bassStack,
  currentSectionName,
  regenerateSection,
  songActiveRef, arcRef, arcIdxRef, barCountRef,
  setArcIdx, setCurrentSectionName,
}) {
  const audioRef     = useRef(null);
  const analyserRef  = useRef(null);
  const laneGains    = useRef({});
  const activeNodes  = useRef(0);
  const schedulerRef = useRef(null);
  const nextNoteRef  = useRef(0);
  const stepRef      = useRef(0);
  const isPlayingRef = useRef(false);

  const [isReady,   setIsReady]   = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [step,      setStep]      = useState(0);
  const [laneVU,    setLaneVU]    = useState({ kick:0, snare:0, hat:0, bass:0, synth:0 });
  const [activeNotes, setActiveNotes] = useState({ bass: '—', synth: '—' });
  const vuTimers = useRef({});

  // ── FX helpers ──────────────────────────────────────────────────────────────

  const applyFxNow = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    const now = a.ctx.currentTime;
    const fx = GENRES[genre]?.fxProfile ?? {};
    driveCurve(a.preD, clamp((fx.drive ?? 0.3) * 0.4 + drive * 0.1, 0, 0.38));
    a.toneF.frequency.linearRampToValueAtTime(clamp(1800 + 12000 * (fx.tone ?? 0.6) * tone, 600, 19000), now + 0.08);
    a.lDly.delayTime.linearRampToValueAtTime(clamp(0.02 + space * 0.08, 0.01, 0.45), now + 0.08);
    a.rDly.delayTime.linearRampToValueAtTime(clamp(0.03 + space * 0.1,  0.01, 0.45), now + 0.08);
    a.fb.gain.linearRampToValueAtTime(clamp(0.06 + space * 0.2, 0.03, 0.4), now + 0.08);
    a.wet.gain.linearRampToValueAtTime(clamp(space * 0.18, 0, 0.25), now + 0.08);
    a.dry.gain.linearRampToValueAtTime(clamp(0.95 - space * 0.08, 0.72, 0.97), now + 0.08);
    a.chorus.gain.linearRampToValueAtTime(clamp(space * 0.08, 0, 0.14), now + 0.12);
    a.revW.gain.linearRampToValueAtTime(clamp((fx.space ?? 0.5) * space * 0.22, 0, 0.28), now + 0.14);
    a.out.gain.linearRampToValueAtTime(master, now + 0.06);
    a.comp.threshold.value = clamp(-20 - compress * 12, -32, -6);
    a.comp.ratio.value = clamp(2 + compress * 5, 1.5, 8);
  }, [genre, space, tone, drive, compress, master]);

  useEffect(() => { if (audioRef.current) applyFxNow(); }, [applyFxNow]);

  // ── Context init ──────────────────────────────────────────────────────────

  const initAudio = useCallback(async () => {
    if (audioRef.current) {
      await audioRef.current.ctx.resume();
      setIsReady(true);
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx({ sampleRate: 44100, latencyHint: 'interactive' });

    const bus    = ctx.createGain();          bus.gain.value = 0.68;
    const preD   = ctx.createWaveShaper();    identityCurve(preD);
    const toneF  = ctx.createBiquadFilter();  toneF.type = 'lowpass'; toneF.frequency.value = 16000; toneF.Q.value = 0.35;
    const comp   = ctx.createDynamicsCompressor();
    comp.threshold.value = -24; comp.knee.value = 18; comp.ratio.value = 3;
    comp.attack.value = 0.008; comp.release.value = 0.22;
    const lim    = ctx.createDynamicsCompressor();
    lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20;
    lim.attack.value = 0.001; lim.release.value = 0.04;
    const dry    = ctx.createGain();          dry.gain.value = 1;
    const wet    = ctx.createGain();          wet.gain.value = 0;
    const spl    = ctx.createChannelSplitter(2);
    const mrg    = ctx.createChannelMerger(2);
    const lDly   = ctx.createDelay(0.5);
    const rDly   = ctx.createDelay(0.5);
    const fb     = ctx.createGain();          fb.gain.value = 0.15;
    const dlyT   = ctx.createBiquadFilter();  dlyT.type = 'lowpass'; dlyT.frequency.value = 4500;
    const chorus = ctx.createGain();          chorus.gain.value = 0;
    const cD1    = ctx.createDelay(0.025);
    const cD2    = ctx.createDelay(0.031);
    const rev    = ctx.createConvolver();     rev.buffer = reverbIR(ctx);
    const revW   = ctx.createGain();          revW.gain.value = 0;
    const out    = ctx.createGain();          out.gain.value = 0.88;
    const an     = ctx.createAnalyser();      an.fftSize = 256; an.smoothingTimeConstant = 0.8;
    const dest   = ctx.createMediaStreamDestination();

    bus.connect(preD); preD.connect(toneF); toneF.connect(comp);
    comp.connect(dry); comp.connect(spl); comp.connect(cD1); comp.connect(cD2); comp.connect(rev);
    cD1.connect(chorus); cD2.connect(chorus); rev.connect(revW);
    spl.connect(lDly, 0); spl.connect(rDly, 1);
    rDly.connect(dlyT); dlyT.connect(fb); fb.connect(lDly);
    lDly.connect(mrg, 0, 0); rDly.connect(mrg, 0, 1); mrg.connect(wet);
    dry.connect(out); wet.connect(out); chorus.connect(out); revW.connect(out);
    out.connect(lim); lim.connect(an); lim.connect(ctx.destination); lim.connect(dest);

    audioRef.current = { ctx, bus, preD, toneF, comp, lim, dry, wet, lDly, rDly, fb, chorus, revW, out, an, dest };
    analyserRef.current = an;
    setIsReady(true);
    applyFxNow();
  }, [applyFxNow]);

  // ── Lane gain routing ──────────────────────────────────────────────────────

  const getLaneGain = useCallback((lane) => {
    const a = audioRef.current;
    if (!a) return null;
    if (!laneGains.current[lane]) {
      const g = a.ctx.createGain();
      g.gain.value = 1;
      g.connect(a.bus);
      laneGains.current[lane] = g;
    }
    return laneGains.current[lane];
  }, []);

  // ── Node lifecycle guard ───────────────────────────────────────────────────

  const nodeGuard = () => activeNodes.current < 90;
  const trackNode = (ms) => {
    activeNodes.current++;
    setTimeout(() => { activeNodes.current = Math.max(0, activeNodes.current - 1); }, ms + 80);
  };

  // ── VU flash ───────────────────────────────────────────────────────────────

  const flashLane = useCallback((lane, level = 1) => {
    setLaneVU(p => ({ ...p, [lane]: Math.min(1, level) }));
    if (vuTimers.current[lane]) clearInterval(vuTimers.current[lane]);
    vuTimers.current[lane] = setInterval(() => {
      setLaneVU(p => {
        const nv = Math.max(0, p[lane] - 0.2);
        if (nv <= 0) clearInterval(vuTimers.current[lane]);
        return { ...p, [lane]: nv };
      });
    }, 55);
  }, []);

  // ── Noise buffer ──────────────────────────────────────────────────────────

  const noiseBuffer = (len = 0.22, amt = 1, color = 'white') => {
    const a = audioRef.current;
    const sr = a.ctx.sampleRate;
    const buf = a.ctx.createBuffer(1, Math.floor(sr * len), sr);
    const d = buf.getChannelData(0);
    if (color === 'white') {
      for (let i = 0; i < d.length; i++) d[i] = (rnd() * 2 - 1) * amt;
      return buf;
    }
    let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0;
    for (let i = 0; i < d.length; i++) {
      const w = rnd() * 2 - 1;
      if (color === 'pink') {
        b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
        b2=0.969*b2+w*0.153852;   b3=0.8665*b3+w*0.310486;
        b4=0.55*b4+w*0.532952;    b5=-0.7616*b5-w*0.016898;
        d[i] = (b0+b1+b2+b3+b4+b5+w*0.5362) * amt * 0.11;
      } else {
        b0 = 0.99*b0 + w*0.01;
        d[i] = b0 * amt * 3;
      }
    }
    return buf;
  };

  const stepSec = () => (60 / bpmRef.current) / 4;

  // ── Drum synthesis ────────────────────────────────────────────────────────

  const playKick = (accent, t) => {
    if (!nodeGuard()) return;
    const a = audioRef.current;
    const gd = GENRES[genre];
    const kf = gd.kickFreq ?? 90;
    const ke = gd.kickEnd ?? 35;
    const et = 0.08 + drumDecay * 0.12;
    const dt = 0.16 + drumDecay * 0.22;
    const body = a.ctx.createOscillator(), bG = a.ctx.createGain();
    const sub  = a.ctx.createOscillator(), sG = a.ctx.createGain();
    const click = a.ctx.createBufferSource(), cG = a.ctx.createGain();
    const mG = a.ctx.createGain(), sh = a.ctx.createWaveShaper();
    body.type = 'sine';
    body.frequency.setValueAtTime(kf, t);
    body.frequency.exponentialRampToValueAtTime(Math.max(20, ke), t + et);
    sub.type = 'sine';
    sub.frequency.setValueAtTime(kf * 0.5, t);
    sub.frequency.exponentialRampToValueAtTime(Math.max(18, ke * 0.5), t + et);
    const cb = a.ctx.createBuffer(1, Math.floor(a.ctx.sampleRate * 0.004), a.ctx.sampleRate);
    const cd = cb.getChannelData(0);
    for (let i = 0; i < cd.length; i++) cd[i] = rnd() * 2 - 1;
    click.buffer = cb;
    driveCurve(sh, 0.05 + noiseMix * 0.08);
    bG.gain.setValueAtTime(0, t); bG.gain.linearRampToValueAtTime(0.82 * accent, t + 0.001); bG.gain.exponentialRampToValueAtTime(0.001, t + dt);
    sG.gain.setValueAtTime(0, t); sG.gain.linearRampToValueAtTime(0.5 * accent * bassSubAmt, t + 0.001); sG.gain.exponentialRampToValueAtTime(0.001, t + dt * 1.2);
    cG.gain.setValueAtTime(0, t); cG.gain.linearRampToValueAtTime(0.3 * accent, t + 0.0005); cG.gain.exponentialRampToValueAtTime(0.001, t + 0.006);
    body.connect(sh); sh.connect(bG); sub.connect(sG); click.connect(cG);
    bG.connect(mG); sG.connect(mG); cG.connect(mG);
    const dest = getLaneGain('kick') ?? a.bus;
    mG.connect(dest);
    const dur = (dt + 0.1) * 1000 + 200;
    trackNode(dur);
    autoGC(body, [sub, click, bG, sG, cG, mG, sh], dur);
    safeStart(body, t); safeStart(sub, t); safeStart(click, t);
    safeStop(body, t + dt + 0.05); safeStop(sub, t + dt + 0.08); safeStop(click, t + 0.008);
  };

  const playSnare = (accent, t) => {
    if (!nodeGuard()) return;
    const a = audioRef.current;
    const gd = GENRES[genre];
    const nb = noiseBuffer(0.18, 0.24 + noiseMix * 0.5, gd.noiseColor ?? 'white');
    const src = a.ctx.createBufferSource(), fil = a.ctx.createBiquadFilter(), g = a.ctx.createGain();
    src.buffer = nb;
    fil.type = 'bandpass'; fil.frequency.value = 1600 + noiseMix * 400; fil.Q.value = 1.0 + compress * 0.4;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.55 * accent, t + 0.002); g.gain.exponentialRampToValueAtTime(0.001, t + 0.055 + drumDecay * 0.12);
    src.connect(fil); fil.connect(g);
    (getLaneGain('snare') ?? a.bus).connect && g.connect(getLaneGain('snare') ?? a.bus);
    // simplified routing
    const dest = getLaneGain('snare') ?? a.bus; g.connect(dest);
    autoGC(src, [fil, g], 400); safeStart(src, t); safeStop(src, t + 0.2);
  };

  const playHat = (accent, t, open = false) => {
    if (!nodeGuard()) return;
    const a = audioRef.current;
    const gd = GENRES[genre];
    const nb = noiseBuffer(open ? 0.3 : 0.12, 0.18 + noiseMix * 0.35, gd.noiseColor ?? 'white');
    const src = a.ctx.createBufferSource(), fil = a.ctx.createBiquadFilter(), g = a.ctx.createGain();
    src.buffer = nb;
    fil.type = 'highpass'; fil.frequency.value = open ? 7000 : 8500;
    const decay = open ? 0.08 + drumDecay * 0.25 : 0.008 + drumDecay * 0.04;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.3 * accent, t + 0.001); g.gain.exponentialRampToValueAtTime(0.001, t + decay);
    src.connect(fil); fil.connect(g);
    const dest = getLaneGain('hat') ?? a.bus; g.connect(dest);
    autoGC(src, [fil, g], 600); safeStart(src, t); safeStop(src, t + (open ? 0.35 : 0.15));
  };

  // ── Voice helpers ─────────────────────────────────────────────────────────

  const getVoiceNotes = (baseNote, lane = 'synth') => {
    const mode = MODES[modeName] ?? MODES.minor;
    const pool = lane === 'bass' ? mode.b : mode.s;
    const idx = pool.indexOf(baseNote);
    if (lane === 'bass') {
      if (!bassStack) return [baseNote];
      const fifth = idx > -1 ? pool[Math.min(idx + 4, pool.length - 1)] : transposeNote(baseNote, 7);
      return [...new Set([baseNote, fifth])];
    }
    if (!polySynth) return [baseNote];
    if (idx === -1) return [...new Set([baseNote, transposeNote(baseNote, 4), transposeNote(baseNote, 7)])];
    return [...new Set([pool[idx], pool[Math.min(idx + 2, pool.length - 1)], pool[Math.min(idx + 4, pool.length - 1)]])];
  };

  // ── Bass synthesis ────────────────────────────────────────────────────────

  const playBassVoice = (note, accent, t, lenSteps = 1) => {
    if (!nodeGuard()) return;
    const a = audioRef.current;
    const f = NOTE_FREQ[note] ?? 110;
    const dur = clamp(stepSec() * lenSteps * 0.92, 0.04, 6);
    const cleanMs = dur * 1000 + 300;
    const mode = GENRES[genre]?.bassMode ?? 'fm';

    if (mode === 'drone' || mode === 'wet') {
      const o1 = a.ctx.createOscillator(), o2 = a.ctx.createOscillator();
      const lfo = a.ctx.createOscillator(), lg = a.ctx.createGain();
      o1.type = 'sine'; o2.type = 'sine';
      o1.frequency.value = f; o2.frequency.value = f * 1.007;
      lfo.frequency.value = 0.3 + rnd() * 0.4; lg.gain.value = f * 0.008;
      lfo.connect(lg); lg.connect(o1.frequency);
      const fil = a.ctx.createBiquadFilter(); fil.type = 'lowpass';
      fil.frequency.setValueAtTime(200 + bassFilter * 1400, t);
      fil.frequency.linearRampToValueAtTime(600 + bassFilter * 2200, t + 0.1);
      const amp = a.ctx.createGain();
      amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(0.55 * accent, t + 0.06); amp.gain.exponentialRampToValueAtTime(0.001, t + dur);
      const mix = a.ctx.createGain(); mix.gain.value = 0.5;
      o1.connect(mix); o2.connect(mix); mix.connect(fil); fil.connect(amp);
      const dest = getLaneGain('bass') ?? a.bus; amp.connect(dest);
      trackNode(cleanMs);
      autoGC(o1, [o2, lfo, lg, fil, amp, mix], cleanMs);
      safeStart(o1, t); safeStart(o2, t); safeStart(lfo, t);
      safeStop(o1, t + dur + 0.1); safeStop(o2, t + dur + 0.1); safeStop(lfo, t + dur + 0.1);
      return;
    }

    if (mode === 'sub' || mode === 'pulse') {
      const o = a.ctx.createOscillator(), sh = a.ctx.createWaveShaper();
      o.type = mode === 'pulse' ? 'square' : 'sine';
      o.frequency.value = f;
      driveCurve(sh, mode === 'sub' ? 0.02 : 0.18 + drive * 0.08);
      const fil = a.ctx.createBiquadFilter(); fil.type = 'lowpass';
      fil.frequency.value = 180 + bassFilter * 1800; fil.Q.value = 0.6 + bassFilter * 1.2;
      const amp = a.ctx.createGain();
      amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(0.68 * accent, t + 0.008); amp.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(sh); sh.connect(fil); fil.connect(amp);
      const dest = getLaneGain('bass') ?? a.bus; amp.connect(dest);
      trackNode(cleanMs);
      autoGC(o, [sh, fil, amp], cleanMs);
      safeStart(o, t); safeStop(o, t + dur + 0.05);
      return;
    }

    if (mode === 'fm' || mode === 'grit') {
      const car = a.ctx.createOscillator(), mod = a.ctx.createOscillator(), mg = a.ctx.createGain();
      car.type = 'sine'; mod.type = 'sine';
      car.frequency.value = f; mod.frequency.value = f * (mode === 'grit' ? 2.5 : 1.5);
      mg.gain.value = f * fmIdxRef.current;
      mod.connect(mg); mg.connect(car.frequency);
      const sh = a.ctx.createWaveShaper(); driveCurve(sh, mode === 'grit' ? 0.3 + drive * 0.2 : 0.04);
      const fil = a.ctx.createBiquadFilter(); fil.type = 'lowpass';
      fil.frequency.setValueAtTime(400 + bassFilter * 2000, t);
      fil.frequency.linearRampToValueAtTime(800 + bassFilter * 3000, t + 0.04);
      fil.Q.value = 0.8 + bassFilter * 2;
      const amp = a.ctx.createGain();
      amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(0.62 * accent, t + 0.005); amp.gain.exponentialRampToValueAtTime(0.001, t + dur);
      car.connect(sh); sh.connect(fil); fil.connect(amp);
      const dest = getLaneGain('bass') ?? a.bus; amp.connect(dest);
      trackNode(cleanMs);
      autoGC(car, [mod, mg, sh, fil, amp], cleanMs);
      safeStart(car, t); safeStart(mod, t); safeStop(car, t + dur + 0.05); safeStop(mod, t + dur + 0.05);
      return;
    }

    if (mode === 'bit' || mode === 'fold') {
      const o = a.ctx.createOscillator(), sh = a.ctx.createWaveShaper();
      o.type = 'sawtooth'; o.frequency.value = f;
      driveCurve(sh, mode === 'fold' ? 0.55 + drive * 0.3 : 0.38 + drive * 0.2);
      const fil = a.ctx.createBiquadFilter(); fil.type = 'lowpass';
      fil.frequency.value = 600 + bassFilter * 2400; fil.Q.value = 2 + bassFilter * 4;
      const amp = a.ctx.createGain();
      amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(0.5 * accent, t + 0.003); amp.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(sh); sh.connect(fil); fil.connect(amp);
      const dest = getLaneGain('bass') ?? a.bus; amp.connect(dest);
      trackNode(cleanMs);
      autoGC(o, [sh, fil, amp], cleanMs);
      safeStart(o, t); safeStop(o, t + dur + 0.05);
      return;
    }

    // saw (default)
    const o1 = a.ctx.createOscillator(), o2 = a.ctx.createOscillator();
    o1.type = 'sawtooth'; o2.type = 'sawtooth';
    o1.frequency.value = f; o2.frequency.value = f * 1.004;
    const fil = a.ctx.createBiquadFilter(); fil.type = 'lowpass';
    fil.frequency.value = 400 + bassFilter * 2200; fil.Q.value = 0.7;
    const amp = a.ctx.createGain();
    amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(0.6 * accent, t + 0.006); amp.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const mix = a.ctx.createGain(); mix.gain.value = 0.5;
    o1.connect(mix); o2.connect(mix); mix.connect(fil); fil.connect(amp);
    const dest = getLaneGain('bass') ?? a.bus; amp.connect(dest);
    trackNode(cleanMs);
    autoGC(o1, [o2, fil, amp, mix], cleanMs);
    safeStart(o1, t); safeStart(o2, t); safeStop(o1, t + dur + 0.05); safeStop(o2, t + dur + 0.05);
  };

  const playBass = (note, accent, t, lenSteps = 1) => {
    const notes = Array.isArray(note) ? note : getVoiceNotes(note, 'bass');
    const voiceAccent = accent / Math.sqrt(Math.max(1, notes.length));
    notes.forEach(voice => playBassVoice(voice, voiceAccent, t, lenSteps));
    setActiveNotes(p => ({ ...p, bass: notes.join(' · ') }));
    // MIDI out
    // (midi forwarded separately if needed)
  };

  // ── Synth synthesis ───────────────────────────────────────────────────────

  const playSynthVoice = (note, accent, t, lenSteps = 1) => {
    if (!nodeGuard()) return;
    const a = audioRef.current;
    const f = NOTE_FREQ[note] ?? 261;
    const dur = clamp(stepSec() * lenSteps * 0.92, 0.06, 8);
    const cleanMs = dur * 1000 + 500;
    const mode = GENRES[genre]?.synthMode ?? 'lead';

    if (mode === 'bell' || mode === 'glass') {
      const car = a.ctx.createOscillator(), mod = a.ctx.createOscillator(), mg = a.ctx.createGain();
      car.type = 'sine'; mod.type = 'sine';
      car.frequency.value = f; mod.frequency.value = f * 3.5;
      mg.gain.value = f * 2.2 * fmIdxRef.current;
      mod.connect(mg); mg.connect(car.frequency);
      const amp = a.ctx.createGain();
      amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(0.32 * accent, t + 0.001);
      amp.gain.exponentialRampToValueAtTime(0.001, t + Math.max(0.3, dur * 1.4 + space * 0.8));
      const dest = getLaneGain('synth') ?? a.bus; amp.connect(dest);
      trackNode(cleanMs); autoGC(car, [mod, mg, amp], cleanMs);
      safeStart(car, t); safeStart(mod, t); safeStop(car, t + dur * 1.5 + 0.1); safeStop(mod, t + dur * 1.5 + 0.1);
      return;
    }

    if (mode === 'pad' || mode === 'choir' || mode === 'mist') {
      const atk = 0.06 + dur * 0.08;
      const rel = Math.max(atk + 0.1, dur * 0.9 + space * 0.5);
      const o1 = a.ctx.createOscillator(), o2 = a.ctx.createOscillator(), o3 = a.ctx.createOscillator();
      o1.type = 'sawtooth'; o2.type = 'sawtooth'; o3.type = 'sine';
      o1.frequency.value = f; o2.frequency.value = f * 1.012; o3.frequency.value = f * 0.995;
      const mix = a.ctx.createGain(); mix.gain.value = 0.33;
      const fil = a.ctx.createBiquadFilter(); fil.type = 'lowpass';
      fil.frequency.setValueAtTime(300 + synthFilter * 2000, t);
      fil.frequency.linearRampToValueAtTime(800 + synthFilter * 5000, t + atk * 2);
      fil.Q.value = 0.4 + compress * 1.5;
      const amp = a.ctx.createGain();
      amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(0.38 * accent, t + atk);
      amp.gain.setValueAtTime(0.38 * accent, t + Math.max(atk + 0.01, dur * 0.6));
      amp.gain.exponentialRampToValueAtTime(0.001, t + rel);
      o1.connect(mix); o2.connect(mix); o3.connect(mix); mix.connect(fil); fil.connect(amp);
      const dest = getLaneGain('synth') ?? a.bus; amp.connect(dest);
      trackNode(cleanMs); autoGC(o1, [o2, o3, mix, fil, amp], cleanMs);
      safeStart(o1, t); safeStart(o2, t); safeStart(o3, t);
      safeStop(o1, t + rel + 0.1); safeStop(o2, t + rel + 0.1); safeStop(o3, t + rel + 0.1);
      return;
    }

    if (mode === 'organ' || mode === 'air') {
      const atk = 0.005, rel = Math.max(0.05, dur * 0.95);
      const c1 = a.ctx.createOscillator(), c2 = a.ctx.createOscillator();
      const m1 = a.ctx.createOscillator(), m2 = a.ctx.createOscillator();
      const mg1 = a.ctx.createGain(), mg2 = a.ctx.createGain();
      c1.type = 'sine'; c2.type = 'sine'; m1.type = 'sine'; m2.type = 'sine';
      c1.frequency.value = f; c2.frequency.value = f * 2; m1.frequency.value = f; m2.frequency.value = f * 3;
      mg1.gain.value = f * fmIdxRef.current * 0.8; mg2.gain.value = f * fmIdxRef.current * 0.4;
      m1.connect(mg1); mg1.connect(c1.frequency); m2.connect(mg2); mg2.connect(c2.frequency);
      const mix = a.ctx.createGain(); mix.gain.value = 0.5;
      const amp = a.ctx.createGain();
      amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(0.4 * accent, t + atk);
      amp.gain.setValueAtTime(0.4 * accent, t + Math.max(atk + 0.01, dur * 0.85));
      amp.gain.exponentialRampToValueAtTime(0.001, t + rel);
      c1.connect(mix); c2.connect(mix); mix.connect(amp);
      const dest = getLaneGain('synth') ?? a.bus; amp.connect(dest);
      trackNode(cleanMs); autoGC(c1, [c2, m1, m2, mg1, mg2, mix, amp], cleanMs);
      safeStart(c1, t); safeStart(c2, t); safeStart(m1, t); safeStart(m2, t);
      safeStop(c1, t + rel + 0.1); safeStop(c2, t + rel + 0.1); safeStop(m1, t + rel + 0.1); safeStop(m2, t + rel + 0.1);
      return;
    }

    if (mode === 'strings' || mode === 'star') {
      const atk = 0.08 + dur * 0.06, rel = Math.max(atk + 0.1, dur * 0.92 + space * 0.4);
      const o1 = a.ctx.createOscillator(), o2 = a.ctx.createOscillator();
      const vib = a.ctx.createOscillator(), vg = a.ctx.createGain();
      o1.type = 'sawtooth'; o2.type = 'sawtooth';
      o1.frequency.value = f; o2.frequency.value = f * 1.006;
      vib.frequency.value = 5.2 + rnd() * 0.6; vg.gain.value = 2 + synthFilter * 6;
      vib.connect(vg); vg.connect(o1.frequency); vg.connect(o2.frequency);
      const fil = a.ctx.createBiquadFilter(); fil.type = 'lowpass'; fil.frequency.value = 400 + synthFilter * 5000; fil.Q.value = 0.3;
      const amp = a.ctx.createGain();
      amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(0.36 * accent, t + atk);
      amp.gain.setValueAtTime(0.36 * accent, t + Math.max(atk + 0.01, dur * 0.7));
      amp.gain.exponentialRampToValueAtTime(0.001, t + rel);
      o1.connect(fil); o2.connect(fil); fil.connect(amp);
      const dest = getLaneGain('synth') ?? a.bus; amp.connect(dest);
      trackNode(cleanMs); autoGC(o1, [o2, vib, vg, fil, amp], cleanMs);
      safeStart(o1, t); safeStart(o2, t); safeStart(vib, t);
      safeStop(o1, t + rel + 0.1); safeStop(o2, t + rel + 0.1); safeStop(vib, t + rel + 0.1);
      return;
    }

    // default lead / mist / choir / glass / organ fallback
    const atk = 0.005, rel = Math.max(0.05, dur * 0.9);
    const o1 = a.ctx.createOscillator(), o2 = a.ctx.createOscillator();
    const tmap = { lead:'square', mist:'sawtooth', choir:'sine', star:'sine', glass:'sine', organ:'sine' };
    o1.type = tmap[mode] ?? 'sawtooth'; o2.type = 'triangle';
    o1.frequency.value = f; o2.frequency.value = f * 1.008;
    const vib = a.ctx.createOscillator(), vg = a.ctx.createGain();
    vib.frequency.value = 5.5; vg.gain.value = clamp(mode === 'lead' ? 8 : 3, 0, 15);
    vib.connect(vg); vg.connect(o1.frequency);
    const fil = a.ctx.createBiquadFilter(); fil.type = 'lowpass';
    fil.frequency.value = 200 + synthFilter * 7000 + tone * 1200; fil.Q.value = 0.5 + compress * 3;
    const amp = a.ctx.createGain();
    amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(0.38 * accent, t + atk);
    amp.gain.setValueAtTime(0.38 * accent, t + Math.max(atk + 0.01, dur * 0.65));
    amp.gain.exponentialRampToValueAtTime(0.001, t + rel);
    const mix = a.ctx.createGain(); mix.gain.value = 0.5;
    o1.connect(mix); o2.connect(mix); mix.connect(fil); fil.connect(amp);
    const dest = getLaneGain('synth') ?? a.bus; amp.connect(dest);
    trackNode(cleanMs); autoGC(o1, [o2, vib, vg, mix, fil, amp], cleanMs);
    safeStart(o1, t); safeStart(o2, t); safeStart(vib, t);
    safeStop(o1, t + rel + 0.1); safeStop(o2, t + rel + 0.1); safeStop(vib, t + rel + 0.1);
  };

  const playSynth = (note, accent, t, lenSteps = 1) => {
    const notes = Array.isArray(note) ? note : getVoiceNotes(note, 'synth');
    const voiceAccent = accent / Math.sqrt(Math.max(1, notes.length));
    notes.forEach((voice, idx) => playSynthVoice(voice, voiceAccent, t + idx * 0.003, lenSteps));
    setActiveNotes(p => ({ ...p, synth: notes.join(' · ') }));
  };

  // ── Scheduler ─────────────────────────────────────────────────────────────

  const stepInterval = (si) => {
    const ms = (60 / bpmRef.current) * 1000 / 4;
    const sw = si % 2 === 1 ? ms * swingRef.current : -ms * swingRef.current * 0.5;
    return Math.max(0.028, (ms + sw) / 1000);
  };

  const scheduleNote = useCallback((si, t) => {
    const lp = patternsRef.current;
    const ll = laneLenRef.current;
    const accent = si % 4 === 0 ? 1 : 0.85;

    for (const lane of ['kick', 'snare', 'hat', 'bass', 'synth']) {
      const len = ll[lane] ?? 16;
      const li = si % len;
      const sd = lp[lane][li];
      if (!sd || !sd.on || sd.tied) continue;
      if (sd.p < 1 && rnd() > sd.p) continue;
      const jit = (rnd() - 0.5) * humanizeRef.current * 0.02;
      const noteT = t + Math.max(0, jit);
      const ga = grooveAccent(grooveProfileRef.current, lane, li, grooveRef.current);
      const fa = clamp(accent * ga * (sd.v ?? 1), 0.1, 1.15);
      if      (lane === 'kick')  playKick(fa, noteT);
      else if (lane === 'snare') playSnare(fa, noteT);
      else if (lane === 'hat')   playHat(fa, noteT, si % 32 === 0 && rnd() < 0.12);
      else if (lane === 'bass')  playBass(bassRef.current[li] ?? 'C2', fa, noteT, sd.l ?? 1);
      else if (lane === 'synth') playSynth(synthRef.current[li] ?? 'C4', fa, noteT, sd.l ?? 1);
      const delay = Math.max(0, (noteT - audioRef.current.ctx.currentTime) * 1000);
      setTimeout(() => flashLane(lane, fa), delay);
    }

    // Song arc advancement
    if (si === 0 && songActiveRef.current) {
      barCountRef.current++;
      const arc = arcRef.current;
      if (arc.length > 0) {
        const sec = SECTIONS[arc[arcIdxRef.current]] ?? SECTIONS.groove;
        if (barCountRef.current >= sec.bars) {
          barCountRef.current = 0;
          const nextIdx = (arcIdxRef.current + 1) % arc.length;
          arcIdxRef.current = nextIdx;
          setArcIdx(nextIdx);
          const nextSec = arc[nextIdx];
          setCurrentSectionName(nextSec);
          regenerateSection(nextSec, false);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genre, modeName, bassStack, polySynth, flashLane]);

  const runScheduler = useCallback(() => {
    const a = audioRef.current;
    if (!a || !isPlayingRef.current) return;
    const now = a.ctx.currentTime;
    while (nextNoteRef.current < now + SCHED) {
      const si = stepRef.current;
      scheduleNote(si, nextNoteRef.current);
      const delay = Math.max(0, (nextNoteRef.current - now) * 1000);
      setTimeout(() => { setStep(si); }, delay);
      nextNoteRef.current += stepInterval(si);
      stepRef.current = (si + 1) % MAX_STEPS;
    }
  }, [scheduleNote]);

  // ── Transport ─────────────────────────────────────────────────────────────

  const startClock = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    nextNoteRef.current = a.ctx.currentTime + 0.06;
    stepRef.current = 0;
    isPlayingRef.current = true;
    schedulerRef.current = setInterval(runScheduler, LOOK);
  }, [runScheduler]);

  const stopClock = useCallback(() => {
    if (schedulerRef.current) { clearInterval(schedulerRef.current); schedulerRef.current = null; }
    isPlayingRef.current = false;
    setIsPlaying(false);
    setStep(0);
  }, []);

  const togglePlay = useCallback(async () => {
    await initAudio();
    if (!audioRef.current) return;
    if (isPlayingRef.current) { stopClock(); return; }
    if (audioRef.current.ctx.state === 'suspended') await audioRef.current.ctx.resume();
    startClock();
    setIsPlaying(true);
  }, [initAudio, startClock, stopClock]);

  // ── Recording ─────────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    await initAudio();
    const a = audioRef.current;
    if (!a) return null;
    const mimes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    const mime = mimes.find(m => MediaRecorder.isTypeSupported?.(m)) ?? '';
    const rec = mime
      ? new MediaRecorder(a.dest.stream, { mimeType: mime })
      : new MediaRecorder(a.dest.stream);
    return rec;
  }, [initAudio]);

  // ── Analyser accessor ─────────────────────────────────────────────────────

  const getAnalyser = () => analyserRef.current;

  return {
    // state
    isReady, isPlaying, step, laneVU, activeNotes,
    isPlayingRef,
    // actions
    initAudio, togglePlay, stopClock, applyFxNow,
    startRecording, getAnalyser,
  };
}
