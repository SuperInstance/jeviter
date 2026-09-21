# Dreaming, receipted

*Seed 4 from docs/AGENTIC-CYCLE.md — the sleep/consolidation pass, in the
fleet's idiom: consolidated memory is a receipted operation, not a cleanup
chore.*

## Positioning

**FLUCTLIGHT** (arXiv 2608.12365) is the relevant prior art: WAL
checkpoint + replay-on-boot, proven under Jepsen chaos. The distinction
matters and is load-bearing: replay answers *"what state did the agent
wake with?"* Dreaming answers *"what did the agent choose to compress,
and what did that choice cost?"* FLUCTLIGHT resumes the day; this cell
audits the night.

No-delete doctrine applies with full force. Consolidation **relocates**
superseded rows to `state: "achieved"` and records `supersededBy`; it
never deletes. An agent that cannot show its old rows cannot prove the
summary was honest — it can only assert it.

## The cell

`src/dream.js` exports `consolidateMemory`:

```js
const result = consolidateMemory({
  entries: memoryRows,          // oldest first; recent rows are kept live
  ledger: new Ledger('agent-dream'),
  windowSize: 4,
  keepRecent: 2,
  summarize: (batch) => makeSummarySomehow(batch),
});
```

- The old tail is batched (`windowSize`) and compressed by the caller's
  `summarize(batch)`.
- Each successful batch produces one `consolidated-memory` object with a
  stable `dream:<fnv1a64(summary+sources)>` id and a `dream` receipt.
- Each refusal (no summarizer, empty summary) produces a
  `dream-refusal` receipt and leaves the originals live. **No invention
  is booked as memory.**
- Return value separates `kept` (live), `consolidated` (new memories),
  and `achieved` (relocated originals). `verified` replays the ledger
  before anyone trusts the night's work.

## Honest gaps

- `summarize` is deliberately not shipped. Semantic compression is the
  caller's model; this cell meters and receipts it. A generic
  string-join summarizer would be costume — plausible-looking memory
  with no provenance.
- tidepool's WAL adapter is designed, not wired: read WAL → run this
  cell → write consolidated row + achieved relocations → keep the dream
  ledger beside the WAL. The seam is exactly `entries`/`summarize`.
- Cost is metered in receipts, not tokens: the ledger proves which rows
  were compressed and when; it does not claim the summary was good.
