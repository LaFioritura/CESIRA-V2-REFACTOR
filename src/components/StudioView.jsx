/**
 * StudioView — detailed pattern + mixer editor.
 * No inline style literals: all style objects imported from ui.js.
 */

import React, { useState } from 'react';
import { MAX_STEPS, LANE_CLR, MODES, SECTIONS, SOUND_PRESETS, clamp } from '../engine/musicEngine';
import {
  NAV_BTN, DIM, MONO, DIVIDER, SECTION_LABEL,
  cellStyle, tabBtnStyle, sceneLoadBtnStyle, SCENE_SAVE_BTN,
} from './ui.js';
import { NavPager, VuBar, Fader, PresetSelect } from './shared.jsx';

// ── Static layout constants ───────────────────────────────────────────────────
const outerStyle   = (compact, phone) => ({ flex:1, display:'flex', flexDirection: compact ? 'column':'row', gap:5, padding: phone ? '8px':'5px 7px 8px', minHeight:0, overflowY:'auto', overflowX:'hidden' });
const leftColStyle = { flex:1, display:'flex', flexDirection:'column', gap:3, minWidth:0 };
const rightColStyle = (compact) => ({ width: compact ? '100%' : 160, display:'flex', flexDirection:'column', minHeight:0, flexShrink:0 });

const gridHeaderStyle = { display:'flex', alignItems:'center', gap:5, height:20, flexShrink:0 };
const laneRowStyle    = { flex:1, display:'flex', alignItems:'stretch', gap:4, minHeight:0 };
const laneLabelCol    = { width:36, flexShrink:0, display:'flex', flexDirection:'column', justifyContent:'center', gap:1 };
const laneLabel       = (lc) => ({ fontSize:10, fontWeight:700, color:lc, letterSpacing:'0.12em', textTransform:'uppercase' });
const editBtnStyle    = (active, lc) => ({ padding:'1px 2px', borderRadius:2, fontSize:9.5, cursor:'pointer', fontFamily:MONO, border:`1px solid ${active ? lc : 'rgba(255,255,255,0.07)'}`, background: active ? `${lc}22` : 'transparent', color: active ? lc : DIM });
const notePoolCell    = (lc) => ({ flex:1, padding:'1px', borderRadius:2, fontSize:8, cursor:'pointer', fontFamily:MONO, border:`1px solid ${lc}33`, background:'rgba(255,255,255,0.02)', color:lc });
const notePoolRow     = { display:'flex', gap:1.5, flexShrink:0 };
const tabRow          = { display:'flex', gap:2, padding:'4px 0', flexShrink:0 };
const tabPanel        = { flex:1, overflowY:'auto', padding:'6px 7px', display:'flex', flexDirection:'column', gap:4 };
const grooveGrid      = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:2 };
const sectionGrid     = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:2 };
const recordingRow    = { display:'flex', alignItems:'center', gap:3, padding:'3px 5px', borderRadius:3, background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.05)' };
const scenesGrid      = { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:3 };
const sceneSlot       = { display:'flex', flexDirection:'column', gap:1 };
const flexSpacer      = { flex:1 };
const INACTIVE_CELL   = { borderRadius:2, background:'rgba(255,255,255,0.015)', opacity:0.4 };

const recBtnStyle = (isRec) => ({
  padding:'7px', borderRadius:3, fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:MONO,
  letterSpacing:'0.1em', textAlign:'center',
  border:`1px solid ${isRec ? '#ff2244' : 'rgba(255,255,255,0.12)'}`,
  background: isRec ? 'rgba(255,34,68,0.12)' : 'rgba(255,255,255,0.03)',
  color: isRec ? '#ff2244' : 'rgba(255,255,255,0.55)',
});
const exportBtnStyle = (gc) => ({ padding:'7px', borderRadius:3, fontSize:10, cursor:'pointer', fontFamily:MONO, letterSpacing:'0.1em', textAlign:'center', textTransform:'uppercase', border:`1px solid ${gc}44`, background:`${gc}0d`, color:gc });
const importBtnStyle = { padding:'7px', borderRadius:3, fontSize:10, cursor:'pointer', fontFamily:MONO, letterSpacing:'0.1em', textAlign:'center', textTransform:'uppercase', border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.03)', color:DIM };
const shortcutBox    = { fontSize:9.5, color:DIM, lineHeight:1.7, letterSpacing:'0.06em' };
const grooveBtnStyle = (active, gc) => ({ padding:'3px', borderRadius:2, fontSize:9.5, cursor:'pointer', fontFamily:MONO, border:`1px solid ${active ? gc : 'rgba(255,255,255,0.08)'}`, background: active ? `${gc}18` : 'rgba(255,255,255,0.02)', color: active ? gc : DIM, letterSpacing:'0.06em', textTransform:'uppercase' });
const sectionGenBtnStyle = (active, gc) => ({ padding:'5px 3px', borderRadius:2, fontSize:10, cursor:'pointer', fontFamily:MONO, border:`1px solid ${active ? gc : 'rgba(255,255,255,0.08)'}`, background: active ? `${gc}18` : 'rgba(255,255,255,0.02)', color: active ? gc : 'rgba(255,255,255,0.97)', letterSpacing:'0.05em', textTransform:'uppercase' });

