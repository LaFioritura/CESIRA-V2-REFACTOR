/**
 * ui.js — shared visual constants and micro-components.
 * Centralises colours, button styles, and tiny reusable UI pieces.
 */

// ── Section colours ───────────────────────────────────────────────────────────
export const SECTION_COLORS = {
  drop:    '#ff2244',
  break:   '#4488ff',
  build:   '#ffaa00',
  groove:  '#00cc66',
  tension: '#ff6622',
  fill:    '#cc00ff',
  intro:   '#44ffcc',
  outro:   '#aaaaaa',
};

// ── Shared button style factory ───────────────────────────────────────────────
export const navBtnStyle = {
  padding: '1px 5px',
  borderRadius: 2,
  border: '1px solid rgba(255,255,255,0.09)',
  background: 'rgba(255,255,255,0.03)',
  color: 'rgba(255,255,255,0.96)',
  fontSize: 10,
  cursor: 'pointer',
  fontFamily: 'Space Mono,monospace',
};

// Generates a "pill" toggle button style
export function pillStyle(active, accentColor) {
  return {
    padding: '4px 7px',
    borderRadius: 3,
    border: `1px solid ${active ? accentColor : 'rgba(255,255,255,0.1)'}`,
    background: active ? `${accentColor}18` : 'rgba(255,255,255,0.03)',
    color: active ? accentColor : 'rgba(255,255,255,0.97)',
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Space Mono,monospace',
    transition: 'all 0.1s',
  };
}

// Generates a section pad style
export function sectionPadStyle(isActive, sectionColor) {
  return {
    padding: '6px',
    borderRadius: 4,
    border: `1px solid ${isActive ? sectionColor : sectionColor + '33'}`,
    background: isActive ? `${sectionColor}22` : `${sectionColor}08`,
    color: isActive ? sectionColor : `${sectionColor}88`,
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Space Mono,monospace',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    transition: 'all 0.08s',
    boxShadow: isActive ? `0 0 8px ${sectionColor}44` : 'none',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };
}

// ── Dim text colour ───────────────────────────────────────────────────────────
export const DIM  = 'rgba(255,255,255,0.96)';
export const DIM2 = 'rgba(255,255,255,0.38)';
export const MONO = 'Space Mono,monospace';
