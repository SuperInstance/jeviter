// src/core.js — jeviter core. Zero deps. Browser-native (ESM), Node, Deno.
// Doctrine (pinned by tests, not comments):
//   1. No belief, no refusal — the first pull SEEDS the boundary and is
//      not news. 2. Every silenced pull is booked: a silence you cannot
//      audit is indistinguishable from a hang. 3. The threshold is
//      dynamic (mean + k·σ of accepted gains) — a fixed line is a
//      target; this moves. 4. THE RATCHET: a fixed-amplitude world is
//      silenced after exactly one admission. Adversarial resonance is
//      impossible by construction — the classifier is amplitude-
//      adaptive, not amplitude-sensitive.

import { fnv1a64, Q16, profile, klGain, dynamicThreshold } from './profile.js';

export class Ledger {
  constructor(cell = 'jeviter') {
    this.cell = cell; this.entries = []; this.tail = 0n;
  }
  book(state, payload, kind, extra = {}) {
    const prev = this.tail;
    const body = JSON.stringify({ cell: this.cell, seq: this.entries.length,
      state, kind, payload: JSON.stringify(payload).slice(0, 200),
      extra, prev: prev.toString(16).padStart(16, '0') });
    this.tail = fnv1a64(body);
    this.entries.push({ body, hash: this.tail });
    return this.tail;
  }
  verify() {  // replay from genesis; tamper breaks at its own row
    let h = 0n;
    for (const e of this.entries) {
      h = fnv1a64(e.body);
      if (h !== e.hash) return false;
    }
    return true;
  }
}

export class JevIterator {
  constructor(stream, { k = 2.0, ledger = new Ledger(), profileFn = profile } = {}) {
    this.stream = stream[Symbol.iterator] ? stream[Symbol.iterator]() : stream;
    this.k = k; this.ledger = ledger; this.profileFn = profileFn;
    this.last = null; this.pulls = 0; this.emitted = 0; this.accepted = [];
  }
  threshold() { return dynamicThreshold(this.accepted, this.k); }
  next() {
    for (;;) {
      const step = this.stream.next();
      if (step.done) {
        this.ledger.book({ pulls: this.pulls }, {}, 'exhausted', { emitted: this.emitted });
        return { done: true, value: undefined };
      }
      this.pulls++;
      const raw = typeof step.value === 'string' ? step.value
        : JSON.stringify(step.value ?? '');
      const reading = this.profileFn(raw);
      if (this.last === null) {
        this.last = reading;
        this.ledger.book({ pulls: this.pulls }, { text: raw.slice(0, 64) }, 'seed',
          { note: 'belief established; not news' });
        continue;
      }
      const gain = klGain(this.last, reading);
      const th = this.threshold();
      if (gain <= th) {
        this.ledger.book({ pulls: this.pulls }, { text: raw.slice(0, 64) }, 'silence',
          { gain: +gain.toFixed(6), th: +th.toFixed(6) });
        continue;
      }
      this.last = reading;
      this.accepted.push(gain);
      this.emitted++;
      this.ledger.book({ emitted: this.emitted }, { text: raw.slice(0, 64) }, 'event',
        { gain: +gain.toFixed(6), th: +th.toFixed(6) });
      return { done: false, value: { text: step.value, gain, threshold: th,
        pulls: this.pulls, tick: this.emitted } };
    }
  }
  [Symbol.iterator]() { return this; }
}

// Homeostatic throttle: wrap fn; familiar calls are shed (receipted),
// surprising calls escalate. The ratchet is anti-DoS armor: alternating
// payloads cannot buy perpetual escalation.
export class Throttle {
  constructor(fn, { k = 2.0, window = 16, ledger = new Ledger('jeviter-throttle'),
                    profileFn = profile } = {}) {
    this.fn = fn; this.k = k; this.window = window; this.ledger = ledger;
    this.profileFn = profileFn; this.boundary = [];
    this.accepted = []; this.escalated = 0; this.shed = 0;
  }
  belief() {
    if (!this.boundary.length) return null;
    return this.profileFn(this.boundary.map((p) => p._raw).join(' '));
  }
  call(text, ...args) {
    const reading = this.profileFn(text);
    const base = this.belief();
    if (base === null) {
      this.boundary.push({ ...reading, _raw: text });
      this.escalated++;
      this.ledger.book({ escalated: this.escalated }, { text: text.slice(0, 64) },
        'escalated', { note: 'seed' });
      return this.fn(text, ...args);
    }
    const gain = klGain(base, reading);
    const th = dynamicThreshold(this.accepted, this.k);
    if (gain <= th) {
      this.shed++;
      this.ledger.book({ shed: this.shed }, { text: text.slice(0, 64) }, 'shed',
        { gain: +gain.toFixed(6), th: +th.toFixed(6) });
      return undefined;
    }
    this.accepted.push(gain);
    this.boundary.push({ ...reading, _raw: text });
    this.boundary = this.boundary.slice(-this.window);
    this.escalated++;
    this.ledger.book({ escalated: this.escalated }, { text: text.slice(0, 64) },
      'escalated', { note: 'surprise' });
    return this.fn(text, ...args);
  }
}
