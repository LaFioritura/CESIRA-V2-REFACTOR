/**
 * shared.jsx — reusable micro-components.
 * All style objects come from ui.js — no inline style literals here.
 */

import React from 'react';
import { NAV_BTN, DIM, MONO } from './ui.js';

// ── PresetSelect ──────────────────────────────────────────────────────────────
export function PresetSelect({ label, value, options, onChange, accent = '#ffffff' }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 124 }}>
      <span style={{ fontSize: 10, color: DIM, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${accent}33`,
          color: accent,
          borderRadius: 4,
          padding: '5px 7px',
          fontSize: 10,
          fontFamily: MONO,
          outline: 'none',
        }}
      >
        {Object.entries(options).map(([key, preset]) => (
          <option key={key} value={key} style={{ color: '#111', background: '#f2f2f2' }}>
            {preset.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ── Fader — labelled range slider ─────────────────────────────────────────────
const faderRowStyle  = { display: 'flex', flexDirection: 'column', gap: 1 };
const faderLabelRow  = { display: 'flex', justifyContent: 'space-between' };
const faderLabelText = { fontSize: 10, letterSpacing: '0.08em', color: DIM, textTransform: 'uppercase' };

export function Fader({ label, value, setter, color = '#ffffff', min = 0, max = 1, step }) {
  const pct = ((value - min) / (max - min) * 100).toFixed(0);
  return (
    <div style={faderRowStyle}>
      <div style={faderLabelRow}>
        <span style={faderLabelText}>{label}</span>
        <span style={{ fontSize: 10, color, fontFamily: MONO }}>{pct}</span>
      </div>
      <input
        type="range"
        min={min} max={max}
        step={step ?? (max - min) / 200}
        value={value}
        onChange={e => setter(Number(e.target.value))}
        style={{ width: '100%', accentColor: color, color, height: 12 }}
      />
    </div>
  );
}

// ── NavPager ──────────────────────────────────────────────────────────────────
export function NavPager({ page, setPage, total = 4 }) {
  return (
    <>
      <button
        onClick={() => setPage(p => Math.max(0, p - 1))}
        disabled={page === 0}
        style={{ ...NAV_BTN, opacity: page === 0 ? 0.3 : 1, padding: '1px 5px', fontSize: 10 }}
      >‹</button>
      <span style={{ fontSize: 10, color: DIM, fontFamily: MONO }}>{page + 1}/{total}</span>
      <button
        onClick={() => setPage(p => Math.min(total - 1, p + 1))}
        disabled={page === total - 1}
        style={{ ...NAV_BTN, opacity: page === total - 1 ? 0.3 : 1, padding: '1px 5px', fontSize: 10 }}
      >›</button>
    </>
  );
}

// ── VuBar ─────────────────────────────────────────────────────────────────────
const vuTrackStyle = { borderRadius: 2, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' };

export function VuBar({ value, color, height = 3 }) {
  return (
    <div style={{ ...vuTrackStyle, height }}>
      <div style={{
        height: '100%',
        width: `${value * 100}%`,
        background: color,
        borderRadius: 2,
        transition: 'width 0.04s',
        boxShadow: `0 0 4px ${color}`,
      }} />
    </div>
  );
}
