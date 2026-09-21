// src/tui.js — `jeviter tui <file>`: a terminal instrument panel for the
// homeostatic tail. The tail only speaks when shape changes; the panel only
// redraws when a receipt is booked. Zero deps, ANSI only, 80x24-honest.
//
// Doctrine (pinned by tests, not comments):
//   1. The renderer is PURE — same state, same string. The live loop is a
//      thin shell around it; every render is replayable from the ledger.
//   2. The panel books nothing itself. All numbers come from the iterator's
//      receipts — a UI that invents telemetry is a costume.
//   3. Silence is rendered AS data (a booked row, grey), never as absence —
//      a blank panel and a dead panel must be distinguishable at a glance.

export function createTuiState({ k = 2.0, maxRecent = 8 } = {}) {
  return { k, pulls: 0, events: 0, silences: 0, seed: false,
    exhausted: false, lastEvent: null, recent: [], maxRecent };
}

export function updateTuiState(state, ev) {
  // ev: {type:'seed'|'event'|'silence'|'exhausted', text?, gain?, threshold?, pulls?}
  const s = { ...state, recent: state.recent.slice() };
  if (ev.pulls != null) s.pulls = ev.pulls;
  switch (ev.type) {
    case 'seed': s.seed = true; s.lastEvent = { text: ev.text, gain: null, threshold: null }; break;
    case 'event':
      s.events++;
      s.lastEvent = { text: ev.text, gain: ev.gain, threshold: ev.threshold };
      s.recent.push({ kind: 'event', text: ev.text, gain: ev.gain, threshold: ev.threshold });
      break;
    case 'silence':
      s.silences++;
      s.recent.push({ kind: 'silence', text: ev.text, gain: ev.gain, threshold: ev.threshold });
      break;
    case 'exhausted': s.exhausted = true; break;
  }
  if (s.recent.length > s.maxRecent) s.recent = s.recent.slice(-s.maxRecent);
  return s;
}

const ESC = '\x1b[';
const bar = (frac, width) => {
  const f = Math.max(0, Math.min(1, frac));
  const full = Math.round(f * width);
  return '█'.repeat(full) + '░'.repeat(width - full);
};
const fmt = (n) => (n == null ? '  —  ' : n.toFixed(3));

// Pure: state -> ANSI string. Width-honest at 80 cols; longer lines are
// truncated, never wrapped mid-escape.
export function renderTui(state) {
  const total = state.events + state.silences;
  const admission = total ? state.events / total : 0;
  const L = [];
  L.push(`${ESC}1;36mjeviter${ESC}0m — homeostatic tail${ESC}0K`);
  L.push(`${ESC}2m  k=${state.k}  pulls=${state.pulls}  ` +
    `admitted ${bar(admission, 12)} ${(100 * admission).toFixed(1)}%${ESC}0m${ESC}0K`);
  const le = state.lastEvent;
  L.push(`  shape  gain ${fmt(le?.gain)}  threshold ${fmt(le?.threshold)}` +
    `  ${le?.gain != null && le.threshold != null
      ? bar(Math.min(1, le.gain / Math.max(le.threshold, 1e-9)), 14) : bar(0, 14)}${ESC}0K`);
  L.push(`${ESC}0m  events ${state.events}  silences ${ESC}2m${state.silences}${ESC}0m` +
    `  ${state.seed ? 'belief established' : 'awaiting seed — first pull is not news'}${ESC}0K`);
  L.push(state.exhausted
    ? `${ESC}33m  EXHAUSTED — stream done; ledger is the record${ESC}0m${ESC}0K`
    : `${ESC}2m  following… (q quits)${ESC}0m${ESC}0K`);
  L.push(`${ESC}34m  — recent receipts —${ESC}0m${ESC}0K`);
  for (const r of state.recent) {
    const mark = r.kind === 'event' ? `${ESC}32m▲` : `${ESC}2m·`;
    const txt = String(r.text ?? '').replace(/[\x1b]/g, '').slice(0, 56);
    L.push(`  ${mark} ${r.kind.padEnd(7)}${ESC}0m g=${fmt(r.gain)} th=${fmt(r.threshold)} ${ESC}2m${txt}${ESC}0m${ESC}0K`);
  }
  for (let i = state.recent.length; i < state.maxRecent; i++) L.push(`${ESC}2m  ·${ESC}0m${ESC}0K`);
  return L.join('\n');
}

// Full redraw helper: hide cursor, home, paint, clear-to-end-of-screen.
export function frame(state) {
  return `${ESC}?25l${ESC}H${ESC}2J${renderTui(state)}`;
}
export const TEARDOWN = `${ESC}?25h${ESC}0m\n`;

// ── TUI v0.5: the read-back panel ──────────────────────────────────────────
// `jeviter scan <ledger> --panel`: the same read-back scanLedger already
// computes, rendered as an instrument snapshot. Pure renderer, same doctrine:
// the panel books nothing, invents nothing — every glyph is scanLedger's
// output. A broken chain renders red and names its row; an empty ledger
// renders honest quiet; nothing here can turn TAMPER into a softer word.

export function renderScanSummary(scan) {
  const L = [];
  L.push(`${ESC}1;36mjeviter${ESC}0m — ledger read-back${ESC}0K`);
  if (!scan.verified) {
    L.push(`${ESC}31m  CHAIN BROKEN — tamper at row ${scan.brokenAt}${ESC}0m${ESC}0K`);
  } else if (scan.entries === 0) {
    L.push(`${ESC}2m  EMPTY — no receipts; nothing to audit yet${ESC}0m${ESC}0K`);
  } else {
    L.push(`  CHAIN VERIFIED — ${scan.entries} receipt(s)${ESC}0K`);
  }
  const kinds = Object.entries(scan.kinds).sort((a, b) => b[1] - a[1]);
  const maxN = kinds.length ? kinds[0][1] : 0;
  L.push(`${ESC}34m  — receipts by kind —${ESC}0m${ESC}0K`);
  for (const [kind, n] of kinds) {
    L.push(`  ${kind.padEnd(10)} ${bar(n / Math.max(maxN, 1), 20)} ${n}${ESC}0K`);
  }
  if (!kinds.length) L.push(`${ESC}2m  ·${ESC}0m${ESC}0K`);
  L.push(`  reading: ${scan.verified ? '' : ESC + '31m'}${scan.reading}${ESC}0m${ESC}0K`);
  return L.join('\n');
}
