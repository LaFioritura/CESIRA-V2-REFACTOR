/**
 * StudioView — detailed pattern + mixer editor.
 */

import React, { useState } from 'react';
import { MAX_STEPS, LANE_CLR, MODES, SECTIONS, SOUND_PRESETS, clamp } from '../engine/musicEngine';
import { navBtnStyle, DIM, MONO } from './ui.js';
import { NavPager, VuBar, Fader, PresetSelect } from './shared.jsx';

const TABS = ['mixer', 'synth', 'session'];

export function StudioView({
  genre, gc, patterns, bassLine, synthLine, laneLen, step, page, setPage,
  toggleCell, setNote, modeName, laneVU,
  space, setSpace, tone, setTone, noiseMix, setNoiseMix,
  drive, setDrive, compress, setCompress,
  bassFilter, setBassFilter, synthFilter, setSynthFilter,
  drumDecay, setDrumDecay, bassSubAmt, setBassSubAmt, fmIdx, setFmIdx,
  master, setMaster, swing, setSwing, humanize, setHumanize,
  grooveAmt, setGrooveAmt, grooveProfile, setGrooveProfile,
  regenerateSection, currentSectionName, undoLen, undo,
  recState, startRec, stopRec, recordings,
  exportJSON, importRef, importJSON,
  savedScenes, saveScene, loadScene,
  projectName, setProjectName, clearPattern,
  polySynth, setPolySynth, bassStack, setBassStack,
  bassPreset, synthPreset, drumPreset, performancePreset,
  applyBassPreset, applySynthPreset, applyDrumPreset, applyPerformancePreset,
  compact, phone,
}) {
  const [tab,          setTab]          = useState('mixer');
  const [noteEditLane, setNoteEditLane] = useState('bass');

  const visibleStart = page * 16;
  const visibleEnd   = Math.min(visibleStart + 16, MAX_STEPS);
  const visIdx = Array.from({ length: visibleEnd - visibleStart }, (_, i) => visibleStart + i);
  const mode     = MODES[modeName] ?? MODES.minor;
  const notePool = noteEditLane === 'bass' ? mode.b : mode.s;

  const MIXER_FADERS = [
    { l: 'MASTER',       v: master,      s: setMaster,      c: '#ffffff' },
    { l: 'SPACE',        v: space,       s: setSpace,       c: '#44ffcc' },
    { l: 'TONE',         v: tone,        s: setTone,        c: '#22d3ee' },
    { l: 'NOISE',        v: noiseMix,    s: setNoiseMix,    c: '#aaaaaa' },
    { l: 'DRIVE',        v: drive,       s: setDrive,       c: '#ff8844' },
    { l: 'COMPRESS',     v: compress,    s: setCompress,    c: '#ffaa44' },
    { l: 'BASS FILTER',  v: bassFilter,  s: setBassFilter,  c: LANE_CLR.bass  },
    { l: 'SYNTH FILTER', v: synthFilter, s: setSynthFilter, c: LANE_CLR.synth },
    { l: 'DRUM DECAY',   v: drumDecay,   s: setDrumDecay,   c: LANE_CLR.kick  },
    { l: 'BASS SUB',     v: bassSubAmt,  s: setBassSubAmt,  c: LANE_CLR.bass  },
    { l: 'SWING',        v: swing,       s: setSwing,       c: '#aa88ff', min: 0, max: 0.25 },
    { l: 'HUMANIZE',     v: humanize,    s: setHumanize,    c: '#88aaff', min: 0, max: 0.05 },
    { l: 'GROOVE AMT',   v: grooveAmt,   s: setGrooveAmt,   c: '#ffdd00' },
    { l: 'FM INDEX',     v: fmIdx,       s: setFmIdx,       c: '#cc88ff', min: 0, max: 3 },
  ];

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: compact ? 'column' : 'row',
      gap: 5, padding: phone ? '8px' : '5px 7px 8px', minHeight: 0,
      overflowY: 'auto', overflowX: 'hidden',
    }}>

      {/* ── LEFT — Grid editor ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, height: 20, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: DIM, letterSpacing: '0.1em' }}>
            {genre.toUpperCase()} · {modeName.toUpperCase()} · {currentSectionName.toUpperCase()}
          </span>
          <div style={{ flex: 1 }} />
          <button onClick={undo} disabled={undoLen === 0} style={{ ...navBtnStyle, opacity: undoLen > 0 ? 1 : 0.3, fontSize: 10 }}>
            ↩ ({undoLen})
          </button>
          <NavPager page={page} setPage={setPage} />
        </div>

        {['kick', 'snare', 'hat', 'bass', 'synth'].map(lane => {
          const lc = LANE_CLR[lane];
          const ll = laneLen[lane] ?? 16;
          const vu = laneVU[lane] ?? 0;
          return (
            <div key={lane} style={{ flex: 1, display: 'flex', alignItems: 'stretch', gap: 4, minHeight: 0 }}>
              <div style={{ width: 36, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: lc, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{lane}</span>
                <VuBar value={vu} color={lc} height={2} />
              </div>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${visIdx.length},1fr)`, gap: 1.5, alignItems: 'stretch' }}>
                {visIdx.map(idx => {
                  if (idx >= ll) return <div key={idx} style={{ borderRadius: 2, background: 'rgba(255,255,255,0.015)', opacity: 0.4 }} />;
                  const sd = patterns[lane][idx];
                  const on = sd.on, isActive = step === idx;
                  const isTied = sd.tied, isBeat = idx % 4 === 0, isBar = idx % 16 === 0;
                  const borderColor = isActive ? lc : isBar ? `${lc}44` : isBeat ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)';
                  const velHex = on ? Math.round(clamp(sd.p ?? 1, 0.3, 1) * 255).toString(16).padStart(2, '0') : '';
                  return (
                    <button key={idx} onClick={() => toggleCell(lane, idx)} style={{
                      borderRadius: isTied ? '1px 2px 2px 1px' : '2px',
                      border: `1px solid ${borderColor}`,
                      borderLeft: isTied ? `2px solid ${lc}44` : `1px solid ${borderColor}`,
                      background: isActive ? `${lc}88` : isTied ? `${lc}1a` : on ? `${lc}${velHex}` : 'rgba(255,255,255,0.02)',
                      boxShadow:  isActive ? `0 0 7px ${lc}77` : on && !isTied ? `0 0 2px ${lc}22` : 'none',
                      cursor: 'pointer', transition: 'background 0.03s',
                    }} />
                  );
                })}
              </div>
              {/* Note edit row for bass / synth */}
              {(lane === 'bass' || lane === 'synth') && (
                <div style={{ width: 28, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <button
                    onClick={() => setNoteEditLane(lane)}
                    style={{
                      padding: '1px 2px', borderRadius: 2, fontSize: 9.5, cursor: 'pointer', fontFamily: MONO,
                      border: `1px solid ${noteEditLane === lane ? lc : 'rgba(255,255,255,0.07)'}`,
                      background: noteEditLane === lane ? `${lc}22` : 'transparent',
                      color: noteEditLane === lane ? lc : DIM,
                    }}
                  >EDIT</button>
                </div>
              )}
            </div>
          );
        })}

        {/* Note selector for active lane */}
        <div style={{ display: 'flex', gap: 1.5, flexShrink: 0 }}>
          {notePool.map(note => (
            <button key={note} onClick={() => {
              visIdx.forEach(idx => {
                const lane = noteEditLane;
                if (patterns[lane][idx]?.on) setNote(lane, idx, note);
              });
            }} style={{
              flex: 1, padding: '1px', borderRadius: 2, fontSize: 8, cursor: 'pointer', fontFamily: MONO,
              border: `1px solid ${LANE_CLR[noteEditLane]}33`,
              background: 'rgba(255,255,255,0.02)',
              color: LANE_CLR[noteEditLane],
            }}>{note.replace(/[0-9]/g, '')}</button>
          ))}
        </div>
      </div>

      {/* ── RIGHT — Tabbed panel ── */}
      <div style={{ width: compact ? '100%' : 160, display: 'flex', flexDirection: 'column', minHeight: 0, flexShrink: 0 }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 2, padding: '4px 0', flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '3px', borderRadius: 2, fontSize: 9.5, cursor: 'pointer', fontFamily: MONO,
              border: `1px solid ${tab === t ? gc : 'rgba(255,255,255,0.07)'}`,
              background: tab === t ? `${gc}18` : 'rgba(255,255,255,0.02)',
              color: tab === t ? gc : DIM,
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>{t}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 7px', display: 'flex', flexDirection: 'column', gap: 4 }}>

          {tab === 'mixer' && (
            <>
              {MIXER_FADERS.map(({ l, v, s, c, min, max }) => (
                <Fader key={l} label={l} value={v} setter={s} color={c} min={min} max={max} />
              ))}
              <div>
                <div style={{ fontSize: 10, color: DIM, letterSpacing: '0.1em', marginBottom: 2, textTransform: 'uppercase' }}>GROOVE PROFILE</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  {['steady', 'broken', 'bunker', 'float'].map(gp => (
                    <button key={gp} onClick={() => setGrooveProfile(gp)} style={{
                      padding: '3px', borderRadius: 2, fontSize: 9.5, cursor: 'pointer', fontFamily: MONO,
                      border: `1px solid ${grooveProfile === gp ? gc : 'rgba(255,255,255,0.08)'}`,
                      background: grooveProfile === gp ? `${gc}18` : 'rgba(255,255,255,0.02)',
                      color: grooveProfile === gp ? gc : DIM,
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>{gp}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'synth' && (
            <>
              <div style={{ fontSize: 10, color: DIM, letterSpacing: '0.1em', marginBottom: 2, textTransform: 'uppercase' }}>SECTION GENERATOR</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                {Object.keys(SECTIONS).map(sec => (
                  <button key={sec} onClick={() => regenerateSection(sec)} style={{
                    padding: '5px 3px', borderRadius: 2, fontSize: 10, cursor: 'pointer', fontFamily: MONO,
                    border: `1px solid ${currentSectionName === sec ? gc : 'rgba(255,255,255,0.08)'}`,
                    background: currentSectionName === sec ? `${gc}18` : 'rgba(255,255,255,0.02)',
                    color: currentSectionName === sec ? gc : 'rgba(255,255,255,0.97)',
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                  }}>{sec}</button>
                ))}
              </div>
              <div style={{ marginTop: 3, fontSize: 9.5, color: DIM, lineHeight: 1.5 }}>
                Click to regenerate with that section's feel.
              </div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
              <div style={{ fontSize: 10, color: DIM, letterSpacing: '0.1em', marginBottom: 2, textTransform: 'uppercase' }}>PRESETS</div>
              <PresetSelect label="BASS"  value={bassPreset}        options={SOUND_PRESETS.bass}        onChange={applyBassPreset}        accent="#22d3ee" />
              <PresetSelect label="SYNTH" value={synthPreset}       options={SOUND_PRESETS.synth}       onChange={applySynthPreset}       accent={gc} />
              <PresetSelect label="DRUM"  value={drumPreset}        options={SOUND_PRESETS.drum}        onChange={applyDrumPreset}        accent="#ffb347" />
              <PresetSelect label="PERF"  value={performancePreset} options={SOUND_PRESETS.performance} onChange={applyPerformancePreset} accent="#7ee787" />
            </>
          )}

          {tab === 'session' && (
            <>
              <button onClick={recState === 'idle' ? startRec : stopRec} style={{
                padding: '7px', borderRadius: 3, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: MONO,
                letterSpacing: '0.1em', textAlign: 'center',
                border: `1px solid ${recState === 'recording' ? '#ff2244' : 'rgba(255,255,255,0.12)'}`,
                background: recState === 'recording' ? 'rgba(255,34,68,0.12)' : 'rgba(255,255,255,0.03)',
                color: recState === 'recording' ? '#ff2244' : 'rgba(255,255,255,0.55)',
              }}>{recState === 'recording' ? '■ STOP REC' : '● REC'}</button>

              {recordings.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 5px', borderRadius: 3, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <audio src={r.url} controls style={{ flex: 1, height: 22, filter: 'invert(1)', opacity: 0.65 }} />
                  <a href={r.url} download={r.name} style={{ color: gc, fontSize: 9.5, textDecoration: 'none', fontFamily: MONO }}>DL</a>
                </div>
              ))}

              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
              <div style={{ fontSize: 10, color: DIM, letterSpacing: '0.12em', marginBottom: 2, textTransform: 'uppercase' }}>SCENES (6)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3 }}>
                {savedScenes.map((sc, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <button onClick={() => loadScene(i)} style={{
                      padding: '5px', borderRadius: 3, fontSize: 10, cursor: 'pointer', fontFamily: MONO, textAlign: 'center',
                      border: `1px solid ${sc ? gc + '44' : 'rgba(255,255,255,0.08)'}`,
                      background: sc ? `${gc}0d` : 'rgba(255,255,255,0.02)',
                      color: sc ? gc : 'rgba(255,255,255,0.95)',
                    }}>S{i + 1}{sc ? ' ◆' : ''}</button>
                    <button onClick={() => saveScene(i)} style={{
                      padding: '2px', borderRadius: 2, fontSize: 10, cursor: 'pointer', fontFamily: MONO, textAlign: 'center',
                      border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', color: DIM,
                    }}>SAVE</button>
                  </div>
                ))}
              </div>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
              <button onClick={exportJSON} style={{
                padding: '7px', borderRadius: 3, fontSize: 10, cursor: 'pointer', fontFamily: MONO,
                letterSpacing: '0.1em', textAlign: 'center', textTransform: 'uppercase',
                border: `1px solid ${gc}44`, background: `${gc}0d`, color: gc,
              }}>EXPORT JSON</button>
              <button onClick={() => importRef.current?.click()} style={{
                padding: '7px', borderRadius: 3, fontSize: 10, cursor: 'pointer', fontFamily: MONO,
                letterSpacing: '0.1em', textAlign: 'center', textTransform: 'uppercase',
                border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)', color: DIM,
              }}>IMPORT JSON</button>
              <input ref={importRef} type="file" accept=".json" onChange={importJSON} style={{ display: 'none' }} />

              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />
              <div style={{ fontSize: 9.5, color: DIM, lineHeight: 1.7, letterSpacing: '0.06em' }}>
                SHORTCUTS<br />
                SPACE = play/stop<br />
                A=drop S=break D=build<br />
                F=groove G=tension H=fill<br />
                M=mutate R=regen P=autopilot<br />
                T=tap tempo Z=undo
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
