/**
 * SongView — arc composer and arrangement.
 * No inline style literals: all style objects imported from ui.js.
 */

import React from 'react';
import { GENRES, SECTIONS, SONG_ARCS } from '../engine/musicEngine';
import { SECTION_COLORS, DIM, MONO, sectionCardStyle, arcChipStyle } from './ui.js';

// ── Static layout constants ───────────────────────────────────────────────────
const outerStyle    = (compact, phone) => ({ flex:1, display:'flex', flexDirection: compact ? 'column':'row', gap:8, padding: phone ? '8px':'6px 12px 12px', minHeight:0, overflowY:'auto', overflowX:'hidden' });
const leftColStyle  = (compact) => ({ width: compact ? '100%' : 260, display:'flex', flexDirection:'column', gap:8, flexShrink:0 });
const rightColStyle = { flex:1, display:'flex', flexDirection:'column', gap:6 };

const genreCardStyle  = (gc) => ({ padding:16, borderRadius:8, border:`1px solid ${gc}33`, background:`${gc}08` });
const genreTitle      = (gc) => ({ fontSize:18, fontWeight:700, color:gc, letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:4 });
const genreDesc       = { fontSize:10, color:DIM, letterSpacing:'0.08em', marginBottom:8 };
const genreGrid       = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 };
const metaLabel       = { fontSize:10, color:DIM, letterSpacing:'0.12em', textTransform:'uppercase' };
const metaValue       = { fontSize:10, color:DIM, fontFamily:MONO };
const arcBtnStyle     = (active, gc) => ({ padding:'12px', borderRadius:6, fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:MONO, letterSpacing:'0.15em', textTransform:'uppercase', border:`1px solid ${active ? '#ff2244' : gc}`, background: active ? 'rgba(255,34,68,0.12)' : `${gc}18`, color: active ? '#ff2244' : gc, boxShadow: active ? '0 0 16px rgba(255,34,68,0.3)' : `0 0 16px ${gc}33` });
const arcProgressBox  = { padding:10, borderRadius:6, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.02)' };
const arcChipsRow     = { display:'flex', gap:3, flexWrap:'wrap' };
const arcLabelStyle   = { fontSize:10, color:DIM, letterSpacing:'0.12em', marginBottom:6, textTransform:'uppercase' };
const presetArcLabel  = { fontSize:10, color:DIM, letterSpacing:'0.15em', textTransform:'uppercase', marginTop:4 };
const presetArcBtn    = { padding:'8px 10px', borderRadius:4, fontSize:10, cursor:'pointer', fontFamily:MONO, textAlign:'left', letterSpacing:'0.04em', lineHeight:1.4, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.02)', color:DIM };
const sectionLibLabel = { fontSize:10, color:DIM, letterSpacing:'0.2em', textTransform:'uppercase' };
const sectionLibGrid  = (phone) => ({ display:'grid', gridTemplateColumns: phone ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap:6 });
const sectionDataText = { fontSize:10, opacity:0.7, lineHeight:1.6 };
const sectionTitle    = { fontSize:13, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:6 };
const sessionBox      = { padding:12, borderRadius:6, border:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.02)', marginTop:4 };
const sessionLabel    = { fontSize:10, color:DIM, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:6 };
const sessionGrid     = (phone) => ({ display:'grid', gridTemplateColumns: phone ? 'repeat(2,1fr)' : 'repeat(5,1fr)', gap:8 });
const sessionMetaL    = { fontSize:10, color:DIM, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:2 };
const sessionMetaV    = (gc) => ({ fontSize:10, color:gc, fontFamily:MONO, fontWeight:700 });

// ── Component ─────────────────────────────────────────────────────────────────
export function SongView({
  genre, gc, songArc, arcIdx, songActive,
  startSongArc, stopSongArc,
  currentSectionName, triggerSection,
  modeName, arpeMode, bpm,
  compact, phone,
}) {
  const gd = GENRES[genre];

  const GENRE_INFO = [
    { l:'BPM',     v:`${gd.bpm[0]}–${gd.bpm[1]}` },
    { l:'CURRENT', v:bpm          },
    { l:'MODE',    v:modeName     },
    { l:'ARP',     v:arpeMode     },
    { l:'DENSITY', v:`${Math.round(gd.density*100)}%` },
    { l:'CHAOS',   v:`${Math.round(gd.chaos*100)}%`   },
    { l:'NOISE',   v:gd.noiseColor },
    { l:'BASS',    v:gd.bassMode   },
  ];

  const SESSION_INFO = [
    { l:'GENRE',   v:genre             },
    { l:'SECTION', v:currentSectionName },
    { l:'MODE',    v:modeName           },
    { l:'ARP',     v:arpeMode           },
    { l:'STATUS',  v:songActive ? `arc[${arcIdx+1}/${songArc.length}]` : 'manual' },
  ];

  return (
    <div style={outerStyle(compact, phone)}>

      {/* ── LEFT ── */}
      <div style={leftColStyle(compact)}>
        {/* Genre card */}
        <div style={genreCardStyle(gc)}>
          <div style={genreTitle(gc)}>{genre}</div>
          <div style={genreDesc}>{gd.description}</div>
          <div style={genreGrid}>
            {GENRE_INFO.map(({ l, v }) => (
              <div key={l}>
                <div style={metaLabel}>{l}</div>
                <div style={metaValue}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Arc control */}
        <button onClick={songActive ? stopSongArc : startSongArc} style={arcBtnStyle(songActive, gc)}>
          {songActive ? '■ STOP ARC' : '▶ START ARC'}
        </button>

        {songActive && (
          <div style={arcProgressBox}>
            <div style={arcLabelStyle}>ARC PROGRESS</div>
            <div style={arcChipsRow}>
              {songArc.map((s, i) => (
                <div key={i} style={arcChipStyle(i, arcIdx, SECTION_COLORS[s] ?? '#ffffff')}>{s}</div>
              ))}
            </div>
          </div>
        )}

        {/* Preset arcs */}
        <div style={presetArcLabel}>PRESET ARCS</div>
        {SONG_ARCS.map((arc, i) => (
          <button key={i} style={presetArcBtn}>{arc.join(' → ')}</button>
        ))}
      </div>

      {/* ── RIGHT ── */}
      <div style={rightColStyle}>
        <div style={sectionLibLabel}>SECTION LIBRARY — CLICK TO TRIGGER</div>
        <div style={sectionLibGrid(phone)}>
          {Object.entries(SECTIONS).map(([name, data]) => (
            <button key={name} onClick={() => triggerSection(name)} style={sectionCardStyle(currentSectionName === name, SECTION_COLORS[name] ?? '#ffffff')}>
              <div style={sectionTitle}>{name}</div>
              <div style={sectionDataText}>
                {`k:${Math.round(data.kM*100)}% h:${Math.round(data.hM*100)}%`}<br />
                {`b:${Math.round(data.bM*100)}% sy:${Math.round(data.syM*100)}%`}<br />
                {`len:${data.lb}x vel:${data.vel}`}<br />
                {`${data.bars} bars`}
              </div>
            </button>
          ))}
        </div>

        {/* Current session summary */}
        <div style={sessionBox}>
          <div style={sessionLabel}>CURRENT SESSION</div>
          <div style={sessionGrid(phone)}>
            {SESSION_INFO.map(({ l, v }) => (
              <div key={l}>
                <div style={sessionMetaL}>{l}</div>
                <div style={sessionMetaV(gc)}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