const MIXER_FADERS = (lc) => [
  { l:'MASTER',       v_k:'master',      c:'#ffffff'    },
  { l:'SPACE',        v_k:'space',       c:'#44ffcc'    },
  { l:'TONE',         v_k:'tone',        c:'#22d3ee'    },
  { l:'NOISE',        v_k:'noiseMix',    c:'#aaaaaa'    },
  { l:'DRIVE',        v_k:'drive',       c:'#ff8844'    },
  { l:'COMPRESS',     v_k:'compress',    c:'#ffaa44'    },
  { l:'BASS FILTER',  v_k:'bassFilter',  c: lc.bass     },
  { l:'SYNTH FILTER', v_k:'synthFilter', c: lc.synth    },
  { l:'DRUM DECAY',   v_k:'drumDecay',   c: lc.kick     },
  { l:'BASS SUB',     v_k:'bassSubAmt',  c: lc.bass     },
  { l:'SWING',        v_k:'swing',       c:'#aa88ff', min:0, max:0.25 },
  { l:'HUMANIZE',     v_k:'humanize',    c:'#88aaff', min:0, max:0.05 },
  { l:'GROOVE AMT',   v_k:'grooveAmt',   c:'#ffdd00'    },
  { l:'FM INDEX',     v_k:'fmIdx',       c:'#cc88ff', min:0, max:3    },
];

const TABS = ['mixer', 'synth', 'session'];

