/**
 * App.jsx — top-level orchestrator.
 * Wires useComposition + useAudioEngine, renders the shell UI.
 * All style objects come from ui.js — no inline style literals.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  GENRE_NAMES, GENRE_CLR, SOUND_PRESETS,
  clamp,
} from '../engine/musicEngine';
import { useComposition }  from '../hooks/useComposition.js';
import { useAudioEngine }  from '../hooks/useAudioEngine.js';
import { PerformView }     from '../components/PerformView.jsx';
import { StudioView }      from '../components/StudioView.jsx';
import { SongView }        from '../components/SongView.jsx';
import { PresetSelect }    from '../components/shared.jsx';
import {
  DIM, DIM2, MONO,
  pillStyle, viewBtnStyle, genreBtnStyle, autopilotBtnStyle,
  transportBtnStyle, bpmNudgeBtnStyle,
} from '../components/ui.js';

// ── Viewport hook ─────────────────────────────────────────────────────────────
function useViewport() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  useEffect(() => {
    const fn = () => setWidth(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return width;
}

// ── Static shell styles ───────────────────────────────────────────────────────
const ROOT_STYLE = {
  width:'100vw', height:'100dvh', background:'#060608', color:'#e8e8e8',
  fontFamily:MONO, display:'flex', flexDirection:'column',
  overflow:'hidden', userSelect:'none', position:'relative',
  boxSizing:'border-box', minWidth:0,
};
const SCANLINE = {
  position:'fixed', inset:0,
  backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px)',
  pointerEvents:'none', zIndex:999,
};
const topBarStyle = (phone) => ({ display:'flex', alignItems:'center', flexWrap:'wrap', gap:6, padding: phone ? '8px':'6px 10px', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0, minHeight:36, background:'rgba(0,0,0,0.4)', overflow:'hidden' });
const ctxBarStyle = (phone) => ({ display:'flex', alignItems:'center', flexWrap:'wrap', gap:8, padding: phone ? '6px 10px':'3px 10px', background:'rgba(0,0,0,0.25)', borderBottom:'1px solid rgba(255,255,255,0.04)', flexShrink:0, minHeight: phone ? 40:20, overflow:'hidden' });
const logoStyle   = (gc) => ({ fontSize:10, fontWeight:700, letterSpacing:'0.22em', color:gc, borderRadius:3, padding:'2px 6px', border:`1px solid ${gc}44`, whiteSpace:'nowrap' });
const projInput   = (phone) => ({ background:'transparent', border:'none', outline:'none', color:DIM, fontSize:10, fontFamily:MONO, letterSpacing:'0.08em', width: phone ? '100%':110, flex: phone ? 1:'0 0 auto', minWidth: phone ? 160:110 });
const bpmWidget   = { display:'flex', alignItems:'center', gap:2, background:'rgba(255,255,255,0.05)', borderRadius:4, padding:'2px 4px', border:'1px solid rgba(255,255,255,0.1)' };
const bpmNum      = (gc) => ({ fontSize:13, fontWeight:700, color:gc, fontFamily:MONO, lineHeight:1 });
const bpmLabel    = { fontSize:9.5, color:DIM, letterSpacing:'0.1em' };
const bpmCenter   = { textAlign:'center', minWidth:32 };
const tapBtn      = { padding:'1px 5px', borderRadius:2, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.04)', color:DIM, fontSize:9.5, cursor:'pointer', fontFamily:MONO, marginLeft:2 };
const clearBtn    = { padding:'4px 8px', borderRadius:3, border:'1px solid rgba(255,80,80,0.35)', background:'rgba(255,80,80,0.08)', color:'#ff8a8a', fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:MONO };
const midiDot     = (ok) => ({ width:5, height:5, borderRadius:'50%', background: ok ? '#00ff88':'rgba(255,255,255,0.12)', flexShrink:0 });
const flexSpacer  = { flex:1 };
const FLEX_ROW    = { display:'flex', alignItems:'center', gap:4, flexWrap:'wrap' };
const ctxDot      = { color:DIM, fontSize:10 };
const ctxText     = { fontSize:10, color:DIM, letterSpacing:'0.06em' };
const shortcutsHint = { fontSize:10, color:DIM, letterSpacing:'0.08em' };

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const comp = useComposition();
  const vw   = useViewport();
  const isCompact = vw < 1180;
  const isPhone   = vw < 820;

  const audio = useAudioEngine({
    genre:             comp.genre,
    modeName:          comp.modeName,
    bpmRef:            comp.bpmRef,
    swingRef:          comp.swingRef,
    humanizeRef:       comp.humanizeRef,
    grooveRef:         comp.grooveRef,
    grooveProfileRef:  comp.grooveProfileRef,
    fmIdxRef:          comp.fmIdxRef,
    patternsRef:       comp.patternsRef,
    bassRef:           comp.bassRef,
    synthRef:          comp.synthRef,
    laneLenRef:        comp.laneLenRef,
    noiseMix:          comp.noiseMix,
    drumDecay:         comp.drumDecay,
    bassSubAmt:        comp.bassSubAmt,
    synthFilter:       comp.synthFilter,
    bassFilter:        comp.bassFilter,
    space:             comp.space,
    tone:              comp.tone,
    drive:             comp.drive,
    compress:          comp.compress,
    master:            comp.master,
    polySynth:         comp.polySynth,
    bassStack:         comp.bassStack,
    currentSectionName:comp.currentSectionName,
    regenerateSection: comp.regenerateSection,
    songActiveRef:     comp.songActiveRef,
    arcRef:            comp.arcRef,
    arcIdxRef:         comp.arcIdxRef,
    barCountRef:       comp.barCountRef,
    setArcIdx:         comp.setArcIdx,
    setCurrentSectionName: comp.setCurrentSectionName,
  });

  const gc_ = GENRE_CLR[comp.genre] ?? '#ff4444';

  // ── Visualizer ────────────────────────────────────────────────────────────
  const vizRef = useRef(null);
  useEffect(() => {
    let rafId;
    const draw = () => {
      rafId = requestAnimationFrame(draw);
      const an = audio.getAnalyser();
      if (!an || !vizRef.current) return;
      const data = new Uint8Array(an.frequencyBinCount);
      an.getByteFrequencyData(data);
      const canvas = vizRef.current;
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const barW = W / data.length;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] / 255) * H;
        ctx.fillStyle = `${gc_}${Math.round((0.3 + v/H*0.7) * 255).toString(16).padStart(2,'0')}`;
        ctx.fillRect(i * barW, H - v, barW - 0.5, v);
      }
    };
    draw();
    return () => cancelAnimationFrame(rafId);
  }, [gc_]);

  // ── Recording bridge ──────────────────────────────────────────────────────
  const startRec = useCallback(async () => {
    const rec = await audio.startRecording();
    if (!rec || comp.recState === 'recording') return;
    comp.chunksRef.current = [];
    comp.recorderRef.current = rec;
    rec.ondataavailable = e => { if (e.data?.size > 0) comp.chunksRef.current.push(e.data); };
    rec.onstop = () => {
      const ft  = rec.mimeType ?? 'audio/webm';
      const ext = ft.includes('mp4') ? 'm4a' : 'webm';
      const url = URL.createObjectURL(new Blob(comp.chunksRef.current, { type: ft }));
      comp.setRecordings(p => [
        { url, name:`${comp.projectName.replace(/\s+/g,'-')}-take-${p.length+1}.${ext}`, time:new Date().toLocaleTimeString() },
        ...p.slice(0, 7),
      ]);
      comp.setRecState('idle');
      comp.setStatus('Take saved');
    };
    rec.start();
    comp.setRecState('recording');
    comp.setStatus('● REC');
  }, [audio, comp]);

  const stopRec = useCallback(() => {
    if (comp.recorderRef.current && comp.recState === 'recording') {
      comp.recorderRef.current.stop();
      comp.setRecState('stopping');
    }
  }, [comp]);

  // ── Preset bridges (add status message + setBassPreset etc.) ──────────────
  const applyBassPreset = useCallback((key) => {
    const p = SOUND_PRESETS.bass[key]; if (!p) return;
    comp.setBassPreset(key); comp.applyPartialPreset(p); comp.setStatus(`Bass — ${p.label}`);
  }, [comp]);
  const applySynthPreset = useCallback((key) => {
    const p = SOUND_PRESETS.synth[key]; if (!p) return;
    comp.setSynthPreset(key); comp.applyPartialPreset(p); comp.setStatus(`Synth — ${p.label}`);
  }, [comp]);
  const applyDrumPreset = useCallback((key) => {
    const p = SOUND_PRESETS.drum[key]; if (!p) return;
    comp.setDrumPreset(key); comp.applyPartialPreset(p); comp.setStatus(`Drum — ${p.label}`);
  }, [comp]);
  const applyPerformancePreset = useCallback((key) => {
    const p = SOUND_PRESETS.performance[key]; if (!p) return;
    comp.setPerformancePreset(key);
    if (p.genre && p.genre !== comp.genre) comp.newGenreSession(p.genre);
    comp.applyPartialPreset(p);
    comp.setStatus(`Perf — ${p.label}`);
  }, [comp]);

  // ── Transport ─────────────────────────────────────────────────────────────
  const togglePlay = useCallback(async () => {
    await audio.togglePlay();
    comp.setStatus(audio.isPlayingRef.current
      ? 'Stopped'
      : `Playing — ${comp.genre} · ${comp.currentSectionName}`
    );
  }, [audio, comp]);

  // ── BPM nudge helper ──────────────────────────────────────────────────────
  const nudgeBpm = useCallback((delta) => {
    const v = clamp(comp.bpm + delta, 40, 250);
    comp.setBpm(v);
    comp.bpmRef.current = v;
  }, [comp]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = e => {
      if (e.target.tagName === 'INPUT') return;
      switch (e.code) {
        case 'Space': e.preventDefault(); togglePlay(); break;
        case 'KeyA':  comp.perfActions.drop();    break;
        case 'KeyS':  comp.perfActions.break();   break;
        case 'KeyD':  comp.perfActions.build();   break;
        case 'KeyF':  comp.perfActions.groove();  break;
        case 'KeyG':  comp.perfActions.tension(); break;
        case 'KeyH':  comp.perfActions.fill();    break;
        case 'KeyM':  comp.perfActions.mutate();  break;
        case 'KeyR':  comp.regenerateSection(comp.currentSectionName); break;
        case 'KeyP':  comp.setAutopilot(v => !v); break;
        case 'KeyT':  comp.tapTempo(); break;
        case 'KeyZ':  if (e.metaKey || e.ctrlKey) comp.undo(); break;
        default: break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, comp]);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    comp.newGenreSession('techno');
    setTimeout(() => {
      applyBassPreset('sub_floor');
      applySynthPreset('velvet_pad');
      applyDrumPreset('tight_punch');
      applyPerformancePreset('club_night');
    }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Shared props for grid views ───────────────────────────────────────────
  const sharedGrid = {
    genre:comp.genre, gc:gc_,
    patterns:comp.patterns, bassLine:comp.bassLine, synthLine:comp.synthLine,
    laneLen:comp.laneLen, step:audio.step, page:comp.page, setPage:comp.setPage,
    toggleCell:comp.toggleCell, setNote:comp.setNote,
    modeName:comp.modeName, laneVU:audio.laneVU,
    compact:isCompact, phone:isPhone,
  };

  // ── Context bar items ─────────────────────────────────────────────────────
  const CTX_ITEMS = [
    comp.currentSectionName,
    comp.modeName,
    `arp:${comp.arpMode}`,
    `poly:${comp.polySynth ? '3v':'mono'} / bass:${comp.bassStack ? 'stack':'mono'}`,
  ];

  return (
    <div style={ROOT_STYLE}>
      <div style={SCANLINE} />

      {/* ── TOP BAR ── */}
      <div style={topBarStyle(isPhone)}>
        <div style={logoStyle(gc_)}>CESIRA V2</div>

        <input
          value={comp.projectName}
          onChange={e => comp.setProjectName(e.target.value)}
          style={projInput(isPhone)}
        />

        {/* Genre selector */}
        <div style={{ display:'flex', gap:2, flexShrink:0, flexWrap:'wrap', maxWidth: isPhone ? '100%':'none' }}>
          {GENRE_NAMES.map(g => (
            <button key={g} onClick={() => comp.newGenreSession(g)} style={genreBtnStyle(comp.genre === g, GENRE_CLR[g])}>
              {g}
            </button>
          ))}
        </div>

        <div style={flexSpacer} />

        {!isPhone && <canvas ref={vizRef} width={96} height={18} style={{ opacity:0.65, borderRadius:2 }} />}

        {/* BPM widget */}
        <div style={bpmWidget}>
          <button onClick={() => nudgeBpm(-5)} style={bpmNudgeBtnStyle(true)}>−</button>
          <button onClick={() => nudgeBpm(-1)} style={bpmNudgeBtnStyle(false)}>‹</button>
          <div style={bpmCenter}>
            <div style={bpmNum(gc_)}>{comp.bpm}</div>
            <div style={bpmLabel}>BPM</div>
          </div>
          <button onClick={() => nudgeBpm(1)}  style={bpmNudgeBtnStyle(false)}>›</button>
          <button onClick={() => nudgeBpm(5)}  style={bpmNudgeBtnStyle(true)}>+</button>
          <button onClick={comp.tapTempo} style={tapBtn}>TAP</button>
        </div>

        {/* Toggle buttons */}
        <div style={FLEX_ROW}>
          <button onClick={() => comp.setPolySynth(v => !v)} style={pillStyle(comp.polySynth, gc_)}>SYNTH POLY</button>
          <button onClick={() => comp.setBassStack(v => !v)} style={pillStyle(comp.bassStack, '#22d3ee')}>BASS STACK</button>
          <button onClick={comp.clearPattern} style={clearBtn}>CLEAR</button>
        </div>

        {/* Preset selectors */}
        <div style={{ ...FLEX_ROW, minWidth: isPhone ? '100%':'auto' }}>
          <PresetSelect label="BASS"  value={comp.bassPreset}        options={SOUND_PRESETS.bass}        onChange={applyBassPreset}        accent="#22d3ee" />
          <PresetSelect label="SYNTH" value={comp.synthPreset}       options={SOUND_PRESETS.synth}       onChange={applySynthPreset}       accent={gc_} />
          <PresetSelect label="DRUM"  value={comp.drumPreset}        options={SOUND_PRESETS.drum}        onChange={applyDrumPreset}        accent="#ffb347" />
          <PresetSelect label="PERF"  value={comp.performancePreset} options={SOUND_PRESETS.performance} onChange={applyPerformancePreset} accent="#7ee787" />
        </div>

        <button onClick={togglePlay} style={transportBtnStyle(audio.isPlaying)}>
          {audio.isPlaying ? '■ STOP' : '▶ PLAY'}
        </button>

        <button onClick={() => comp.setAutopilot(v => !v)} style={autopilotBtnStyle(comp.autopilot, gc_)}>
          {comp.autopilot ? '◈ AUTO' : '○ AUTO'}
        </button>

        {/* View toggle */}
        <div style={{ display:'flex', gap:2, flexShrink:0 }}>
          {['perform','studio','song'].map(v => (
            <button key={v} onClick={() => comp.setView(v)} style={viewBtnStyle(comp.view === v, gc_)}>{v}</button>
          ))}
        </div>

        {/* Status */}
        <div style={{ fontSize:10, color:DIM, maxWidth: isPhone ? '100%':100, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', letterSpacing:'0.05em', flex: isPhone ? '1 1 100%':'0 1 auto' }}>
          {comp.recState === 'recording' && <span style={{ color:'#ff2244', marginRight:3 }}>●</span>}
          {comp.status}
        </div>
        <div style={midiDot(comp.midiOk)} />
      </div>

      {/* ── CONTEXT BAR ── */}
      <div style={ctxBarStyle(isPhone)}>
        <span style={{ fontSize:9.5, color:DIM, letterSpacing:'0.12em', textTransform:'uppercase' }}>NOW PLAYING:</span>
        <span style={{ fontSize:10, fontWeight:700, color:gc_, letterSpacing:'0.1em', textTransform:'uppercase' }}>{comp.genre}</span>
        {CTX_ITEMS.map((item, i) => (
          <React.Fragment key={i}>
            <span style={ctxDot}>·</span>
            <span style={ctxText}>{item}</span>
          </React.Fragment>
        ))}
        <span style={ctxDot}>·</span>
        <span style={{ fontSize:10, color: audio.isPlaying ? '#00ff88':'rgba(255,255,255,0.95)', letterSpacing:'0.06em' }}>
          {audio.isPlaying ? '▶ RUNNING' : '■ STOPPED'}
        </span>
        {comp.autopilot && <><span style={ctxDot}>·</span><span style={{ ...ctxText, color:gc_ }}>◈ AUTOPILOT ON</span></>}
        {comp.songActive && <><span style={ctxDot}>·</span><span style={{ fontSize:10, color:'#ffaa00', letterSpacing:'0.06em' }}>ARC {comp.arcIdx+1}/{comp.songArc.length}</span></>}
        <div style={flexSpacer} />
        {!isPhone && <span style={shortcutsHint}>SPACE=play · A=drop · S=break · D=build · F=groove · G=tension · M=mutate · R=regen · P=auto · T=tap</span>}
      </div>

      {/* ── VIEWS ── */}
      {comp.view === 'perform' && (
        <PerformView
          {...sharedGrid}
          isPlaying={audio.isPlaying}
          currentSectionName={comp.currentSectionName}
          activeNotes={audio.activeNotes}
          arpeMode={comp.arpMode}
          autopilot={comp.autopilot}
          autopilotIntensity={comp.autopilotIntensity}
          setAutopilotIntensity={comp.setAutopilotIntensity}
          perfActions={comp.perfActions}
          regenerateSection={comp.regenerateSection}
          savedScenes={comp.savedScenes}
          saveScene={comp.saveScene}
          loadScene={comp.loadScene}
          master={comp.master}      setMaster={comp.setMaster}
          space={comp.space}        setSpace={comp.setSpace}
          tone={comp.tone}          setTone={comp.setTone}
          drive={comp.drive}        setDrive={comp.setDrive}
          grooveAmt={comp.grooveAmt} setGrooveAmt={comp.setGrooveAmt}
          swing={comp.swing}        setSwing={comp.setSwing}
          songArc={comp.songArc}    arcIdx={comp.arcIdx}    songActive={comp.songActive}
        />
      )}

      {comp.view === 'studio' && (
        <StudioView
          {...sharedGrid}
          currentSectionName={comp.currentSectionName}
          space={comp.space}          setSpace={comp.setSpace}
          tone={comp.tone}            setTone={comp.setTone}
          noiseMix={comp.noiseMix}    setNoiseMix={comp.setNoiseMix}
          drive={comp.drive}          setDrive={comp.setDrive}
          compress={comp.compress}    setCompress={comp.setCompress}
          bassFilter={comp.bassFilter}   setBassFilter={comp.setBassFilter}
          synthFilter={comp.synthFilter} setSynthFilter={comp.setSynthFilter}
          drumDecay={comp.drumDecay}     setDrumDecay={comp.setDrumDecay}
          bassSubAmt={comp.bassSubAmt}   setBassSubAmt={comp.setBassSubAmt}
          fmIdx={comp.fmIdx}             setFmIdx={comp.setFmIdx}
          master={comp.master}        setMaster={comp.setMaster}
          swing={comp.swing}          setSwing={comp.setSwing}
          humanize={comp.humanize}    setHumanize={comp.setHumanize}
          grooveAmt={comp.grooveAmt}  setGrooveAmt={comp.setGrooveAmt}
          grooveProfile={comp.grooveProfile}
          setGrooveProfile={comp.setGrooveProfile}
          regenerateSection={comp.regenerateSection}
          undoLen={comp.undoLen}      undo={comp.undo}
          recState={comp.recState}    startRec={startRec}   stopRec={stopRec}
          recordings={comp.recordings}
          exportJSON={comp.exportJSON}
          importRef={comp.importRef}
          importJSON={e => comp.importJSON(e, audio.stopClock)}
          savedScenes={comp.savedScenes}
          saveScene={comp.saveScene}
          loadScene={slot => comp.loadScene(slot, audio.stopClock)}
          projectName={comp.projectName} setProjectName={comp.setProjectName}
          clearPattern={comp.clearPattern}
          polySynth={comp.polySynth} setPolySynth={comp.setPolySynth}
          bassStack={comp.bassStack}  setBassStack={comp.setBassStack}
          bassPreset={comp.bassPreset}               synthPreset={comp.synthPreset}
          drumPreset={comp.drumPreset}               performancePreset={comp.performancePreset}
          applyBassPreset={applyBassPreset}           applySynthPreset={applySynthPreset}
          applyDrumPreset={applyDrumPreset}           applyPerformancePreset={applyPerformancePreset}
        />
      )}

      {comp.view === 'song' && (
        <SongView
          genre={comp.genre}  gc={gc_}
          songArc={comp.songArc}    arcIdx={comp.arcIdx}    songActive={comp.songActive}
          startSongArc={comp.startSongArc}  stopSongArc={comp.stopSongArc}
          currentSectionName={comp.currentSectionName}
          triggerSection={comp.triggerSection}
          modeName={comp.modeName}  arpeMode={comp.arpMode}  bpm={comp.bpm}
          compact={isCompact}       phone={isPhone}
        />
      )}
    </div>
  );
}
