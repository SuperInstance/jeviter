# Fleet dogfood notes — where jeviter earns its keep

kimi1 (fleet orchestrator) using jeviter in real fleet work, 2026-09-22.
Updated as the sample grows. Honest in both directions.

## Where it has been used

1. **The distiller's JEV GATE** (`src/distill.js`, seed 3) — every persona
   lesson passes the Throttle before it may pin. The gate decided 3 pinned /
   3 silenced on the shipped fixture, and every decision is a receipt.
2. **Receipt booking** in the fidelity cell (`src/fidelity.js`) and the
   dreaming cell design (seed 4) — readings are ledger rows, not log lines.

## Most useful so far

- **Throttle as an admission gate for subjective calls.** "Is this lesson /
  finding / report worth acting on" stops being an authorial mood and becomes
  a receipted measurement. The ratchet is armor with zero tuning — an
  alternating-payload attacker cannot buy perpetual escalation, and neither
  can an overeager reporter.
- **Ledgers for cross-agent handoff.** A receipt chain is readable by a
  different agent, later, without trusting the writer. In a fleet where
  subagent completion events are unreliable narrators, the ledger is the
  layer that does not lie.
- **Zero-dep ESM.** Imports into any fleet tool without dependency fights;
  browser-native means the TUI and the quilt ports share one truth.

## Least useful so far (honest)

- **`JevIterator` on clock-driven streams.** Heartbeats and cron pulses are
  scheduled ticks, not surprise-driven streams. Pulling them through the
  iterator buys nothing the scheduler does not already enforce. The iterator
  wants *event* streams (logs, SSE, LLM output).
- **`profile()` on code and structured telemetry.** The letter-class organ
  is prose-shape only: two different stack traces with the same
  vowel/consonant histograms collide, and a big semantic diff can read as
  zero gain. Structured payloads want their own organ (seeded-dice / hash
  organs elsewhere in the fleet). `profile()` is calibrated for narrative.
- **Threshold dynamics surprise newcomers.** The seed call does not populate
  `accepted`, so the *second* call faces threshold 0 and any gain escalates;
  sheds only begin after the first real admission (identical profile → gain
  0 → shed). Correct for armor, surprising if you expected "similar sheds
  early". Pinned in `test/distill.test.js`.

## Synergies to explore (queued)

1. **Snowball pulse ledger.** Every cron pulse books `{done, next,
   blockers}` as a receipt row. `scanLedger` then turns "the program went
   quiet" into a receipted QUIET reading, not a vibe — and a silence-streak
   becomes tomorrow's dream boundary (feeds seed 4 directly).
2. **Heartbeat throttle.** Unchanged findings (calendar/weather/inbox same
   as last tick) pass through the Throttle: shed the familiar, escalate the
   surprising. Context saved is context earned.
3. **Memory files as WAL.** `memory/2026-*.md` entries are append-only in
   spirit; a dream pass consolidates a week into canon-stub lessons — the
   distiller's four checks apply verbatim.
4. **Event honesty layer.** The registry's unreliable-narrator problem
   (timeout ≠ dead, duplicate and stale completion events) is exactly a
   ledger problem: book each event as a receipt, dedup by hash, let
   `scanLedger` name the pattern.
5. **Consolidator symmetry.** Distiller (playtests) and dream cell (WALs)
   run the same four checks — a future `src/consolidate.js` could hold one
   pipeline with two ingest adapters.
