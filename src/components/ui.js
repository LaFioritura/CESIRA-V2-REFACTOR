/**
 * ui.js — all shared visual tokens and style factories.
 *
 * Style objects defined here are module-level constants (created once,
 * never inside a render function) so React never re-allocates them.
 * Functions that accept dynamic values (colour, active state) return
 * new objects only when called with different arguments.
 */

// ── Colour tokens ─────────────────────────────────────────────────────────────
export const DIM   = 'rgba(255,255,255,0.96)';
export const DIM2  = 'rgba(255,255,255,0.38)';
export const DIM3  = 'rgba(255,255,255,0.08)';
export const MONO  = 'Space Mono,monospace';

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

// ── Static style objects (module-level constants) ─────────────────────────────

export const NAV_BTN = {
  padding: '1px 5px',
  borderRadius: 2,
  border: `1px solid ${DIM3}`,
  background: 'rgba(255,255,255,0.03)',
  color: DIM,
  fontSize: 10,
  cursor: 'pointer',
  fontFamily: MONO,
};

export const ACTION_BTN = {
  padding: '4px 6px',
  borderRadius: 3,
  border: `1px solid ${DIM3}`,
  background: 'rgba(255,255,255,0.02)',
  color: DIM,
  fontSize: 10,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: MONO,
  letterSpacing: '0.06em',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

export const SECTION_LABEL = {
  fontSize: 10,
  color: DIM,
  letterSpacing: '0.18em',
  marginBottom: 1,
  textTransform: 'uppercase',
};

export const LANE_LABEL = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
};

export const DIVIDER = {
  height: 1,
  background: 'rgba(255,255,255,0.06)',
  margin: '4px 0',
};

export const CARD = {
  padding: 10,
  borderRadius: 6,
  border: `1px solid ${DIM3}`,
  background: 'rgba(255,255,255,0.02)',
};

// ── Style factories (called with dynamic args) ────────────────────────────────
// These return new objects but are called only when their arguments change,
// so they are safe inside render as long as callers apply them to stable JSX nodes.

/** Coloured toggle pill — active/inactive state */
export function pillStyle(active, accent) {
  return {
    padding: '4px 7px',
    borderRadius: 3,
    border: `1px solid ${active ? accent : DIM3}`,
    background: active ? `${accent}18` : 'rgba(255,255,255,0.03)',
    color: active ? accent : 'rgba(255,255,255,0.97)',
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: MONO,
    transition: 'all 0.1s',
  };
}

/** Section pad button */
export function sectionPadStyle(isActive, color) {
  return {
    padding: '6px',
    borderRadius: 4,
    border: `1px solid ${isActive ? color : color + '33'}`,
    background: isActive ? `${color}22` : `${color}08`,
    color: isActive ? color : `${color}88`,
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: MONO,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    transition: 'all 0.08s',
    boxShadow: isActive ? `0 0 8px ${color}44` : 'none',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };
}

/** Step grid cell */
export function cellStyle(on, isActive, isTied, isBeat, isBar, lc, velHex) {
  const border = isActive ? lc : isBar ? `${lc}44` : isBeat ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)';
  return {
    borderRadius: isTied ? '1px 2px 2px 1px' : '2px',
    borderTop:    `1px solid ${border}`,
    borderRight:  `1px solid ${border}`,
    borderBottom: `1px solid ${border}`,
    borderLeft:   isTied ? `2px solid ${lc}44` : `1px solid ${border}`,
    background:   isActive ? `${lc}88` : isTied ? `${lc}1a` : on ? `${lc}${velHex}` : 'rgba(255,255,255,0.02)',
    boxShadow:    isActive ? `0 0 7px ${lc}77` : on && !isTied ? `0 0 2px ${lc}22` : 'none',
    cursor:       'pointer',
    transition:   'background 0.03s',
  };
}

/** Tab button inside studio panel */
export function tabBtnStyle(active, gc) {
  return {
    flex: 1,
    padding: '3px',
    borderRadius: 2,
    fontSize: 9.5,
    cursor: 'pointer',
    fontFamily: MONO,
    border: `1px solid ${active ? gc : DIM3}`,
    background: active ? `${gc}18` : 'rgba(255,255,255,0.02)',
    color: active ? gc : DIM,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  };
}

