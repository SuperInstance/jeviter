# Vibe→Spec distillation — seed 3 doctrine

**The claim.** A persona playtest run can emit a CANON.md stub. Not a
vibes summary — a machine-checked artifact: every lesson carries
line-citations, a content hash, and a receipt; the stub is re-parsed
and verified after rendering. Operational fiction as the distill step.

**Why a checked stub beats a summary.** A summary is an assertion.
A stub is a contract: its lessons resolve to transcript lines (`T<n>`),
its hashes recompute from its own text, its cross-references are
bidirectional by construction, and every decision along the way is
booked on a hash-chained ledger. A lie in the stub fails at verify-time,
not at trust-time.

## The four checks (named contract)

| check | what it pins | failure mode |
|---|---|---|
| **CITATION** | every lesson cites ≥1 transcript line; every cite resolves | REFUSED, reason names the bad ref |
| **DUP** | normalized-text hash vs `priorLessons` | booked SILENCE — repeats never re-pin (dormancy is not costume) |
| **JEV GATE** | new lessons pass through the homeostatic Throttle | surprising → receipted escalation; familiar → receipted silence |
| **WELL-FORMEDNESS** | the rendered stub re-parsed: provenance, 16-hex hashes, bidirectional `see:`/`referenced_by:` edges; hashes RECOMPUTED when the transcript is in hand | problem list names the row |

REFUSED ≠ dropped: refusals are first-class output with named reasons.
Silences are booked data, never hidden. This is the fleet doctrine,
applied to the distill step itself.

## Exactness rules (pinned by tests)

- `fnv1a-64` over UTF-8 bytes (the café Δ 日本語 vector holds).
- Lesson hashes bind NORMALIZED text (lowercase, whitespace collapsed),
  so markdown jitter cannot rewrite a pinned lesson.
- Numbers live inside lesson TEXT; floats never touch identity.
- `see Lk` refers only to already-pinned lessons; forward or missing
  refs are REFUSED (XREF), never silently rewired.
- NEVER-THROW: malformed/empty input → REFUSED receipt + honest empty
  stub, no exception.

## Relation to spec-fidelity (seed 2)

`src/fidelity.js` meters implementation-side fidelity: canon-claimed
artifacts that hash-match at verify-time. The distiller produces the
artifact that meter reads: the stub IS the spec surface. Together they
close the loop — *distill the vibe into a checked stub; measure the
fleet's fidelity against it.*

## Run it

```
node examples/vibe-distill.js --check
```

The fixture (`examples/fixtures/playest-jeviter-tui.md`) is a real
small persona playtest of the TUI instrument panel. Current honest
reading: **3 lessons pinned, 3 silenced, 0 refused** — the gate admits
the surprising half of the persona's observations and receipts the
familiar half as silence. Admission is not flattery.
