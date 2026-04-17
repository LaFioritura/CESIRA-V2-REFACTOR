/**
 * PerformView — live performance interface.
 * No inline style literals: all style objects imported from ui.js.
 */

import React from 'react';
import { MAX_STEPS, LANE_CLR, clamp } from '../engine/musicEngine';
import {
  SECTION_COLORS, SECTION_LABEL, ACTION_BTN, DIM, MONO,
  sectionPadStyle, cellStyle, sceneLoadBtnStyle, SCENE_SAVE_BTN,
} from './ui.js';
import { NavPager, VuBar, Fader } from './shared.jsx';

// ── Static layout constants ───────────────────────────────────────────────────
const SECTS   = ['drop', 'break', 'build', 'groove', 'tension', 'fill', 'intro', 'outro'];
const SHORTCUT = { drop:'A', break:'S', build:'D', groove:'F', tension:'G', fill:'H' };

const outerStyle      = (compact, phone) => ({ flex:1, display:'flex', flexDirection: compact ? 'column' : 'row', gap:6, padding: phone ? '8px' : '5px 7px 8px', minHeight:0, overflowY:'auto', overflowX:'hidden' });
const leftColStyle    = (compact) => ({ width: compact ? '100%' : 118, display:'flex', flexDirection:'column', gap:3, flexShrink:0 });
const centerColStyle  = { flex:1, display:'flex', flexDirection:'column', gap:4, minWidth:0 };
const rightColStyle   = (compact) => ({ width: compact ? '100%' : 118, display:'flex', flexDirection:'column', gap:4, flexShrink:0 });
const headerRowStyle  = { display:'flex', alignItems:'center', flexWrap:'wrap', gap:8, minHeight:22, flexShrink:0 };
const laneRowStyle    = { flex:1, display:'flex', alignItems:'stretch', gap:5, minHeight:0 };
const laneLabelCol    = { width:38, flexShrink:0, display:'flex', flexDirection:'column', justifyContent:'center', gap:1 };
const noteRowStyle    = { display:'flex', gap:1.5, flexShrink:0, height:12 };
const scenesGrid      = { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:2 };
const sceneSlot       = { display:'flex', flexDirection:'column', gap:1 };
const flexSpacer      = { flex:1 };

const sectionHeaderText = (color) => ({
  fontSize:13, fontWeight:700, color, letterSpacing:'0.16em',
  textTransform:'uppercase', textShadow:`0 0 16px ${color}55`,
});
const dividerV = { width:1, height:12, background:'rgba(255,255,255,0.08)' };
const subInfo  = { fontSize:10, color:DIM, letterSpacing:'0.08em' };
const noteCell = { flex:1, textAlign:'center' };
const noteTxt  = { fontSize:6, color:DIM, fontFamily:MONO };
const keyHint  = { fontSize:10, opacity:0.35 };

