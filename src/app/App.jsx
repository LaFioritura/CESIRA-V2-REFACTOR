/**
 * App.jsx — top-level orchestrator.
 * Wires together useComposition + useAudioEngine, renders the shell UI.
 * No synthesis, no generation logic lives here.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  GENRE_NAMES, GENRE_CLR, SOUND_PRESETS, SECTIONS, SONG_ARCS,
  clamp, pick,
} from '../engine/musicEngine';
import { useComposition }  from '../hooks/useComposition.js';
import { useAudioEngine }  from '../hooks/useAudioEngine.js';
import { PerformView }     from '../components/PerformView.jsx';
import { StudioView }      from '../components/StudioView.jsx';
import { SongView }        from '../components/SongView.jsx';
import { PresetSelect }    from '../components/shared.jsx';
import { DIM, MONO, pillStyle } from '../components/ui.js';

// ── Viewport hook ─────────────────────────────────────────────────────────────
function useViewport() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const comp = useComposition();

  const audio = useAudioEngine({
    genre:          comp.genre,
    modeName:       comp.modeName,
    bpmRef:         comp.bpmRef,
    swingRef:       comp.swingRef,
    humanizeRef:    comp.humanizeRef,
    grooveRef:      comp.grooveRef,
    grooveProfileRef: comp.grooveProfileRef,
    fmIdxRef:       comp.fmIdxRef,
    patternsRef:    comp.patternsRef,
    bassRef:        comp.bassRef,
    synthRef:       comp.synthRef,
    laneLenRef:     comp.laneLenRef,
    noiseMix:       comp.noiseMix,
    drumDecay:      comp.drumDecay,
    bassSubAmt:     comp.bassSubAmt,
    synthFilter:    comp.synthFilter,
    bassFilter:     comp.bassFilter,
    space:          comp.space,
    tone:           comp.tone,
    drive:          comp.drive,
    compress:       comp.compress,
    master:         comp.master,
    polySynth:      comp.polySynth,
    bassStack:      comp.bassStack,
    currentSectionName: comp.currentSectionName,
    regenerateSection:  comp.regenerateSection,
    songActiveRef:  comp.songActiveRef,
    arcRef:         comp.arcRef,
    arcIdxRef:      comp.arcIdxRef,
    barCountRef:    comp.barCountRef,
    setArcIdx:      comp.setArcIdx,
    setCurrentSectionName: comp.setCurrentSectionName,
  });

  // ── Derived layout values ─────────────────────────────────────────────────
  const viewportWidth = useViewport();
  const isCompact = viewportWidth < 1180;
  const isPhone   = viewportWidth < 820;
  const gc_ = GENRE_CLR[comp.genre] ?? '#ff4444';

  // ── Visualizer canvas ─────────────────────────────────────────────────────
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
        const alpha = 0.3 + v / H * 0.7;
        ctx.fillStyle = `${gc_}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
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
      const blob = new Blob(comp.chunksRef.current, { type: ft });
      const url  = URL.createObjectURL(blob);
      comp.setRecordings(p => [
        { url, name: `${comp.projectName.replace(/\s+/g, '-')}-take-${p.length + 1}.${ext}`, time: new Date().toLocaleTimeString() },
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

  // ── Preset application (mutates GENRES inline, preserves original logic) ──
  const applyBassPreset = useCallback((key) => {
    const preset = SOUND_PRESETS.bass[key];
    if (!preset) return;
    comp.setBassPreset(key);
    comp.applyPartialPreset({ ...preset });
    comp.setStatus(`Bass preset — ${preset.label}`);
  }, [comp]);

  const applySynthPreset = useCallback((key) => {
    const preset = SOUND_PRESETS.synth[key];
    if (!preset) return;
    comp.setSynthPreset(key);
    comp.applyPartialPreset({ ...preset });
    comp.setStatus(`Synth preset — ${preset.label}`);
  }, [comp]);

  const applyDrumPreset = useCallback((key) => {
    const preset = SOUND_PRESETS.drum[key];
    if (!preset) return;
    comp.setDrumPreset(key);
    comp.applyPartialPreset({ ...preset });
    comp.setStatus(`Drum preset — ${preset.label}`);
  }, [comp]);

  const applyPerformancePreset = useCallback((key) => {
    const preset = SOUND_PRESETS.performance[key];
    if (!preset) return;
    comp.setPerformancePreset(key);
    comp.applyPartialPreset({ ...preset });
    comp.setStatus(`Performance preset — ${preset.label}`);
  }, [comp]);

  // ── Toggle play with status update ───────────────────────────────────────
  const togglePlay = useCallback(async () => {
    await audio.togglePlay();
    if (audio.isPlayingRef.current) {
      comp.setStatus('Stopped');
    } else {
      comp.setStatus(`Playing — ${comp.genre} · ${comp.currentSectionName}`);
    }
  }, [audio, comp]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = e => {
      if (e.target.tagName === 'INPUT') return;
      switch (e.code) {
        case 'Space':  e.preventDefault(); togglePlay(); break;
        case 'KeyA':   comp.perfActions.drop();    break;
        case 'KeyS':   comp.perfActions.break();   break;
        case 'KeyD':   comp.perfActions.build();   break;
        case 'KeyF':   comp.perfActions.groove();  break;
        case 'KeyG':   comp.perfActions.tension(); break;
        case 'KeyH':   comp.perfActions.fill();    break;
        case 'KeyM':   comp.perfActions.mutate();  break;
        case 'KeyR':   comp.regenerateSection(comp.currentSectionName); break;
        case 'KeyP':   comp.setAutopilot(v => !v); break;
        case 'KeyT':   comp.tapTempo(); break;
        case 'KeyZ':   if (e.metaKey || e.ctrlKey) comp.undo(); break;
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

  // ── View props bundles ────────────────────────────────────────────────────
  const sharedGridProps = {
    genre: comp.genre, gc: gc_,
    patterns: comp.patterns, bassLine: comp.bassLine, synthLine: comp.synthLine,
    laneLen: comp.laneLen, step: audio.step, page: comp.page, setPage: comp.setPage,
    toggleCell: comp.toggleCell, setNote: comp.setNote,
    modeName: comp.modeName, laneVU: audio.laneVU,
    compact: isCompact, phone: isPhone,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      width: '100vw', height: '100dvh', background: '#060608', color: '#e8e8e8',
      fontFamily: MONO, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', userSelect: 'none', position: 'relative', boxSizing: 'border-box', minWidth: 0,
    }}>
      {/* Scanline overlay */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px)',
        pointerEvents: 'none', zIndex: 999,
      }} />

      {/* ── TOP BAR ── */}
      <div style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6,
        padding: isPhone ? '8px' : '6px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0, minHeight: 36,
        background: 'rgba(0,0,0,0.4)', overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: gc_, borderRadius: 3, padding: '2px 6px', border: `1px solid ${gc_}44`, whiteSpace: 'nowrap' }}>
          CESIRA V2
        </div>

        {/* Project name */}
        <input
          value={comp.projectName}
          onChange={e => comp.setProjectName(e.target.value)}
          style={{ background: 'transparent', border: 'none', outline: 'none', color: DIM, fontSize: 10, fontFamily: MONO, letterSpacing: '0.08em', width: isPhone ? '100%' : 110, flex: isPhone ? 1 : '0 0 auto', minWidth: isPhone ? 160 : 110 }}
        />

        {/* Genre selector */}
        <div style={{ display: 'flex', gap: 2, flexShrink: 0, flexWrap: 'wrap', maxWidth: isPhone ? '100%' : 'none' }}>
          {GENRE_NAMES.map(g => (
            <button key={g} onClick={() => comp.newGenreSession(g)} style={{
              padding: '2px 5px', borderRadius: 2, fontSize: 10, fontWeight: 700, cursor: 'pointer',
              letterSpacing: '0.1em', fontFamily: MONO, textTransform: 'uppercase', transition: 'all 0.1s',
              border: `1px solid ${comp.genre === g ? GENRE_CLR[g] : 'rgba(255,255,255,0.07)'}`,
              background: comp.genre === g ? `${GENRE_CLR[g]}18` : 'transparent',
              color: comp.genre === g ? GENRE_CLR[g] : 'rgba(255,255,255,0.95)',
            }}>{g}</button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Visualizer */}
        {!isPhone && <canvas ref={vizRef} width={96} height={18} style={{ opacity: 0.65, borderRadius: 2 }} />}

        {/* BPM control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 4, padding: '2px 4px', border: '1px solid rgba(255,255,255,0.1)' }}>
          {[{ delta: -5, label: '−' }, { delta: -1, label: '‹' }].map(({ delta, label }) => (
            <button key={label} onClick={() => { const v = clamp(comp.bpm + delta, 40, 250); comp.setBpm(v); comp.bpmRef.current = v; }} style={{
              width: Math.abs(delta) === 5 ? 16 : 14, height: 16, borderRadius: 2, border: 'none',
              background: Math.abs(delta) === 5 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
              color: DIM, fontSize: 10, cursor: 'pointer', fontFamily: MONO, lineHeight: 1, flexShrink: 0,
            }}>{label}</button>
          ))}
          <div style={{ textAlign: 'center', minWidth: 32 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: gc_, fontFamily: MONO, lineHeight: 1 }}>{comp.bpm}</div>
            <div style={{ fontSize: 9.5, color: DIM, letterSpacing: '0.1em' }}>BPM</div>
          </div>
          {[{ delta: 1, label: '›' }, { delta: 5, label: '+' }].map(({ delta, label }) => (
            <button key={label} onClick={() => { const v = clamp(comp.bpm + delta, 40, 250); comp.setBpm(v); comp.bpmRef.current = v; }} style={{
              width: delta === 5 ? 16 : 14, height: 16, borderRadius: 2, border: 'none',
              background: delta === 5 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
              color: DIM, fontSize: 10, cursor: 'pointer', fontFamily: MONO, lineHeight: 1, flexShrink: 0,
            }}>{label}</button>
          ))}
          <button onClick={comp.tapTempo} style={{ padding: '1px 5px', borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: DIM, fontSize: 9.5, cursor: 'pointer', fontFamily: MONO, marginLeft: 2 }}>TAP</button>
        </div>

        {/* Toggle buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <button onClick={() => comp.setPolySynth(v => !v)} style={pillStyle(comp.polySynth, gc_)}>SYNTH POLY</button>
          <button onClick={() => comp.setBassStack(v => !v)} style={pillStyle(comp.bassStack, '#22d3ee')}>BASS STACK</button>
          <button onClick={comp.clearPattern} style={{ padding: '4px 8px', borderRadius: 3, border: '1px solid rgba(255,80,80,0.35)', background: 'rgba(255,80,80,0.08)', color: '#ff8a8a', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: MONO }}>CLEAR</button>
        </div>

        {/* Preset selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', minWidth: isPhone ? '100%' : 'auto' }}>
          <PresetSelect label="BASS"  value={comp.bassPreset}        options={SOUND_PRESETS.bass}        onChange={applyBassPreset}        accent="#22d3ee" />
          <PresetSelect label="SYNTH" value={comp.synthPreset}       options={SOUND_PRESETS.synth}       onChange={applySynthPreset}       accent={gc_} />
          <PresetSelect label="DRUM"  value={comp.drumPreset}        options={SOUND_PRESETS.drum}        onChange={applyDrumPreset}        accent="#ffb347" />
          <PresetSelect label="PERF"  value={comp.performancePreset} options={SOUND_PRESETS.performance} onChange={applyPerformancePreset} accent="#7ee787" />
        </div>

        {/* Transport */}
        <button onClick={togglePlay} style={{
          padding: '4px 14px', borderRadius: 3, border: 'none',
          background: audio.isPlaying ? '#ff2244' : '#00cc66',
          color: '#000', fontSize: 10, fontWeight: 700, cursor: 'pointer',
          letterSpacing: '0.1em', fontFamily: MONO,
          boxShadow: audio.isPlaying ? '0 0 12px #ff224466' : '0 0 12px #00cc6666',
          transition: 'all 0.1s', flexShrink: 0,
        }}>{audio.isPlaying ? '■ STOP' : '▶ PLAY'}</button>

        {/* Autopilot */}
        <button onClick={() => comp.setAutopilot(v => !v)} style={{
          padding: '4px 8px', borderRadius: 3, fontSize: 10, fontWeight: 700, cursor: 'pointer',
          letterSpacing: '0.1em', fontFamily: MONO, transition: 'all 0.12s', flexShrink: 0,
          border: `1px solid ${comp.autopilot ? gc_ : 'rgba(255,255,255,0.1)'}`,
          background: comp.autopilot ? `${gc_}22` : 'rgba(255,255,255,0.04)',
          color: comp.autopilot ? gc_ : 'rgba(255,255,255,0.38)',
          boxShadow: comp.autopilot ? `0 0 10px ${gc_}55` : 'none',
        }}>{comp.autopilot ? '◈ AUTO' : '○ AUTO'}</button>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          {['perform', 'studio', 'song'].map(v => (
            <button key={v} onClick={() => comp.setView(v)} style={{
              padding: '2px 6px', borderRadius: 2, fontSize: 10, fontWeight: 700, cursor: 'pointer',
              letterSpacing: '0.08em', fontFamily: MONO, textTransform: 'uppercase',
              border: `1px solid ${comp.view === v ? gc_ : 'rgba(255,255,255,0.08)'}`,
              background: comp.view === v ? `${gc_}18` : 'transparent',
              color: comp.view === v ? gc_ : 'rgba(255,255,255,0.96)',
            }}>{v}</button>
          ))}
        </div>

        {/* Status */}
        <div style={{ fontSize: 10, color: DIM, maxWidth: isPhone ? '100%' : 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.05em', flex: isPhone ? '1 1 100%' : '0 1 auto' }}>
          {comp.recState === 'recording' && <span style={{ color: '#ff2244', marginRight: 3 }}>●</span>}{comp.status}
        </div>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: comp.midiOk ? '#00ff88' : 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
      </div>

      {/* ── CONTEXT BAR ── */}
      <div style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
        padding: isPhone ? '6px 10px' : '3px 10px',
        background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid rgba(255,255,255,0.04)',
        flexShrink: 0, minHeight: isPhone ? 40 : 20, overflow: 'hidden',
      }}>
        <span style={{ fontSize: 9.5, color: DIM, letterSpacing: '0.12em', textTransform: 'uppercase' }}>NOW PLAYING:</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: gc_, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{comp.genre}</span>
        {[comp.currentSectionName, comp.modeName, `arp:${comp.arpMode}`, `poly:${comp.polySynth ? '3v' : 'mono'} / bass:${comp.bassStack ? 'stack' : 'mono'}`].map((item, i) => (
          <React.Fragment key={i}>
            <span style={{ color: DIM, fontSize: 10 }}>·</span>
            <span style={{ fontSize: 10, color: DIM, letterSpacing: '0.06em' }}>{item}</span>
          </React.Fragment>
        ))}
        <span style={{ color: DIM, fontSize: 10 }}>·</span>
        <span style={{ fontSize: 10, color: audio.isPlaying ? '#00ff88' : 'rgba(255,255,255,0.95)', letterSpacing: '0.06em' }}>
          {audio.isPlaying ? '▶ RUNNING' : '■ STOPPED'}
        </span>
        {comp.autopilot && (
          <><span style={{ color: DIM, fontSize: 10 }}>·</span><span style={{ fontSize: 10, color: gc_, letterSpacing: '0.06em' }}>◈ AUTOPILOT ON</span></>
        )}
        {comp.songActive && (
          <><span style={{ color: DIM, fontSize: 10 }}>·</span><span style={{ fontSize: 10, color: '#ffaa00', letterSpacing: '0.06em' }}>ARC {comp.arcIdx + 1}/{comp.songArc.length}</span></>
        )}
        <div style={{ flex: 1 }} />
        {!isPhone && (
          <span style={{ fontSize: 10, color: DIM, letterSpacing: '0.08em' }}>
            SPACE=play · A=drop · S=break · D=build · F=groove · G=tension · M=mutate · R=regen · P=auto · T=tap
          </span>
        )}
      </div>

      {/* ── VIEWS ── */}
      {comp.view === 'perform' && (
        <PerformView
          {...sharedGridProps}
          isPlaying={audio.isPlaying}
          currentSectionName={comp.currentSectionName}
          activeNotes={audio.activeNotes}
          arpeMode={comp.arpMode}
          autopilot={comp.autopilot}
          autopilotIntensity={comp.autopilotIntensity} setAutopilotIntensity={comp.setAutopilotIntensity}
          perfActions={comp.perfActions} regenerateSection={comp.regenerateSection}
          savedScenes={comp.savedScenes} saveScene={comp.saveScene} loadScene={comp.loadScene}
          master={comp.master} setMaster={comp.setMaster}
          space={comp.space} setSpace={comp.setSpace}
          tone={comp.tone} setTone={comp.setTone}
          drive={comp.drive} setDrive={comp.setDrive}
          grooveAmt={comp.grooveAmt} setGrooveAmt={comp.setGrooveAmt}
          swing={comp.swing} setSwing={comp.setSwing}
          songArc={comp.songArc} arcIdx={comp.arcIdx} songActive={comp.songActive}
          bassPreset={comp.bassPreset} synthPreset={comp.synthPreset} drumPreset={comp.drumPreset} performancePreset={comp.performancePreset}
          applyBassPreset={applyBassPreset} applySynthPreset={applySynthPreset} applyDrumPreset={applyDrumPreset} applyPerformancePreset={applyPerformancePreset}
        />
      )}

      {comp.view === 'studio' && (
        <StudioView
          {...sharedGridProps}
          currentSectionName={comp.currentSectionName}
          space={comp.space} setSpace={comp.setSpace}
          tone={comp.tone} setTone={comp.setTone}
          noiseMix={comp.noiseMix} setNoiseMix={comp.setNoiseMix}
          drive={comp.drive} setDrive={comp.setDrive}
          compress={comp.compress} setCompress={comp.setCompress}
          bassFilter={comp.bassFilter} setBassFilter={comp.setBassFilter}
          synthFilter={comp.synthFilter} setSynthFilter={comp.setSynthFilter}
          drumDecay={comp.drumDecay} setDrumDecay={comp.setDrumDecay}
          bassSubAmt={comp.bassSubAmt} setBassSubAmt={comp.setBassSubAmt}
          fmIdx={comp.fmIdx} setFmIdx={v => { comp.setFmIdx(v); comp.fmIdxRef.current = v; }}
          master={comp.master} setMaster={comp.setMaster}
          swing={comp.swing} setSwing={comp.setSwing}
          humanize={comp.humanize} setHumanize={comp.setHumanize}
          grooveAmt={comp.grooveAmt} setGrooveAmt={comp.setGrooveAmt}
          grooveProfile={comp.grooveProfile}
          setGrooveProfile={v => { comp.setGrooveProfile(v); comp.grooveProfileRef.current = v; }}
          regenerateSection={comp.regenerateSection}
          undoLen={comp.undoLen} undo={comp.undo}
          recState={comp.recState} startRec={startRec} stopRec={stopRec}
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
          bassStack={comp.bassStack} setBassStack={comp.setBassStack}
          bassPreset={comp.bassPreset} synthPreset={comp.synthPreset} drumPreset={comp.drumPreset} performancePreset={comp.performancePreset}
          applyBassPreset={applyBassPreset} applySynthPreset={applySynthPreset} applyDrumPreset={applyDrumPreset} applyPerformancePreset={applyPerformancePreset}
        />
      )}

      {comp.view === 'song' && (
        <SongView
          genre={comp.genre} gc={gc_}
          songArc={comp.songArc} arcIdx={comp.arcIdx} songActive={comp.songActive}
          startSongArc={comp.startSongArc} stopSongArc={comp.stopSongArc}
          currentSectionName={comp.currentSectionName}
          triggerSection={comp.triggerSection}
          modeName={comp.modeName} arpeMode={comp.arpMode}
          bpm={comp.bpm}
          compact={isCompact} phone={isPhone}
        />
      )}
    </div>
  );
}
