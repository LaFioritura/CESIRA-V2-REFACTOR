/**
 * useComposition
 * Owns all non-audio state: patterns, notes, undo, scenes,
 * song arc, autopilot, MIDI, tap tempo, import/export.
 *
 * Improvements over v1:
 * - useLiveRef() replaces 10 boilerplate useEffect+ref pairs
 * - perfActions entries are individually memoised with useCallback
 * - applyPartialPreset no longer mutates the GENRES constant
 * - song arc refs kept in sync via plain assignment, not useEffect
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  clamp, rnd, pick,
  GENRES, MODES, CHORD_PROGS, SECTIONS, SONG_ARCS,
  mkSteps, mkNotes, buildSection,
  UNDO,
} from '../engine/musicEngine';

// ── useLiveRef ────────────────────────────────────────────────────────────────
// Returns a ref whose .current is always the latest value, updated
// synchronously during render — safe to read inside event/audio callbacks.
function useLiveRef(value) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

// ── useComposition ────────────────────────────────────────────────────────────
export function useComposition() {

  // ── Transport ─────────────────────────────────────────────────────────────
  const [bpm,      setBpm]      = useState(128);
  const [genre,    setGenre]    = useState('techno');
  const [modeName, setModeName] = useState('minor');
  const bpmRef = useLiveRef(bpm);

  // ── FX params ─────────────────────────────────────────────────────────────
  const [master,        setMaster]        = useState(0.85);
  const [swing,         setSwing]         = useState(0.03);
  const [humanize,      setHumanize]      = useState(0.012);
  const [grooveAmt,     setGrooveAmt]     = useState(0.65);
  const [grooveProfile, setGrooveProfile] = useState('steady');
  const [space,         setSpace]         = useState(0.3);
  const [tone,          setTone]          = useState(0.7);
  const [noiseMix,      setNoiseMix]      = useState(0.2);
  const [drive,         setDrive]         = useState(0.1);
  const [compress,      setCompress]      = useState(0.3);
  const [bassFilter,    setBassFilter]    = useState(0.55);
  const [synthFilter,   setSynthFilter]   = useState(0.65);
  const [drumDecay,     setDrumDecay]     = useState(0.5);
  const [bassSubAmt,    setBassSubAmt]    = useState(0.5);
  const [fmIdx,         setFmIdx]         = useState(0.6);
  const [polySynth,     setPolySynth]     = useState(true);
  const [bassStack,     setBassStack]     = useState(true);

  // Live refs for audio-thread callbacks — always current, no useEffect needed
  const swingRef         = useLiveRef(swing);
  const humanizeRef      = useLiveRef(humanize);
  const grooveRef        = useLiveRef(grooveAmt);
  const grooveProfileRef = useLiveRef(grooveProfile);
  const fmIdxRef         = useLiveRef(fmIdx);

  // ── Patterns ──────────────────────────────────────────────────────────────
  const [patterns,  setPatterns]  = useState({ kick:mkSteps(), snare:mkSteps(), hat:mkSteps(), bass:mkSteps(), synth:mkSteps() });
  const [bassLine,  setBassLine]  = useState(mkNotes('C2'));
  const [synthLine, setSynthLine] = useState(mkNotes('C4'));
  const [laneLen,   setLaneLen]   = useState({ kick:16, snare:16, hat:32, bass:32, synth:32 });

  const patternsRef = useLiveRef(patterns);
  const bassRef     = useLiveRef(bassLine);
  const synthRef    = useLiveRef(synthLine);
  const laneLenRef  = useLiveRef(laneLen);

  // ── Composition seed ──────────────────────────────────────────────────────
  const progressionRef = useRef(CHORD_PROGS.minor[0]);
  const arpModeRef     = useRef('up');
  const lastBassRef    = useRef('C2');
  const [arpMode,            setArpMode]            = useState('up');
  const [currentSectionName, setCurrentSectionName] = useState('groove');

  // ── Undo ──────────────────────────────────────────────────────────────────
  const undoStack = useRef([]);
  const [undoLen, setUndoLen] = useState(0);

  const pushUndo = useCallback(() => {
    const snap = {
      patterns:  { ...patternsRef.current },
      bassLine:  [...bassRef.current],
      synthLine: [...synthRef.current],
    };
    undoStack.current = [snap, ...undoStack.current.slice(0, UNDO - 1)];
    setUndoLen(undoStack.current.length);
  }, []); // refs are always fresh — no deps

  const undo = useCallback(() => {
    if (!undoStack.current.length) return;
    const snap = undoStack.current.shift();
    setUndoLen(undoStack.current.length);
    setPatterns(snap.patterns);
    setBassLine(snap.bassLine);
    setSynthLine(snap.synthLine);
  }, []);

  // ── Groove profile helper ─────────────────────────────────────────────────
  const inferGrooveProfile = (gd) =>
    gd.density > 0.65 && gd.chaos > 0.4 ? 'bunker'
    : gd.chaos > 0.6                     ? 'broken'
    : gd.density < 0.4                   ? 'float'
    : 'steady';

  // ── Section generation ────────────────────────────────────────────────────
  const regenerateSection = useCallback((sectionName, pushUndo_ = true) => {
    const result = buildSection(
      genre,
      sectionName ?? currentSectionName,
      modeName,
      progressionRef.current,
      arpModeRef.current,
      lastBassRef.current,
    );
    if (pushUndo_) pushUndo();
    lastBassRef.current = result.lastBass;
    setPatterns(result.patterns);
    setBassLine(result.bassLine);
    setSynthLine(result.synthLine);
    setLaneLen(result.laneLen);
    setGrooveProfile(inferGrooveProfile(GENRES[genre]));
  }, [genre, modeName, currentSectionName, pushUndo]);

  const newGenreSession = useCallback((g) => {
    const gd    = GENRES[g];
    const mName = pick(gd.modes);
    const prog  = pick(CHORD_PROGS[mName] ?? CHORD_PROGS.minor);
    const aMode = pick(['up', 'down', 'updown', 'outside']);
    const sec   = pick(Object.keys(SECTIONS));

    progressionRef.current = prog;
    arpModeRef.current     = aMode;
    lastBassRef.current    = 'C2';

    const result = buildSection(g, sec, mName, prog, aMode, 'C2');
    lastBassRef.current = result.lastBass;

    setBpm(Math.round(gd.bpm[0] + rnd() * (gd.bpm[1] - gd.bpm[0])));
    setGenre(g);
    setModeName(mName);
    setArpMode(aMode);
    setCurrentSectionName(sec);
    setSpace(gd.fxProfile.space);
    setTone(gd.fxProfile.tone);
    setDrive(gd.fxProfile.drive * 2);
    setNoiseMix(gd.chaos * 0.4);
    setCompress(gd.density * 0.4);
    setGrooveProfile(inferGrooveProfile(gd));
    setPatterns(result.patterns);
    setBassLine(result.bassLine);
    setSynthLine(result.synthLine);
    setLaneLen(result.laneLen);
  }, []);

  // ── Step editing ──────────────────────────────────────────────────────────
  const triggerSection = useCallback((sec) => {
    setCurrentSectionName(sec);
    regenerateSection(sec);
  }, [regenerateSection]);

  const toggleCell = useCallback((lane, idx) => {
    pushUndo();
    setPatterns(p => ({ ...p, [lane]: p[lane].map((s, i) => i === idx ? { ...s, on: !s.on } : s) }));
  }, [pushUndo]);

  const setNote = useCallback((lane, idx, note) => {
    const setter = lane === 'bass' ? setBassLine : setSynthLine;
    setter(p => { const n = [...p]; n[idx] = note; return n; });
  }, []);

  const clearPattern = useCallback(() => {
    pushUndo();
    const mode = MODES[modeName] ?? MODES.minor;
    setPatterns({ kick:mkSteps(), snare:mkSteps(), hat:mkSteps(), bass:mkSteps(), synth:mkSteps() });
    setBassLine(mkNotes(mode.b[0] ?? 'C2'));
    setSynthLine(mkNotes(mode.s[0] ?? 'C4'));
  }, [pushUndo, modeName]);

  // ── Performance actions — individually memoised ───────────────────────────
  // Each action has a stable identity across renders unless its specific
  // dependencies change. This prevents broad re-renders from a literal object
  // being rebuilt on every render.

  const actionDrop    = useCallback(() => triggerSection('drop'),    [triggerSection]);
  const actionBreak   = useCallback(() => triggerSection('break'),   [triggerSection]);
  const actionBuild   = useCallback(() => triggerSection('build'),   [triggerSection]);
  const actionGroove  = useCallback(() => triggerSection('groove'),  [triggerSection]);
  const actionTension = useCallback(() => triggerSection('tension'), [triggerSection]);
  const actionFill    = useCallback(() => triggerSection('fill'),    [triggerSection]);
  const actionIntro   = useCallback(() => triggerSection('intro'),   [triggerSection]);
  const actionOutro   = useCallback(() => triggerSection('outro'),   [triggerSection]);

  const actionReharmonize = useCallback(() => {
    progressionRef.current = pick(CHORD_PROGS[modeName] ?? CHORD_PROGS.minor);
    regenerateSection(currentSectionName);
  }, [modeName, currentSectionName, regenerateSection]);

  const actionMutate = useCallback(() => {
    pushUndo();
    setPatterns(prev => {
      const np = {};
      for (const ln of ['kick', 'snare', 'hat', 'bass', 'synth']) {
        const ll    = laneLenRef.current[ln] ?? 16;
        const flips = Math.max(2, Math.floor(ll * 0.08));
        np[ln] = prev[ln].map(s => ({ ...s }));
        for (let i = 0; i < flips; i++) {
          const pos = Math.floor(rnd() * ll);
          if (pos % 4 !== 0 || ln !== 'kick') np[ln][pos].on = !np[ln][pos].on;
        }
      }
      return np;
    });
  }, [pushUndo]);

  const actionThinOut = useCallback(() => {
    pushUndo();
    setPatterns(prev => ({
      ...prev,
      hat:   prev.hat.map((s, i)   => ({ ...s, on: s.on && (i % 4 === 0 || rnd() > 0.45) })),
      synth: prev.synth.map((s, i) => ({ ...s, on: s.on && (i % 4 === 0 || rnd() > 0.45) })),
      bass:  prev.bass.map((s, i)  => ({ ...s, on: s.on && (i % 4 === 0 || rnd() > 0.45) })),
    }));
  }, [pushUndo]);

  const actionThicken = useCallback(() => {
    pushUndo();
    setPatterns(prev => ({
      ...prev,
      hat:  prev.hat.map(s  => ({ ...s, on: s.on || rnd() < 0.22, v: s.v || 0.65, p: s.p || 0.7 })),
      kick: prev.kick.map(s => ({ ...s, on: s.on || rnd() < 0.22, v: s.v || 0.65, p: s.p || 0.7 })),
    }));
  }, [pushUndo]);

  const actionRandomizeNotes = useCallback(() => {
    const pool = (MODES[modeName] ?? MODES.minor).s;
    pushUndo();
    setSynthLine(prev => prev.map((v, i) => patternsRef.current.synth[i]?.on ? pick(pool) : v));
  }, [modeName, pushUndo]);

  const actionRandomizeBass = useCallback(() => {
    const pool = (MODES[modeName] ?? MODES.minor).b;
    pushUndo();
    setBassLine(prev => prev.map((v, i) => patternsRef.current.bass[i]?.on ? pick(pool) : v));
  }, [modeName, pushUndo]);

  const actionShiftNotes = useCallback((direction) => {
    const mode  = MODES[modeName] ?? MODES.minor;
    const delta = direction === 'up' ? 1 : -1;
    setBassLine(prev => prev.map((v, i) => {
      if (!patternsRef.current.bass[i]?.on) return v;
      const idx = mode.b.indexOf(v);
      return mode.b[clamp(idx + delta, 0, mode.b.length - 1)];
    }));
    setSynthLine(prev => prev.map((v, i) => {
      if (!patternsRef.current.synth[i]?.on) return v;
      const idx = mode.s.indexOf(v);
      return mode.s[clamp(idx + delta, 0, mode.s.length - 1)];
    }));
  }, [modeName]);

  const actionShiftArp = useCallback(() => {
    const modes = ['up', 'down', 'updown', 'outside'];
    const next  = modes[(modes.indexOf(arpModeRef.current) + 1) % modes.length];
    arpModeRef.current = next;
    setArpMode(next);
    regenerateSection(currentSectionName);
  }, [currentSectionName, regenerateSection]);

  // Assembled from stable callbacks — this object is recreated each render
  // but all its values are stable references, so children using them with
  // memo() will not re-render unnecessarily.
  const perfActions = {
    drop:          actionDrop,
    break:         actionBreak,
    build:         actionBuild,
    groove:        actionGroove,
    tension:       actionTension,
    fill:          actionFill,
    intro:         actionIntro,
    outro:         actionOutro,
    reharmonize:   actionReharmonize,
    mutate:        actionMutate,
    thinOut:       actionThinOut,
    thicken:       actionThicken,
    randomizeNotes:actionRandomizeNotes,
    randomizeBass: actionRandomizeBass,
    shiftNotesUp:  () => actionShiftNotes('up'),
    shiftNotesDown:() => actionShiftNotes('down'),
    shiftArp:      actionShiftArp,
    clear:         clearPattern,
  };

  // ── Song arc ──────────────────────────────────────────────────────────────
  const [songArc,    setSongArc]    = useState([]);
  const [arcIdx,     setArcIdx]     = useState(0);
  const [songActive, setSongActive] = useState(false);
  const songActiveRef = useRef(false);
  const arcRef        = useRef([]);
  const arcIdxRef     = useRef(0);
  const barCountRef   = useRef(0);
  // Sync refs via plain assignment — these are read only in audio callbacks,
  // never trigger renders, so useEffect would just add latency.
  songActiveRef.current = songActive;

  const startSongArc = useCallback(() => {
    const arc = pick(SONG_ARCS);
    arcRef.current      = arc;
    arcIdxRef.current   = 0;
    barCountRef.current = 0;
    setSongArc(arc);
    setArcIdx(0);
    setSongActive(true);
    setCurrentSectionName(arc[0]);
    regenerateSection(arc[0]);
  }, [regenerateSection]);

  const stopSongArc = useCallback(() => setSongActive(false), []);

  // ── Autopilot ─────────────────────────────────────────────────────────────
  const [autopilot,          setAutopilot]          = useState(false);
  const [autopilotIntensity, setAutopilotIntensity] = useState(0.5);
  const autopilotRef      = useRef(false);
  const autopilotTimerRef = useRef(null);
  autopilotRef.current = autopilot;

  const runAutopilot = useCallback(() => {
    if (!autopilotRef.current) return;
    const r = rnd(), intensity = autopilotIntensity;
    if      (r < 0.25 * intensity) actionMutate();
    else if (r < 0.40 * intensity) actionShiftArp();
    else if (r < 0.55)             regenerateSection(currentSectionName);
    else if (r < 0.65 * intensity) actionThinOut();
    else if (r < 0.75 * intensity) actionThicken();
    else if (r < 0.82)             actionReharmonize();
    if (rnd() < 0.15 * intensity)  triggerSection(pick(Object.keys(SECTIONS)));
    const delay = (8 + rnd() * 16) * (1 - intensity * 0.4) * 1000 * (240 / bpmRef.current);
    autopilotTimerRef.current = setTimeout(runAutopilot, delay);
  }, [
    autopilotIntensity, currentSectionName,
    actionMutate, actionShiftArp, actionThinOut, actionThicken, actionReharmonize,
    regenerateSection, triggerSection,
  ]);

  useEffect(() => {
    if (autopilot) {
      const delay = (4 + rnd() * 8) * 1000 * (240 / bpmRef.current);
      autopilotTimerRef.current = setTimeout(runAutopilot, delay);
    } else {
      clearTimeout(autopilotTimerRef.current);
    }
    return () => clearTimeout(autopilotTimerRef.current);
  }, [autopilot, runAutopilot]);

  // ── Presets — pure state updates, no mutation of GENRES ──────────────────
  const [bassPreset,        setBassPreset]        = useState('sub_floor');
  const [synthPreset,       setSynthPreset]       = useState('velvet_pad');
  const [drumPreset,        setDrumPreset]        = useState('tight_punch');
  const [performancePreset, setPerformancePreset] = useState('club_night');

  const applyPartialPreset = useCallback((preset) => {
    if (!preset) return;
    if (preset.space       !== undefined) setSpace(preset.space);
    if (preset.tone        !== undefined) setTone(preset.tone);
    if (preset.drive       !== undefined) setDrive(preset.drive);
    if (preset.compress    !== undefined) setCompress(preset.compress);
    if (preset.noiseMix    !== undefined) setNoiseMix(preset.noiseMix);
    if (preset.drumDecay   !== undefined) setDrumDecay(preset.drumDecay);
    if (preset.bassFilter  !== undefined) setBassFilter(preset.bassFilter);
    if (preset.synthFilter !== undefined) setSynthFilter(preset.synthFilter);
    if (preset.bassSubAmt  !== undefined) setBassSubAmt(preset.bassSubAmt);
    if (preset.fmIdx       !== undefined) setFmIdx(preset.fmIdx);
    if (preset.polySynth   !== undefined) setPolySynth(preset.polySynth);
    if (preset.bassStack   !== undefined) setBassStack(preset.bassStack);
    if (preset.grooveAmt   !== undefined) setGrooveAmt(preset.grooveAmt);
    if (preset.swing       !== undefined) setSwing(preset.swing);
  }, []);

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
    projectName, polySynth, bassStack,
    bassPreset, synthPreset, drumPreset, performancePreset,
    patterns, bassLine, synthLine, laneLen,
  }), [
    genre, modeName, bpm, currentSectionName, grooveProfile,
    space, tone, noiseMix, drive, compress, bassFilter, synthFilter,
    drumDecay, bassSubAmt, fmIdx, master, swing, humanize, grooveAmt,
    projectName, polySynth, bassStack,
    bassPreset, synthPreset, drumPreset, performancePreset,
    patterns, bassLine, synthLine, laneLen,
  ]);

  const applySnap = useCallback((snap, stopClockFn) => {
    if (!snap || snap.v !== 2) return;
    stopClockFn?.();
    arpModeRef.current = snap.arpMode ?? 'up';
    setBpm(snap.bpm ?? 128);
    setGenre(snap.genre ?? 'techno');
    setModeName(snap.modeName ?? 'minor');
    setCurrentSectionName(snap.currentSectionName ?? 'groove');
    setGrooveProfile(snap.grooveProfile ?? 'steady');
    setArpMode(snap.arpMode ?? 'up');
    setSpace(snap.space ?? 0.3);           setTone(snap.tone ?? 0.7);
    setNoiseMix(snap.noiseMix ?? 0.2);     setDrive(snap.drive ?? 0.1);
    setCompress(snap.compress ?? 0.3);     setBassFilter(snap.bassFilter ?? 0.55);
    setSynthFilter(snap.synthFilter ?? 0.65); setDrumDecay(snap.drumDecay ?? 0.5);
    setBassSubAmt(snap.bassSubAmt ?? 0.5); setFmIdx(snap.fmIdx ?? 0.6);
    setMaster(snap.master ?? 0.85);        setSwing(snap.swing ?? 0.03);
    setHumanize(snap.humanize ?? 0.012);   setGrooveAmt(snap.grooveAmt ?? 0.65);
    setPolySynth(snap.polySynth ?? true);  setBassStack(snap.bassStack ?? true);
    setBassPreset(snap.bassPreset ?? 'sub_floor');
    setSynthPreset(snap.synthPreset ?? 'velvet_pad');
    setDrumPreset(snap.drumPreset ?? 'tight_punch');
    setPerformancePreset(snap.performancePreset ?? 'club_night');
    if (snap.projectName) setProjectName(snap.projectName);
    if (snap.patterns)    setPatterns(snap.patterns);
    if (snap.bassLine)    setBassLine(snap.bassLine);
    if (snap.synthLine)   setSynthLine(snap.synthLine);
    if (snap.laneLen)     setLaneLen(snap.laneLen);
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
    const blob = new Blob([JSON.stringify(serialize(), null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }, [serialize, projectName]);

  const importJSON = useCallback(async (e, stopClockFn) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      applySnap(JSON.parse(await f.text()), stopClockFn);
    } catch (_) { /* silent */ } finally {
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
        setBpm(clamp(Math.round(60000 / avg), 40, 250));
      }
      return next.slice(-6);
    });
  }, []);

  // ── MIDI ──────────────────────────────────────────────────────────────────
  const [midiOk, setMidiOk] = useState(false);
  useEffect(() => {
    if (!navigator.requestMIDIAccess) return;
    navigator.requestMIDIAccess()
      .then(m => setMidiOk(true))
      .catch(() => {});
  }, []);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [status,     setStatus]     = useState('Ready — press PLAY');
  const [view,       setView]       = useState('perform');
  const [page,       setPage]       = useState(0);
  const [activeTab,  setActiveTab]  = useState('mix');
  const [activeLane, setActiveLane] = useState('kick');

  return {
    bpm, setBpm, bpmRef,
    genre, setGenre,
    modeName, setModeName,
    master, setMaster, swing, setSwing, humanize, setHumanize,
    grooveAmt, setGrooveAmt, grooveProfile, setGrooveProfile,
    space, setSpace, tone, setTone, noiseMix, setNoiseMix,
    drive, setDrive, compress, setCompress,
    bassFilter, setBassFilter, synthFilter, setSynthFilter,
    drumDecay, setDrumDecay, bassSubAmt, setBassSubAmt,
    fmIdx, setFmIdx, polySynth, setPolySynth, bassStack, setBassStack,
    swingRef, humanizeRef, grooveRef, grooveProfileRef, fmIdxRef,
    patternsRef, bassRef, synthRef, laneLenRef,
    patterns, bassLine, synthLine, laneLen,
    arpMode, arpModeRef, currentSectionName, setCurrentSectionName,
    progressionRef, lastBassRef,
    regenerateSection, newGenreSession, triggerSection,
    toggleCell, setNote, clearPattern, perfActions,
    undoLen, pushUndo, undo,
    songArc, arcIdx, setArcIdx, songActive,
    songActiveRef, arcRef, arcIdxRef, barCountRef,
    startSongArc, stopSongArc,
    autopilot, setAutopilot, autopilotIntensity, setAutopilotIntensity,
    bassPreset, setBassPreset, synthPreset, setSynthPreset,
    drumPreset, setDrumPreset, performancePreset, setPerformancePreset,
    applyPartialPreset,
    projectName, setProjectName, savedScenes,
    recordings, setRecordings, recState, setRecState,
    recorderRef, chunksRef, importRef,
    saveScene, loadScene, exportJSON, importJSON,
    tapTempo, midiOk,
    status, setStatus,
    view, setView, page, setPage, activeTab, setActiveTab, activeLane, setActiveLane,
  };
}
