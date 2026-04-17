/**
 * SongView — arc composer and arrangement.
 */

import React from 'react';
import { GENRES, SECTIONS, SONG_ARCS } from '../engine/musicEngine';
import { SECTION_COLORS, DIM, MONO } from './ui.js';

export function SongView({
  genre, gc, songArc, arcIdx, songActive,
  startSongArc, stopSongArc,
  currentSectionName, triggerSection,
  modeName, arpeMode, bpm,
  compact, phone,
}) {
  const gd = GENRES[genre];

  const GENRE_INFO = [
    { l: 'BPM',     v: `${gd.bpm[0]}–${gd.bpm[1]}` },
    { l: 'CURRENT', v: bpm },
    { l: 'MODE',    v: modeName },
    { l: 'ARP',     v: arpeMode },
    { l: 'DENSITY', v: `${Math.round(gd.density * 100)}%` },
    { l: 'CHAOS',   v: `${Math.round(gd.chaos * 100)}%` },
    { l: 'NOISE',   v: gd.noiseColor },
    { l: 'BASS',    v: gd.bassMode },
  ];

  const SESSION_INFO = [
    { l: 'GENRE',   v: genre },
    { l: 'SECTION', v: currentSectionName },
    { l: 'MODE',    v: modeName },
    { l: 'ARP',     v: arpeMode },
    { l: 'STATUS',  v: songActive ? `arc[${arcIdx + 1}/${songArc.length}]` : 'manual' },
  ];

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: compact ? 'column' : 'row',
      gap: 8, padding: phone ? '8px' : '6px 12px 12px', minHeight: 0,
      overflowY: 'auto', overflowX: 'hidden',
    }}>

      {/* ── LEFT ── */}
      <div style={{ width: compact ? '100%' : 260, display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>

        {/* Genre card */}
        <div style={{ padding: 16, borderRadius: 8, border: `1px solid ${gc}33`, background: `${gc}08` }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: gc, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>{genre}</div>
          <div style={{ fontSize: 10, color: DIM, letterSpacing: '0.08em', marginBottom: 8 }}>{gd.description}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {GENRE_INFO.map(({ l, v }) => (
              <div key={l}>
                <div style={{ fontSize: 10, color: DIM, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{l}</div>
                <div style={{ fontSize: 10, color: DIM, fontFamily: MONO }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Arc control */}
        <button onClick={songActive ? stopSongArc : startSongArc} style={{
          padding: '12px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: MONO,
          letterSpacing: '0.15em', textTransform: 'uppercase',
          border: `1px solid ${songActive ? '#ff2244' : gc}`,
          background: songActive ? 'rgba(255,34,68,0.12)' : `${gc}18`,
          color: songActive ? '#ff2244' : gc,
          boxShadow: songActive ? '0 0 16px rgba(255,34,68,0.3)' : `0 0 16px ${gc}33`,
        }}>{songActive ? '■ STOP ARC' : '▶ START ARC'}</button>

        {songActive && (
          <div style={{ padding: 10, borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ fontSize: 10, color: DIM, letterSpacing: '0.12em', marginBottom: 6, textTransform: 'uppercase' }}>ARC PROGRESS</div>
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {songArc.map((s, i) => {
                const sc = SECTION_COLORS[s] ?? '#ffffff';
                return (
                  <div key={i} style={{
                    padding: '4px 8px', borderRadius: 3, fontSize: 10, fontFamily: MONO, fontWeight: 700, transition: 'all 0.2s',
                    background: i === arcIdx ? `${sc}33` : i < arcIdx ? `${sc}11` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${i === arcIdx ? sc : i < arcIdx ? `${sc}44` : 'rgba(255,255,255,0.06)'}`,
                    color: i === arcIdx ? sc : i < arcIdx ? `${sc}88` : 'rgba(255,255,255,0.95)',
                  }}>{s}</div>
                );
              })}
            </div>
          </div>
        )}

        {/* Preset arcs — display only, click to load arc TODO */}
        <div style={{ fontSize: 10, color: DIM, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 4 }}>PRESET ARCS</div>
        {SONG_ARCS.map((arc, i) => (
          <button key={i} onClick={() => {/* TODO: load preset arc */}} style={{
            padding: '8px 10px', borderRadius: 4, fontSize: 10, cursor: 'pointer', fontFamily: MONO,
            textAlign: 'left', letterSpacing: '0.04em', lineHeight: 1.4,
            border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', color: DIM,
          }}>
            {arc.join(' → ')}
          </button>
        ))}
      </div>

      {/* ── RIGHT — Section library ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 10, color: DIM, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          SECTION LIBRARY — CLICK TO TRIGGER
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: phone ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 6 }}>
          {Object.entries(SECTIONS).map(([name, data]) => {
            const sc = SECTION_COLORS[name] ?? '#ffffff';
            const isActive = currentSectionName === name;
            return (
              <button key={name} onClick={() => triggerSection(name)} style={{
                padding: '18px 12px', borderRadius: 6, cursor: 'pointer', fontFamily: MONO,
                textAlign: 'left', transition: 'all 0.1s',
                border: `1px solid ${isActive ? sc : sc + '33'}`,
                background: isActive ? `${sc}18` : `${sc}06`,
                color: isActive ? sc : `${sc}88`,
                boxShadow: isActive ? `0 0 16px ${sc}44` : 'none',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>{name}</div>
                <div style={{ fontSize: 10, opacity: 0.7, lineHeight: 1.6 }}>
                  {`k:${Math.round(data.kM * 100)}% h:${Math.round(data.hM * 100)}%`}<br />
                  {`b:${Math.round(data.bM * 100)}% sy:${Math.round(data.syM * 100)}%`}<br />
                  {`len:${data.lb}x vel:${data.vel}`}<br />
                  {`${data.bars} bars`}
                </div>
              </button>
            );
          })}
        </div>

        {/* Current session summary */}
        <div style={{ padding: 12, borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', marginTop: 4 }}>
          <div style={{ fontSize: 10, color: DIM, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>CURRENT SESSION</div>
          <div style={{ display: 'grid', gridTemplateColumns: phone ? 'repeat(2,1fr)' : 'repeat(5,1fr)', gap: 8 }}>
            {SESSION_INFO.map(({ l, v }) => (
              <div key={l}>
                <div style={{ fontSize: 10, color: DIM, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 10, color: gc, fontFamily: MONO, fontWeight: 700 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
