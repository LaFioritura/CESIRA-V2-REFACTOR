/**
 * useComposition
 * Owns all non-audio state: patterns, notes, undo stack, scenes,
 * song arc, autopilot, MIDI, tap tempo, import/export.
 * Pure React state — no Web Audio.
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  clamp, rnd, pick,
  GENRES, MODES, CHORD_PROGS, SECTIONS, SONG_ARCS,
  mkSteps, mkNotes, buildSection,
  MAX_STEPS, UNDO,
} from '../engine/musicEngine';

export function useComposition() {
  // ── Transport-adjacent state ───────────────────────────────────────────────
  const [bpm,     setBpm]     = useState(128);
  const [genre,   setGenre]   = useState('techno');
  const [modeName,setModeName]= useState('minor');

  const bpmRef = useRef(128);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);

  // ── FX params ─────────────────────────────────────────────────────────────
  const [master,      setMaster]      = useState(0.85);
  const [swing,       setSwing]       = useState(0.03);
  const [humanize,    setHumanize]    = useState(0.012);
  const [grooveAmt,   setGrooveAmt]   = useState(0.65);
  const [grooveProfile, setGrooveProfile] = useState('steady');
  const [space,       setSpace]       = useState(0.3);
  const [tone,        setTone]        = useState(0.7);
  const [noiseMix,    setNoiseMix]    = useState(0.2);
  const [drive,       setDrive]       = useState(0.1);
  const [compress,    setCompress]    = useState(0.3);
  const [bassFilter,  setBassFilter]  = useState(0.55);
  const [synthFilter, setSynthFilter] = useState(0.65);
  const [drumDecay,   setDrumDecay]   = useState(0.5);
  const [bassSubAmt,  setBassSubAmt]  = useState(0.5);
  const [fmIdx,       setFmIdx]       = useState(0.6);
  const [polySynth,   setPolySynth]   = useState(true);
  const [bassStack,   setBassStack]   = useState(true);

  // Refs for values needed inside audio callbacks
  const swingRef        = useRef(0.03);
  const humanizeRef     = useRef(0.012);
  const grooveRef       = useRef(0.65);
  const grooveProfileRef= useRef('steady');
  const fmIdxRef        = useRef(0.6);
  useEffect(() => { swingRef.current        = swing;        }, [swing]);
  useEffect(() => { humanizeRef.current     = humanize;     }, [humanize]);
  useEffect(() => { grooveRef.current       = grooveAmt;    }, [grooveAmt]);
  useEffect(() => { grooveProfileRef.current= grooveProfile;}, [grooveProfile]);
  useEffect(() => { fmIdxRef.current        = fmIdx;        }, [fmIdx]);

  // ── Patterns ──────────────────────────────────────────────────────────────
  const [patterns,  setPatterns]  = useState({ kick:mkSteps(), snare:mkSteps(), hat:mkSteps(), bass:mkSteps(), synth:mkSteps() });
  const [bassLine,  setBassLine]  = useState(mkNotes('C2'));
  const [synthLine, setSynthLine] = useState(mkNotes('C4'));
  const [laneLen,   setLaneLen]   = useState({ kick:16, snare:16, hat:32, bass:32, synth:32 });

  // Mirror refs for scheduler
  const patternsRef = useRef(patterns);
  const bassRef     = useRef(bassLine);
  const synthRef    = useRef(synthLine);
  const laneLenRef  = useRef(laneLen);
  useEffect(() => { patternsRef.current = patterns; }, [patterns]);
  useEffect(() => { bassRef.current     = bassLine;  }, [bassLine]);
  useEffect(() => { synthRef.current    = synthLine; }, [synthLine]);
  useEffect(() => { laneLenRef.current  = laneLen;   }, [laneLen]);

  // ── Composition seed ──────────────────────────────────────────────────────
  const progressionRef = useRef(CHORD_PROGS.minor[0]);
  const arpModeRef     = useRef('up');
  const lastBassRef    = useRef('C2');
  const [arpMode,  setArpMode]  = useState('up');
  const [currentSectionName, setCurrentSectionName] = useState('groove');

  // ── Undo ──────────────────────────────────────────────────────────────────
  const undoStack = useRef([]);
  const [undoLen, setUndoLen] = useState(0);

  const pushUndo = useCallback(() => {
    const snap = {
      patterns: { ...patternsRef.current },
      bassLine:   [...bassRef.current],
      synthLine:  [...synthRef.current],
    };
    undoStack.current = [snap, ...undoStack.current.slice(0, UNDO - 1)];
    setUndoLen(undoStack.current.length);
  }, []);

  const undo = useCallback(() => {
    if (!undoStack.current.length) return;
    const snap = undoStack.current.shift();
    setUndoLen(undoStack.current.length);
    setPatterns(snap.patterns);   patternsRef.current = snap.patterns;
    setBassLine(snap.bassLine);   bassRef.current     = snap.bassLine;
    setSynthLine(snap.synthLine); synthRef.current    = snap.synthLine;
  }, []);

  // ── Section generation ────────────────────────────────────────────────────
  const regenerateSection = useCallback((sectionName, pushUndo_ = true) => {
    const gd    = GENRES[genre];
    const prog  = progressionRef.current;
    const aMode = arpModeRef.current;
    const result = buildSection(genre, sectionName ?? currentSectionName, modeName, prog, aMode, lastBassRef.current);
    if (pushUndo_) pushUndo();
    setPatterns(result.patterns);   patternsRef.current = result.patterns;
    setBassLine(result.bassLine);   bassRef.current     = result.bassLine;
    setSynthLine(result.synthLine); synthRef.current    = result.synthLine;
    setLaneLen(result.laneLen);     laneLenRef.current  = result.laneLen;
    lastBassRef.current = result.lastBass;
    const gp = gd.density > 0.65 && gd.chaos > 0.4 ? 'bunker' : gd.chaos > 0.6 ? 'broken' : gd.density < 0.4 ? 'float' : 'steady';
    setGrooveProfile(gp); grooveProfileRef.current = gp;
  }, [genre, modeName, pushUndo, currentSectionName]);

  const newGenreSession = useCallback((g) => {
    const gd    = GENRES[g];
    const mName = pick(gd.modes);
    const prog  = pick(CHORD_PROGS[mName] ?? CHORD_PROGS.minor);
    const aMode = pick(['up', 'down', 'updown', 'outside']);
    setGenre(g); setModeName(mName); setArpMode(aMode);
    progressionRef.current = prog; arpModeRef.current = aMode;
    const newBpm = Math.round(gd.bpm[0] + rnd() * (gd.bpm[1] - gd.bpm[0]));
    setBpm(newBpm); bpmRef.current = newBpm;
    setSpace(gd.fxProfile.space); setTone(gd.fxProfile.tone); setDrive(gd.fxProfile.drive * 2);
    setNoiseMix(gd.chaos * 0.4); setCompress(gd.density * 0.4);
    const sec = pick(Object.keys(SECTIONS));
    setCurrentSectionName(sec);
    lastBassRef.current = 'C2';
    const result = buildSection(g, sec, mName, prog, aMode, 'C2');
    setPatterns(result.patterns);   patternsRef.current = result.patterns;
    setBassLine(result.bassLine);   bassRef.current     = result.bassLine;
    setSynthLine(result.synthLine); synthRef.current    = result.synthLine;
    setLaneLen(result.laneLen);     laneLenRef.current  = result.laneLen;
    lastBassRef.current = result.lastBass;
    const gp = gd.density > 0.65 && gd.chaos > 0.4 ? 'bunker' : gd.chaos > 0.6 ? 'broken' : gd.density < 0.4 ? 'float' : 'steady';
    setGrooveProfile(gp); grooveProfileRef.current = gp;
  }, []);

  // ── Section / step editing ────────────────────────────────────────────────
  const triggerSection = useCallback((sec) => {
    setCurrentSectionName(sec);
    regenerateSection(sec);
  }, [regenerateSection]);

  const toggleCell = useCallback((lane, idx) => {
    pushUndo();
    setPatterns(p => {
      const n = { ...p, [lane]: p[lane].map((s, i) => i === idx ? { ...s, on: !s.on } : s) };
      patternsRef.current = n;
      return n;
    });
  }, [pushUndo]);

  const setNote = useCallback((lane, idx, note) => {
    if (lane === 'bass') {
      setBassLine(p => { const n = [...p]; n[idx] = note; bassRef.current = n; return n; });
    } else {
      setSynthLine(p => { const n = [...p]; n[idx] = note; synthRef.current = n; return n; });
    }
  }, []);

  const clearPattern = useCallback(() => {
    pushUndo();
    const mode  = MODES[modeName] ?? MODES.minor;
    const empty = { kick:mkSteps(), snare:mkSteps(), hat:mkSteps(), bass:mkSteps(), synth:mkSteps() };
    setPatterns(empty);     patternsRef.current = empty;
    const nb = mkNotes(mode.b[0] ?? 'C2');
    const ns = mkNotes(mode.s[0] ?? 'C4');
    setBassLine(nb);  bassRef.current  = nb;
    setSynthLine(ns); synthRef.current = ns;
  }, [pushUndo, modeName]);

  // ── Performance actions ───────────────────────────────────────────────────
  const perfActions = {
    drop:    () => triggerSection('drop'),
    break:   () => triggerSection('break'),
    build:   () => triggerSection('build'),
    groove:  () => triggerSection('groove'),
    tension: () => triggerSection('tension'),
    fill:    () => triggerSection('fill'),
    intro:   () => triggerSection('intro'),
    outro:   () => triggerSection('outro'),
    reharmonize: () => {
      const pp = CHORD_PROGS[modeName] ?? CHORD_PROGS.minor;
      progressionRef.current = pick(pp);
      regenerateSection(currentSectionName);
    },
    mutate: () => {
      pushUndo();
      const np = { ...patternsRef.current };
      ['kick', 'snare', 'hat', 'bass', 'synth'].forEach(ln => {
        const ll = laneLenRef.current[ln] ?? 16;
        const flips = Math.max(2, Math.floor(ll * 0.08));
        np[ln] = np[ln].map(s => ({ ...s }));
        for (let i = 0; i < flips; i++) {
          const pos = Math.floor(rnd() * ll);
          if (pos % 4 !== 0 || ln !== 'kick') np[ln][pos].on = !np[ln][pos].on;
        }
      });
      setPatterns(np); patternsRef.current = np;
    },
    thinOut: () => {
      pushUndo();
      const np = { ...patternsRef.current };
      ['hat', 'synth', 'bass'].forEach(ln => {
        np[ln] = np[ln].map((s, i) => ({ ...s, on: s.on && (i % 4 === 0 || rnd() > 0.45) }));
      });
      setPatterns(np); patternsRef.current = np;
    },
    thicken: () => {
      pushUndo();
      const np = { ...patternsRef.current };
      ['hat', 'kick'].forEach(ln => {
        np[ln] = np[ln].map(s => ({ ...s, on: s.on || rnd() < 0.22, v: s.v || 0.65, p: s.p || 0.7 }));
      });
      setPatterns(np); patternsRef.current = np;
    },
    randomizeNotes: () => {
      const pool = (MODES[modeName] ?? MODES.minor).s;
      pushUndo();
      setSynthLine(prev => {
        const n = prev.map((v, i) => patterns.synth[i]?.on ? pick(pool) : v);
        synthRef.current = n; return n;
      });
    },
    randomizeBass: () => {
      const pool = (MODES[modeName] ?? MODES.minor).b;
      pushUndo();
      setBassLine(prev => {
        const n = prev.map((v, i) => patterns.bass[i]?.on ? pick(pool) : v);
        bassRef.current = n; return n;
      });
    },
    shiftNotesUp: () => {
      const mode = MODES[modeName] ?? MODES.minor;
      ['bass', 'synth'].forEach(lane => {
        const pool = lane === 'bass' ? mode.b : mode.s;
        const setter = lane === 'bass' ? setBassLine : setSynthLine;
        const ref    = lane === 'bass' ? bassRef     : synthRef;
        setter(prev => {
          const n = prev.map((v, i) => {
            if (!patterns[lane][i]?.on) return v;
            const idx = pool.indexOf(v);
            return pool[Math.min(idx + 1, pool.length - 1)];
          });
          ref.current = n; return n;
        });
      });
    },
    shiftNotesDown: () => {
      const mode = MODES[modeName] ?? MODES.minor;
      ['bass', 'synth'].forEach(lane => {
        const pool = lane === 'bass' ? mode.b : mode.s;
        const setter = lane === 'bass' ? setBassLine : setSynthLine;
        const ref    = lane === 'bass' ? bassRef     : synthRef;
        setter(prev => {
          const n = prev.map((v, i) => {
            if (!patterns[lane][i]?.on) return v;
            const idx = pool.indexOf(v);
            return pool[Math.max(idx - 1, 0)];
          });
          ref.current = n; return n;
        });
      });
    },
    shiftArp: () => {
      const modes = ['up', 'down', 'updown', 'outside'];
      const next = modes[(modes.indexOf(arpModeRef.current) + 1) % modes.length];
      setArpMode(next); arpModeRef.current = next;
      regenerateSection(currentSectionName);
    },
    clear: clearPattern,
  };

  // ── Song arc ──────────────────────────────────────────────────────────────
  const [songArc,    setSongArc]    = useState([]);
  const [arcIdx,     setArcIdx]     = useState(0);
  const [songActive, setSongActive] = useState(false);
  const songActiveRef = useRef(false);
  const arcRef        = useRef([]);
  const arcIdxRef     = useRef(0);
  const barCountRef   = useRef(0);

  const startSongArc = useCallback(() => {
    const arc = pick(SONG_ARCS);
    setSongArc(arc); arcRef.current = arc;
    setArcIdx(0); arcIdxRef.current = 0;
    barCountRef.current = 0;
    setSongActive(true); songActiveRef.current = true;
    setCurrentSectionName(arc[0]);
    regenerateSection(arc[0]);
  }, [regenerateSection]);

  const stopSongArc = useCallback(() => {
    setSongActive(false); songActiveRef.current = false;
  }, []);

  // ── Autopilot ─────────────────────────────────────────────────────────────
  const [autopilot,          setAutopilot]          = useState(false);
  const [autopilotIntensity, setAutopilotIntensity] = useState(0.5);
  const autopilotRef      = useRef(false);
  const autopilotTimerRef = useRef(null);
  useEffect(() => { autopilotRef.current = autopilot; }, [autopilot]);

  const runAutopilot = useCallback(() => {
    if (!autopilotRef.current) return;
    const intensity = autopilotIntensity;
    const r = rnd();
    if      (r < 0.25 * intensity) perfActions.mutate();
    else if (r < 0.40 * intensity) perfActions.shiftArp();
    else if (r < 0.55)             regenerateSection(currentSectionName);
    else if (r < 0.65 * intensity) perfActions.thinOut();
    else if (r < 0.75 * intensity) perfActions.thicken();
    else if (r < 0.82)             perfActions.reharmonize();
    if (rnd() < 0.15 * intensity) triggerSection(pick(Object.keys(SECTIONS)));
    const nextDelay = (8 + rnd() * 16) * (1 - intensity * 0.4) * 1000 * (240 / bpm);
    autopilotTimerRef.current = setTimeout(runAutopilot, nextDelay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autopilotIntensity, currentSectionName, bpm, regenerateSection]);

  useEffect(() => {
    if (autopilot) {
      const delay = (4 + rnd() * 8) * 1000 * (240 / bpm);
      autopilotTimerRef.current = setTimeout(runAutopilot, delay);
    } else {
      if (autopilotTimerRef.current) clearTimeout(autopilotTimerRef.current);
    }
    return () => { if (autopilotTimerRef.current) clearTimeout(autopilotTimerRef.current); };
  }, [autopilot, runAutopilot, bpm]);

  // ── Presets ───────────────────────────────────────────────────────────────
  const [bassPreset,        setBassPreset]        = useState('sub_floor');
  const [synthPreset,       setSynthPreset]       = useState('velvet_pad');
  const [drumPreset,        setDrumPreset]        = useState('tight_punch');
  const [performancePreset, setPerformancePreset] = useState('club_night');

  const applyPartialPreset = useCallback((preset) => {
    if (!preset) return;
    if (preset.genre && preset.genre !== genre) newGenreSession(preset.genre);
    if (preset.space       !== undefined) setSpace(preset.space);
    if (preset.tone        !== undefined) setTone(preset.tone);
    if (preset.drive       !== undefined) setDrive(preset.drive);
    if (preset.compress    !== undefined) setCompress(preset.compress);
    if (preset.noiseMix    !== undefined) setNoiseMix(preset.noiseMix);
    if (preset.drumDecay   !== undefined) setDrumDecay(preset.drumDecay);
    if (preset.bassFilter  !== undefined) setBassFilter(preset.bassFilter);
    if (preset.synthFilter !== undefined) setSynthFilter(preset.synthFilter);
    if (preset.bassSubAmt  !== undefined) setBassSubAmt(preset.bassSubAmt);
    if (preset.fmIdx       !== undefined) { setFmIdx(preset.fmIdx); fmIdxRef.current = preset.fmIdx; }
    if (preset.polySynth   !== undefined) setPolySynth(preset.polySynth);
    if (preset.bassStack   !== undefined) setBassStack(preset.bassStack);
    if (preset.grooveAmt   !== undefined) { setGrooveAmt(preset.grooveAmt); grooveRef.current = preset.grooveAmt; }
    if (preset.swing       !== undefined) { setSwing(preset.swing); swingRef.current = preset.swing; }
  }, [genre, newGenreSession]);

  // ── Save / Load ───────────────────────────────────────────────────────────
  const [projectName,  setProjectName]  = useState('CESIRA SESSION');
  const [savedScenes,  setSavedScenes]  = useState([null, null, null, null, null, null]);
  const [recordings,   setRecordings]   = useState([]);
  const [recState,     setRecState]     = useState('idle');
  const recorderRef = useRef(null);
  const chunksRef   = useRef([]);
  const importRef   = useRef(null);

  const serialize = useCallback(() => ({
    v: 2, genre, modeName, bpm, currentSectionName, grooveProfile,
    arpMode: arpModeRef.current,
    space, tone, noiseMix, drive, compress, bassFilter, synthFilter,
    drumDecay, bassSubAmt, fmIdx, master, swing, humanize, grooveAmt,
    projectName, polySynth, bassStack, bassPreset, synthPreset, drumPreset, performancePreset,
    patterns, bassLine, synthLine, laneLen,
  }), [
    genre, modeName, bpm, currentSectionName, grooveProfile,
    space, tone, noiseMix, drive, compress, bassFilter, synthFilter,
    drumDecay, bassSubAmt, fmIdx, master, swing, humanize, grooveAmt,
    projectName, polySynth, bassStack, bassPreset, synthPreset, drumPreset, performancePreset,
    patterns, bassLine, synthLine, laneLen,
  ]);

  const applySnap = useCallback((snap, stopClockFn) => {
    if (!snap || snap.v !== 2) return;
    if (stopClockFn) stopClockFn();
    setGenre(snap.genre ?? 'techno'); setModeName(snap.modeName ?? 'minor');
    const nb = snap.bpm ?? 128; setBpm(nb); bpmRef.current = nb;
    setCurrentSectionName(snap.currentSectionName ?? 'groove');
    setGrooveProfile(snap.grooveProfile ?? 'steady'); grooveProfileRef.current = snap.grooveProfile ?? 'steady';
    setArpMode(snap.arpMode ?? 'up'); arpModeRef.current = snap.arpMode ?? 'up';
    setSpace(snap.space ?? 0.3); setTone(snap.tone ?? 0.7); setNoiseMix(snap.noiseMix ?? 0.2);
    setDrive(snap.drive ?? 0.1); setCompress(snap.compress ?? 0.3);
    setBassFilter(snap.bassFilter ?? 0.55); setSynthFilter(snap.synthFilter ?? 0.65);
    setDrumDecay(snap.drumDecay ?? 0.5); setBassSubAmt(snap.bassSubAmt ?? 0.5);
    setFmIdx(snap.fmIdx ?? 0.6); fmIdxRef.current = snap.fmIdx ?? 0.6;
    setMaster(snap.master ?? 0.85); setSwing(snap.swing ?? 0.03); swingRef.current = snap.swing ?? 0.03;
    setHumanize(snap.humanize ?? 0.012); setGrooveAmt(snap.grooveAmt ?? 0.65); grooveRef.current = snap.grooveAmt ?? 0.65;
    setPolySynth(snap.polySynth ?? true); setBassStack(snap.bassStack ?? true);
    setBassPreset(snap.bassPreset ?? 'sub_floor'); setSynthPreset(snap.synthPreset ?? 'velvet_pad');
    setDrumPreset(snap.drumPreset ?? 'tight_punch'); setPerformancePreset(snap.performancePreset ?? 'club_night');
    if (snap.projectName) setProjectName(snap.projectName);
    if (snap.patterns)  { setPatterns(snap.patterns);   patternsRef.current = snap.patterns; }
    if (snap.bassLine)  { setBassLine(snap.bassLine);   bassRef.current     = snap.bassLine; }
    if (snap.synthLine) { setSynthLine(snap.synthLine); synthRef.current    = snap.synthLine; }
    if (snap.laneLen)   { setLaneLen(snap.laneLen);     laneLenRef.current  = snap.laneLen; }
  }, []);

  const saveScene = useCallback((slot) => {
    setSavedScenes(p => p.map((v, i) =>
      i === slot ? { ...serialize(), label: `S${slot + 1} ${new Date().toLocaleTimeString()}` } : v
    ));
  }, [serialize]);

  const loadScene = useCallback((slot, stopClockFn) => {
    if (savedScenes[slot]) applySnap(savedScenes[slot], stopClockFn);
  }, [savedScenes, applySnap]);

  const exportJSON = useCallback(() => {
    const b = new Blob([JSON.stringify(serialize(), null, 2)], { type: 'application/json' });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u;
    a.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 500);
  }, [serialize, projectName]);

  const importJSON = useCallback(async (e, stopClockFn) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      applySnap(JSON.parse(text), stopClockFn);
    } catch (_) {
      // import failed silently
    } finally {
      e.target.value = '';
    }
  }, [applySnap]);

  // ── Tap tempo ─────────────────────────────────────────────────────────────
  const [tapTimes, setTapTimes] = useState([]);
  const tapTempo = useCallback(() => {
    const now = Date.now();
    setTapTimes(prev => {
      const next = [...prev.filter(t => now - t < 3000), now];
      if (next.length >= 2) {
        const intervals = next.slice(1).map((t, i) => t - next[i]);
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const nb = clamp(Math.round(60000 / avg), 40, 250);
        setBpm(nb); bpmRef.current = nb;
      }
      return next.slice(-6);
    });
  }, []);

  // ── MIDI ──────────────────────────────────────────────────────────────────
  const [midiOk, setMidiOk] = useState(false);
  const midiRef = useRef(null);
  useEffect(() => {
    if (!navigator.requestMIDIAccess) return;
    navigator.requestMIDIAccess()
      .then(m => { midiRef.current = m; setMidiOk(true); })
      .catch(() => {});
  }, []);

  // ── Status ────────────────────────────────────────────────────────────────
  const [status, setStatus] = useState('Ready — press PLAY');

  // ── UI state ──────────────────────────────────────────────────────────────
  const [view,      setView]      = useState('perform');
  const [page,      setPage]      = useState(0);
  const [activeTab, setActiveTab] = useState('mix');
  const [activeLane,setActiveLane]= useState('kick');

  return {
    // Transport
    bpm, setBpm, bpmRef, genre, setGenre, modeName, setModeName,
    // FX params
    master, setMaster, swing, setSwing, humanize, setHumanize,
    grooveAmt, setGrooveAmt, grooveProfile, setGrooveProfile,
    space, setSpace, tone, setTone, noiseMix, setNoiseMix,
    drive, setDrive, compress, setCompress,
    bassFilter, setBassFilter, synthFilter, setSynthFilter,
    drumDecay, setDrumDecay, bassSubAmt, setBassSubAmt,
    fmIdx, setFmIdx, polySynth, setPolySynth, bassStack, setBassStack,
    // Refs for audio engine
    swingRef, humanizeRef, grooveRef, grooveProfileRef, fmIdxRef,
    patternsRef, bassRef, synthRef, laneLenRef,
    // Patterns
    patterns, setPatterns, bassLine, setBassLine, synthLine, setSynthLine,
    laneLen, setLaneLen,
    // Composition
    arpMode, setArpMode, arpModeRef, currentSectionName, setCurrentSectionName,
    progressionRef, lastBassRef,
    // Actions
    regenerateSection, newGenreSession, triggerSection, toggleCell, setNote, clearPattern,
    perfActions,
    // Undo
    undoLen, pushUndo, undo,
    // Song arc
    songArc, arcIdx, setArcIdx, songActive, setSongActive,
    songActiveRef, arcRef, arcIdxRef, barCountRef,
    startSongArc, stopSongArc,
    // Autopilot
    autopilot, setAutopilot, autopilotIntensity, setAutopilotIntensity,
    // Presets
    bassPreset, setBassPreset, synthPreset, setSynthPreset,
    drumPreset, setDrumPreset, performancePreset, setPerformancePreset,
    applyPartialPreset,
    // Save / Load
    projectName, setProjectName, savedScenes, setSavedScenes,
    recordings, setRecordings, recState, setRecState,
    recorderRef, chunksRef, importRef,
    serialize, applySnap, saveScene, loadScene, exportJSON, importJSON,
    // Tap
    tapTempo,
    // MIDI
    midiOk, midiRef,
    // Status
    status, setStatus,
    // UI
    view, setView, page, setPage, activeTab, setActiveTab, activeLane, setActiveLane,
  };
}