// ── Component ─────────────────────────────────────────────────────────────────
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

  const visIdx   = Array.from({ length: Math.min(page * 16 + 16, MAX_STEPS) - page * 16 }, (_, i) => page * 16 + i);
  const mode     = MODES[modeName] ?? MODES.minor;
  const notePool = noteEditLane === 'bass' ? mode.b : mode.s;

  // Map value-key to actual prop values
  const faderProps = { master, space, tone, noiseMix, drive, compress, bassFilter, synthFilter, drumDecay, bassSubAmt, swing, humanize, grooveAmt, fmIdx };
  const faderSetters = { master:setMaster, space:setSpace, tone:setTone, noiseMix:setNoiseMix, drive:setDrive, compress:setCompress, bassFilter:setBassFilter, synthFilter:setSynthFilter, drumDecay:setDrumDecay, bassSubAmt:setBassSubAmt, swing:setSwing, humanize:setHumanize, grooveAmt:setGrooveAmt, fmIdx:setFmIdx };

  return (
    <div style={outerStyle(compact, phone)}>

      {/* ── LEFT — Grid editor ── */}
      <div style={leftColStyle}>
        <div style={gridHeaderStyle}>
          <span style={{ fontSize:10, color:DIM, letterSpacing:'0.1em' }}>
            {genre.toUpperCase()} · {modeName.toUpperCase()} · {currentSectionName.toUpperCase()}
          </span>
          <div style={flexSpacer} />
          <button onClick={undo} disabled={undoLen === 0} style={{ ...NAV_BTN, opacity: undoLen > 0 ? 1 : 0.3, fontSize:10 }}>
            ↩ ({undoLen})
          </button>
          <NavPager page={page} setPage={setPage} />
        </div>

        {['kick','snare','hat','bass','synth'].map(lane => {
          const lc = LANE_CLR[lane];
          const ll = laneLen[lane] ?? 16;
          return (
            <div key={lane} style={laneRowStyle}>
              <div style={laneLabelCol}>
                <span style={laneLabel(lc)}>{lane}</span>
                <VuBar value={laneVU[lane] ?? 0} color={lc} height={2} />
              </div>
              <div style={{ flex:1, display:'grid', gridTemplateColumns:`repeat(${visIdx.length},1fr)`, gap:1.5, alignItems:'stretch' }}>
                {visIdx.map(idx => {
                  if (idx >= ll) return <div key={idx} style={INACTIVE_CELL} />;
                  const sd = patterns[lane][idx];
                  const velHex = sd.on ? Math.round(clamp(sd.p ?? 1, 0.3, 1) * 255).toString(16).padStart(2,'0') : '';
                  return (
                    <button key={idx} onClick={() => toggleCell(lane, idx)}
                      style={cellStyle(sd.on, step === idx, sd.tied, idx%4===0, idx%16===0, lc, velHex)}
                    />
                  );
                })}
              </div>
              {(lane === 'bass' || lane === 'synth') && (
                <div style={{ width:28, flexShrink:0, display:'flex', flexDirection:'column', justifyContent:'center' }}>
                  <button onClick={() => setNoteEditLane(lane)} style={editBtnStyle(noteEditLane === lane, lc)}>EDIT</button>
                </div>
              )}
            </div>
          );
        })}

        {/* Note selector */}
        <div style={notePoolRow}>
          {notePool.map(note => (
            <button key={note} onClick={() => {
              visIdx.forEach(idx => {
                if (patterns[noteEditLane][idx]?.on) setNote(noteEditLane, idx, note);
              });
            }} style={notePoolCell(LANE_CLR[noteEditLane])}>
              {note.replace(/[0-9]/g,'')}
            </button>
          ))}
        </div>
      </div>

      {/* ── RIGHT — Tabbed panel ── */}
      <div style={rightColStyle(compact)}>
        <div style={tabRow}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={tabBtnStyle(tab === t, gc)}>{t}</button>
          ))}
        </div>

        <div style={tabPanel}>

          {tab === 'mixer' && (
            <>
              {MIXER_FADERS(LANE_CLR).map(({ l, v_k, c, min, max }) => (
                <Fader key={l} label={l} value={faderProps[v_k]} setter={faderSetters[v_k]} color={c} min={min} max={max} />
              ))}
              <div>
                <div style={{ ...SECTION_LABEL, marginBottom:2 }}>GROOVE PROFILE</div>
                <div style={grooveGrid}>
                  {['steady','broken','bunker','float'].map(gp => (
                    <button key={gp} onClick={() => setGrooveProfile(gp)} style={grooveBtnStyle(grooveProfile === gp, gc)}>{gp}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'synth' && (
            <>
              <div style={{ ...SECTION_LABEL, marginBottom:2 }}>SECTION GENERATOR</div>
              <div style={sectionGrid}>
                {Object.keys(SECTIONS).map(sec => (
                  <button key={sec} onClick={() => regenerateSection(sec)} style={sectionGenBtnStyle(currentSectionName === sec, gc)}>{sec}</button>
                ))}
              </div>
              <div style={{ marginTop:3, fontSize:9.5, color:DIM, lineHeight:1.5 }}>
                Click to regenerate with that section's feel.
              </div>
              <div style={DIVIDER} />
              <div style={{ ...SECTION_LABEL, marginBottom:2 }}>PRESETS</div>
              <PresetSelect label="BASS"  value={bassPreset}        options={SOUND_PRESETS.bass}        onChange={applyBassPreset}        accent="#22d3ee" />
              <PresetSelect label="SYNTH" value={synthPreset}       options={SOUND_PRESETS.synth}       onChange={applySynthPreset}       accent={gc} />
              <PresetSelect label="DRUM"  value={drumPreset}        options={SOUND_PRESETS.drum}        onChange={applyDrumPreset}        accent="#ffb347" />
              <PresetSelect label="PERF"  value={performancePreset} options={SOUND_PRESETS.performance} onChange={applyPerformancePreset} accent="#7ee787" />
            </>
          )}

          {tab === 'session' && (
            <>
              <button onClick={recState === 'idle' ? startRec : stopRec} style={recBtnStyle(recState === 'recording')}>
                {recState === 'recording' ? '■ STOP REC' : '● REC'}
              </button>
              {recordings.map((r, i) => (
                <div key={i} style={recordingRow}>
                  <audio src={r.url} controls style={{ flex:1, height:22, filter:'invert(1)', opacity:0.65 }} />
                  <a href={r.url} download={r.name} style={{ color:gc, fontSize:9.5, textDecoration:'none', fontFamily:MONO }}>DL</a>
                </div>
              ))}
              <div style={DIVIDER} />
              <div style={{ ...SECTION_LABEL, marginBottom:2 }}>SCENES (6)</div>
              <div style={scenesGrid}>
                {savedScenes.map((sc, i) => (
                  <div key={i} style={sceneSlot}>
                    <button onClick={() => loadScene(i)} style={sceneLoadBtnStyle(!!sc, gc)}>S{i+1}{sc ? ' ◆':''}</button>
                    <button onClick={() => saveScene(i)} style={SCENE_SAVE_BTN}>SAVE</button>
                  </div>
                ))}
              </div>
              <div style={DIVIDER} />
              <button onClick={exportJSON}                        style={exportBtnStyle(gc)}>EXPORT JSON</button>
              <button onClick={() => importRef.current?.click()}  style={importBtnStyle}>IMPORT JSON</button>
              <input ref={importRef} type="file" accept=".json" onChange={importJSON} style={{ display:'none' }} />
              <div style={DIVIDER} />
              <div style={shortcutBox}>
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
