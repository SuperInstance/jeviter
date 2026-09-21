# jeviter

**Don't poll. Rest, and react.**

Homeostatic iteration for any agentic system. Replace `for (const event of stream)`
with iteration that yields only when the world actually moves — and books every
silence so a quiet stream is a *receipted* quiet stream, not a hang.

## Why

A `for` loop pulls every tick whether or not the world changed. An agent doing
that on a log tail, an SSE feed, a message queue, or an LLM output stream burns
context, tokens, and attention on repetition. jeviter inverts it: `next()` pulls
until the stream *surprises* a sliding boundary belief, then yields once.

Three laws, pinned by tests rather than promises:

1. **No belief, no refusal.** The first pull seeds the boundary — seeding is not news.
2. **Every silence is booked.** A silenced pull writes a receipt. A silence you
   cannot audit is indistinguishable from a hang.
3. **The threshold is alive.** Dynamic: mean + k·σ over admitted gains. A fixed
   line is a target; this moves.

And the finding that makes it armor: **the ratchet.** A world oscillating at any
fixed amplitude is silenced after exactly one admission — the threshold sets
itself from the first gain and the return leg lands just under it. Adversarial
resonance is impossible by construction. In `Throttle` form: a flood of identical
requests self-sheds (an alternating-payload attacker *cannot* buy perpetual
escalation), compute flows to the genuinely unexpected.

## Canon-compatible

The ledger hash-chain is fnv1a-64 over UTF-8 — pinned to the fleet's café vector
`fnv1a64("café Δ 日本語") === 0x24a555471370b18d` — so receipts cross-verify with
[jev-quilt](https://github.com/SuperInstance/jev-quilt)'s Bookkeeper, duke-lab's
WASM port, and quilt-engine-ports' GDScript from byte one. Profiles are exact
BigInt rationals; KL is computed over rationals, never a float identity.

## Install / use

```bash
npm test                       # node --test
node src/cli.js tail app.log --ledger app.ledger.jsonl
node src/cli.js follow https://example.com/stream --k 1.5
node src/mcp.js                # MCP stdio server (Claude Desktop, fleet agents)
```

```js
import { JevIterator, Ledger } from 'jeviter';
const it = new JevIterator(streamOfLines, { k: 2, ledger: new Ledger('my-cell') });
for await (const ev of wrapAsync(it)) {
  // ev: { text, gain, threshold, pulls, tick } — the world moved
}
```

MCP tools: `jeviter_tail`, `jeviter_next`, `jeviter_throttle`, `jeviter_ledger_verify`.

## Surfaces

| Surface | Status |
|---|---|
| Core ESM (browser/Node/Deno) | ✅ zero-dep |
| CLI (`tail`, `follow`) | ✅ |
| MCP stdio server | ✅ |
| TUI (valve dashboard) | designed — threshold, gain histogram, silence counter |
| Python port | exists as `jev_quilt/jeviter.py` (same doctrine) |

## Doctrine provenance

Born in jev-quilt's classifier lab (E5–E7): cascade non-monotonicity, the
amplitude-invariance sweep, and the throttle sense-organ lesson (letter-class
profiles beat chaotic per-char hashes — KL must always have mass to compare).
