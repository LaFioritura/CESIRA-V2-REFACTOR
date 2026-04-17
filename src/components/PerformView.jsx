/**
 * PerformView — full-screen live performance interface.
 */

import React from 'react';
import { MAX_STEPS, PAGE, LANE_CLR, SOUND_PRESETS, clamp } from '../engine/musicEngine';
import { SECTION_COLORS, navBtnStyle, sectionPadStyle, DIM, MONO } from './ui.js';
import { NavPager, VuBar, PresetSelect, Fader } from './shared.jsx';

const SECTS = ['drop', 'break', 'build', 'groove', 'tension', 'fill', 'intro', 'outro'];
const SHORTCUT = { drop: 'A', break: 'S', build: 'D', groove: 'F', tension: 'G', fill: 'H' };

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
  bassPreset, synthPreset, drumPreset, performancePreset,
  applyBassPreset, applySynthPreset, applyDrumPreset, applyPerformancePreset,
  compact, phone,
}) {
  const sc = SECTION_COLORS[currentSectionName] ?? gc;
  const visibleStart = page * 16;
  const visibleEnd   = Math.min(visibleStart + 16, MAX_STEPS);
  const visIdx = Array.from({ length: visibleEnd - visibleStart }, (_, i) => visibleStart + i);

  const MACROS = [
    { label: 'MASTER',   v: master,           s: setMaster,           c: '#ffffff'  },
    { label: 'SPACE',    v: space,             s: setSpace,            c: '#44ffcc'  },
    { label: 'TONE',     v: tone,              s: setTone,             c: '#22d3ee'  },
    { label: 'DRIVE',    v: drive,             s: setDrive,            c: '#ff8844'  },
    { label: 'GROOVE',   v: grooveAmt,         s: setGrooveAmt,        c: '#ffdd00'  },
    { label: 'SWING',    v: swing,             s: setSwing,            c: '#aa88ff', min: 0, max: 0.25 },
    { label: 'AUTO INT', v: autopilotIntensity, s: setAutopilotIntensity, c: gc      },
  ];

  const ACTIONS = [
    { label: 'MUTATE',    fn: perfActions.mutate,         key: 'M', tip: 'flip drum hits' },
    { label: 'THIN',      fn: perfActions.thinOut,                   tip: 'sparse out' },
    { label: 'THICKEN',   fn: perfActions.thicken,                   tip: 'add hits' },
    { label: 'REHARM',    fn: perfActions.reharmonize,               tip: 'new chords' },
    { label: 'ARP→',      fn: perfActions.shiftArp,                  tip: 'change pattern' },
    { label: 'REGEN',     fn: () => regenerateSection(currentSectionName), key: 'R', tip: 'full rebuild' },
    { label: 'RND SYNTH', fn: perfActions.randomizeNotes,            tip: 'random notes' },
    { label: 'RND BASS',  fn: perfActions.randomizeBass,             tip: 'random bass' },
    { label: 'NOTES ↑',   fn: perfActions.shiftNotesUp,              tip: 'shift up' },
    { label: 'NOTES ↓',   fn: perfActions.shiftNotesDown,            tip: 'shift down' },
    { label: 'CLEAR',     fn: perfActions.clear,                     tip: 'clear all lanes' },
  ];

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: compact ? 'column' : 'row',
      gap: 6, padding: phone ? '8px' : '5px 7px 8px', minHeight: 0,
      overflowY: 'auto', overflowX: 'hidden',
    }}>

      {/* ── LEFT — Section pads + actions ── */}
      <div style={{ width: compact ? '100%' : 118, display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: DIM, letterSpacing: '0.18em', marginBottom: 1, textTransform: 'uppercase' }}>SECTIONS</div>
        {SECTS.map(sec => (
          <button key={sec} onClick={() => perfActions[sec]?.()} style={sectionPadStyle(currentSectionName === sec, SECTION_COLORS[sec] ?? '#ffffff')}>
            <span>{sec}</span>
            {SHORTCUT[sec] && <span style={{ fontSize: 10, opacity: 0.4 }}>[{SHORTCUT[sec]}]</span>}
          </button>
        ))}

        <div style={{ fontSize: 10, color: DIM, letterSpacing: '0.18em', marginTop: 3, textTransform: 'uppercase' }}>ACTIONS</div>
        {ACTIONS.map(({ label, fn, key, tip }) => (
          <button key={label} onClick={fn} title={tip} style={{
            padding: '4px 6px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.02)', color: DIM,
            fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: MONO,
            letterSpacing: '0.06em', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>{label}</span>
            {key && <span style={{ fontSize: 10, opacity: 0.35 }}>[{key}]</span>}
          </button>
        ))}
      </div>

      {/* ── CENTER — Grid ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, order: compact ? 1 : 2 }}>

        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, minHeight: 22, flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: sc, letterSpacing: '0.16em', textTransform: 'uppercase', textShadow: `0 0 16px ${sc}55` }}>
            {currentSectionName.toUpperCase()}
          </div>
          <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: 10, color: DIM, letterSpacing: '0.08em' }}>{genre} · {modeName} · arp:{arpeMode}</span>
          <div style={{ flex: 1 }} />
          {songArc.length > 0 && (
            <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {songArc.map((s, i) => (
                <div key={i} style={{
                  width: i === arcIdx ? 22 : 14, height: 4, borderRadius: 2,
                  background: i === arcIdx ? SECTION_COLORS[s] ?? gc : i < arcIdx ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.05)',
                  transition: 'all 0.2s',
                }} />
              ))}
            </div>
          )}
          <NavPager page={page} setPage={setPage} />
        </div>

        {/* Lane rows */}
        {['kick', 'snare', 'hat', 'bass', 'synth'].map(lane => {
          const lc  = LANE_CLR[lane];
          const ll  = laneLen[lane] ?? 16;
          const vu  = laneVU[lane] ?? 0;
          return (
            <div key={lane} style={{ flex: 1, display: 'flex', alignItems: 'stretch', gap: 5, minHeight: 0 }}>
              <div style={{ width: 38, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: lc, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{lane}</span>
                <VuBar value={vu} color={lc} height={3} />
                {(lane === 'bass' || lane === 'synth') && (
                  <span style={{ fontSize: 9.5, color: DIM, letterSpacing: '0.04em' }}>{activeNotes[lane]}</span>
                )}
              </div>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${visIdx.length},1fr)`, gap: 1.5, alignItems: 'stretch' }}>
                {visIdx.map(idx => {
                  if (idx >= ll) return <div key={idx} style={{ borderRadius: 2, background: 'rgba(255,255,255,0.015)', opacity: 0.25 }} />;
                  const sd = patterns[lane][idx];
                  const on = sd.on, isActive = step === idx && isPlaying;
                  const isTied = sd.tied, isBeat = idx % 4 === 0, isBar = idx % 16 === 0;
                  const borderColor = isActive ? lc : isBar ? `${lc}44` : isBeat ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)';
                  const velHex = on ? Math.round(clamp(sd.p ?? 1, 0.3, 1) * 255).toString(16).padStart(2, '0') : '';
                  return (
                    <button key={idx} onClick={() => toggleCell(lane, idx)} style={{
                      borderRadius: isTied ? '1px 2px 2px 1px' : '2px',
                      borderTop:    `1px solid ${borderColor}`,
                      borderRight:  `1px solid ${borderColor}`,
                      borderBottom: `1px solid ${borderColor}`,
                      borderLeft:   isTied ? `2px solid ${lc}44` : `1px solid ${borderColor}`,
                      background:   isActive ? `${lc}88` : isTied ? `${lc}1a` : on ? `${lc}${velHex}` : 'rgba(255,255,255,0.02)',
                      boxShadow:    isActive ? `0 0 7px ${lc}77` : on && !isTied ? `0 0 2px ${lc}22` : 'none',
                      cursor: 'pointer', transition: 'background 0.03s',
                    }} />
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Note info row */}
        <div style={{ display: 'flex', gap: 1.5, flexShrink: 0, height: 12 }}>
          {visIdx.map(idx => {
            const bn = bassLine[idx], sn = synthLine[idx];
            const hasBass = patterns.bass[idx]?.on, hasSynth = patterns.synth[idx]?.on;
            return (
              <div key={idx} style={{ flex: 1, textAlign: 'center' }}>
                {(hasBass || hasSynth) && (
                  <span style={{ fontSize: 6, color: DIM, fontFamily: MONO }}>
                    {hasBass ? bn.replace(/[0-9]/g, '') : sn.replace(/[0-9]/g, '')}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT — Macros + Scenes ── */}
      <div style={{ width: compact ? '100%' : 118, display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: DIM, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 1 }}>MACROS</div>
        {MACROS.map(({ label, v, s, c, min, max }) => (
          <Fader key={label} label={label} value={v} setter={s} color={c} min={min} max={max} />
        ))}

        <div style={{ flex: 1 }} />

        <div style={{ fontSize: 10, color: DIM, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 1 }}>SCENES</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
          {savedScenes.map((sc, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <button onClick={() => loadScene(i)} style={{
                padding: '4px 2px', borderRadius: 2,
                border: `1px solid ${sc ? gc + '44' : 'rgba(255,255,255,0.07)'}`,
                background: sc ? `${gc}0e` : 'rgba(255,255,255,0.015)',
                color: sc ? gc : 'rgba(255,255,255,0.94)',
                fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: MONO, textAlign: 'center',
              }}>S{i + 1}{sc ? '◆' : ''}</button>
              <button onClick={() => saveScene(i)} style={{
                padding: '1px', borderRadius: 2, border: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(255,255,255,0.015)', color: DIM,
                fontSize: 9.5, cursor: 'pointer', fontFamily: MONO, textAlign: 'center',
              }}>SAVE</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