/** Genre selector button */
export function genreBtnStyle(active, genreColor) {
  return {
    padding: '2px 5px',
    borderRadius: 2,
    border: `1px solid ${active ? genreColor : DIM3}`,
    background: active ? `${genreColor}18` : 'transparent',
    color: active ? genreColor : 'rgba(255,255,255,0.95)',
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.1em',
    fontFamily: MONO,
    textTransform: 'uppercase',
    transition: 'all 0.1s',
  };
}

/** View toggle button (perform / studio / song) */
export function viewBtnStyle(active, gc) {
  return {
    padding: '2px 6px',
    borderRadius: 2,
    border: `1px solid ${active ? gc : DIM3}`,
    background: active ? `${gc}18` : 'transparent',
    color: active ? gc : DIM,
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.08em',
    fontFamily: MONO,
    textTransform: 'uppercase',
  };
}

/** Autopilot button */
export function autopilotBtnStyle(active, gc) {
  return {
    padding: '4px 8px',
    borderRadius: 3,
    border: `1px solid ${active ? gc : DIM3}`,
    background: active ? `${gc}22` : 'rgba(255,255,255,0.04)',
    color: active ? gc : DIM2,
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.1em',
    fontFamily: MONO,
    boxShadow: active ? `0 0 10px ${gc}55` : 'none',
    transition: 'all 0.12s',
    flexShrink: 0,
  };
}

/** Play/stop transport button */
export function transportBtnStyle(isPlaying) {
  return {
    padding: '4px 14px',
    borderRadius: 3,
    border: 'none',
    background: isPlaying ? '#ff2244' : '#00cc66',
    color: '#000',
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.1em',
    fontFamily: MONO,
    boxShadow: isPlaying ? '0 0 12px #ff224466' : '0 0 12px #00cc6666',
    transition: 'all 0.1s',
    flexShrink: 0,
  };
}

/** Section card in SongView library */
export function sectionCardStyle(isActive, color) {
  return {
    padding: '18px 12px',
    borderRadius: 6,
    cursor: 'pointer',
    fontFamily: MONO,
    textAlign: 'left',
    transition: 'all 0.1s',
    border: `1px solid ${isActive ? color : color + '33'}`,
    background: isActive ? `${color}18` : `${color}06`,
    color: isActive ? color : `${color}88`,
    boxShadow: isActive ? `0 0 16px ${color}44` : 'none',
  };
}

/** Arc progress chip */
export function arcChipStyle(i, arcIdx, color) {
  return {
    padding: '4px 8px',
    borderRadius: 3,
    fontSize: 10,
    fontFamily: MONO,
    fontWeight: 700,
    transition: 'all 0.2s',
    background: i === arcIdx ? `${color}33` : i < arcIdx ? `${color}11` : 'rgba(255,255,255,0.03)',
    border: `1px solid ${i === arcIdx ? color : i < arcIdx ? `${color}44` : 'rgba(255,255,255,0.06)'}`,
    color: i === arcIdx ? color : i < arcIdx ? `${color}88` : 'rgba(255,255,255,0.95)',
  };
}

/** Scene slot buttons */
export function sceneLoadBtnStyle(hasData, gc) {
  return {
    padding: '5px',
    borderRadius: 3,
    fontSize: 10,
    cursor: 'pointer',
    fontFamily: MONO,
    textAlign: 'center',
    border: `1px solid ${hasData ? gc + '44' : DIM3}`,
    background: hasData ? `${gc}0d` : 'rgba(255,255,255,0.02)',
    color: hasData ? gc : 'rgba(255,255,255,0.95)',
  };
}

export const SCENE_SAVE_BTN = {
  padding: '2px',
  borderRadius: 2,
  fontSize: 10,
  cursor: 'pointer',
  fontFamily: MONO,
  textAlign: 'center',
  border: `1px solid ${DIM3}`,
  background: 'rgba(255,255,255,0.02)',
  color: DIM,
};

/** BPM nudge button (±1 or ±5) */
export function bpmNudgeBtnStyle(large) {
  return {
    width: large ? 16 : 14,
    height: 16,
    borderRadius: 2,
    border: 'none',
    background: large ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
    color: DIM,
    fontSize: 10,
    cursor: 'pointer',
    fontFamily: MONO,
    lineHeight: 1,
    flexShrink: 0,
  };
}