// ── Component ─────────────────────────────────────────────────────────────────
export function PerformView({
  genre, gc, isPlaying,
  currentSectionName, laneVU,
  patterns, bassLine, synthLine, laneLen, step, page, setPage,
  activeNotes, arpeMode, modeName,
  autopilot, autopilotIntensity, setAutopilotIntensity,
  perfActions, regenerateSection, setNote,
  savedScenes, saveScene, loadScene,
  master, setMaster, space, setSpace, tone, setTone,
  drive, setDrive, grooveAmt, setGrooveAmt, swing, setSwing,
  toggleCell, songArc, arcIdx, songActive,
  compact, phone,
}) {
  const sc = SECTION_COLORS[currentSectionName] ?? gc;

  const visibleStart = page * 16;
  const visibleEnd   = Math.min(visibleStart + 16, MAX_STEPS);
  const visIdx = Array.from({ length: visibleEnd - visibleStart }, (_, i) => visibleStart + i);

  const MACROS = [
    { label:'MASTER',   v:master,            s:setMaster,            c:'#ffffff'                   },
    { label:'SPACE',    v:space,             s:setSpace,             c:'#44ffcc'                   },
    { label:'TONE',     v:tone,              s:setTone,              c:'#22d3ee'                   },
    { label:'DRIVE',    v:drive,             s:setDrive,             c:'#ff8844'                   },
    { label:'GROOVE',   v:grooveAmt,         s:setGrooveAmt,         c:'#ffdd00'                   },
    { label:'SWING',    v:swing,             s:setSwing,             c:'#aa88ff', min:0, max:0.25  },
    { label:'AUTO INT', v:autopilotIntensity, s:setAutopilotIntensity, c:gc                         },
  ];

  const ACTIONS = [
    { label:'MUTATE',    fn:perfActions.mutate,              key:'M', tip:'flip drum hits'  },
    { label:'THIN',      fn:perfActions.thinOut,                      tip:'sparse out'      },
    { label:'THICKEN',   fn:perfActions.thicken,                      tip:'add hits'        },
    { label:'REHARM',    fn:perfActions.reharmonize,                   tip:'new chords'      },
    { label:'ARP→',      fn:perfActions.shiftArp,                     tip:'change pattern'  },
    { label:'REGEN',     fn:() => regenerateSection(currentSectionName), key:'R', tip:'full rebuild' },
    { label:'RND SYNTH', fn:perfActions.randomizeNotes,               tip:'random notes'    },
    { label:'RND BASS',  fn:perfActions.randomizeBass,                tip:'random bass'     },
    { label:'NOTES ↑',   fn:perfActions.shiftNotesUp,                 tip:'shift up'        },
    { label:'NOTES ↓',   fn:perfActions.shiftNotesDown,               tip:'shift down'      },
    { label:'CLEAR',     fn:perfActions.clear,                        tip:'clear all lanes' },
  ];

  return (
    <div style={outerStyle(compact, phone)}>

      {/* ── LEFT ── */}
      <div style={leftColStyle(compact)}>
        <div style={SECTION_LABEL}>SECTIONS</div>
        {SECTS.map(sec => (
          <button key={sec} onClick={perfActions[sec]} style={sectionPadStyle(currentSectionName === sec, SECTION_COLORS[sec] ?? '#fff')}>
            <span>{sec}</span>
            {SHORTCUT[sec] && <span style={keyHint}>[{SHORTCUT[sec]}]</span>}
          </button>
        ))}

        <div style={{ ...SECTION_LABEL, marginTop: 3 }}>ACTIONS</div>
        {ACTIONS.map(({ label, fn, key, tip }) => (
          <button key={label} onClick={fn} title={tip} style={ACTION_BTN}>
            <span>{label}</span>
            {key && <span style={keyHint}>[{key}]</span>}
          </button>
        ))}
      </div>

      {/* ── CENTER ── */}
      <div style={centerColStyle}>
        <div style={headerRowStyle}>
          <div style={sectionHeaderText(sc)}>{currentSectionName.toUpperCase()}</div>
          <div style={dividerV} />
          <span style={subInfo}>{genre} · {modeName} · arp:{arpeMode}</span>
          <div style={flexSpacer} />
          {songArc.length > 0 && (
            <div style={{ display:'flex', gap:2, alignItems:'center' }}>
              {songArc.map((s, i) => (
                <div key={i} style={{
                  width: i === arcIdx ? 22 : 14, height:4, borderRadius:2,
                  background: i === arcIdx ? SECTION_COLORS[s] ?? gc : i < arcIdx ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.05)',
                  transition: 'all 0.2s',
                }} />
              ))}
            </div>
          )}
          <NavPager page={page} setPage={setPage} />
        </div>

        {/* Lane rows */}
        {['kick','snare','hat','bass','synth'].map(lane => {
          const lc  = LANE_CLR[lane];
          const ll  = laneLen[lane] ?? 16;
          const vu  = laneVU[lane] ?? 0;
          return (
            <div key={lane} style={laneRowStyle}>
              <div style={laneLabelCol}>
                <span style={{ ...LANE_LBL, color: lc }}>{lane}</span>
                <VuBar value={vu} color={lc} height={3} />
                {(lane === 'bass' || lane === 'synth') && (
                  <span style={{ fontSize:9.5, color:DIM, letterSpacing:'0.04em' }}>{activeNotes[lane]}</span>
                )}
              </div>
              <div style={{ flex:1, display:'grid', gridTemplateColumns:`repeat(${visIdx.length},1fr)`, gap:1.5, alignItems:'stretch' }}>
                {visIdx.map(idx => {
                  if (idx >= ll) return <div key={idx} style={INACTIVE_CELL} />;
                  const sd = patterns[lane][idx];
                  const velHex = sd.on ? Math.round(clamp(sd.p ?? 1, 0.3, 1) * 255).toString(16).padStart(2,'0') : '';
                  return (
                    <button
                      key={idx}
                      onClick={() => toggleCell(lane, idx)}
                      style={cellStyle(sd.on, step === idx && isPlaying, sd.tied, idx % 4 === 0, idx % 16 === 0, lc, velHex)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Note info row */}
        <div style={noteRowStyle}>
          {visIdx.map(idx => {
            const hasBass  = patterns.bass[idx]?.on;
            const hasSynth = patterns.synth[idx]?.on;
            return (
              <div key={idx} style={noteCell}>
                {(hasBass || hasSynth) && (
                  <span style={noteTxt}>
                    {hasBass ? bassLine[idx].replace(/[0-9]/g,'') : synthLine[idx].replace(/[0-9]/g,'')}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT ── */}
      <div style={rightColStyle(compact)}>
        <div style={SECTION_LABEL}>MACROS</div>
        {MACROS.map(({ label, v, s, c, min, max }) => (
          <Fader key={label} label={label} value={v} setter={s} color={c} min={min} max={max} />
        ))}
        <div style={flexSpacer} />
        <div style={SECTION_LABEL}>SCENES</div>
        <div style={scenesGrid}>
          {savedScenes.map((sc, i) => (
            <div key={i} style={sceneSlot}>
              <button onClick={() => loadScene(i)} style={sceneLoadBtnStyle(!!sc, gc)}>
                S{i+1}{sc ? '◆' : ''}
              </button>
              <button onClick={() => saveScene(i)} style={SCENE_SAVE_BTN}>SAVE</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Module-level style constants used inside the lane loop
const LANE_LBL = { fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase' };
const INACTIVE_CELL = { borderRadius:2, background:'rgba(255,255,255,0.015)', opacity:0.25 };
