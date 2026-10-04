# jeviter — User Guide

## What you get

A homeostatic iteration layer for anything that streams text, plus the
receipting discipline that makes "nothing happened" provable:

- **`JevIterator`** — wrap any async/sync iterable; `next()` pulls until the
  stream's *shape* (a letter-class KL profile) surprises a sliding boundary
  belief, then yields `{ text, gain, threshold, pulls, tick }`. Silences are
  booked, never shown.
- **`Throttle`** — wrap any `fn(text, ...args)`: familiar inputs shed
  (receipted, return `undefined`), surprising inputs escalate. The ratchet
  makes an alternating-payload attacker unable to buy perpetual escalation.
- **`Ledger`** — fnv1a-64 hash-chained receipts (pinned to the fleet café
  canary `0x24a555471370b18d`), replay-verified from genesis; tamper breaks at
  its own row.
- **A CLI** — `tail`, `follow`, `scan`, `tui`, stdin `digest`.
- **An MCP stdio server** — `jeviter_tail`, `jeviter_next`, `jeviter_throttle`,
  `jeviter_ledger_verify`, plus ADE bridge tools `fleet_doctrine`,
  `fleet_spec_fidelity`, `fleet_collab_read`.
- **The cell family** — `governor` (sequential-merge), `dream` (receipted sleep
  consolidation), `distill` (Vibe→Spec distiller), `fidelity` (spec-fidelity
  meter), `collab` (collaboration-paradox reader).

Zero npm dependencies. Node >= 18. Browser-native ESM (the core imports only
`./profile.js`).

## Install

```bash
git clone https://github.com/SuperInstance/jeviter.git
cd jeviter
npm test          # 88 tests, ~0.6s — no network, no keys
# optional: put the CLI on PATH
npm link          # provides the `jeviter` bin (src/cli.js)
```

## First success in 5 minutes

Watch a quiet log get silenced, then a real event get through:

```bash
printf 'INFO heartbeat\nINFO heartbeat\nINFO heartbeat\nERROR disk full on /var\n' > /tmp/demo.log
node src/cli.js tail /tmp/demo.log --ledger /tmp/demo.ledger.jsonl
```

Expected output (captured from an actual run 2026-10-04): three heartbeat
lines are swallowed — the first seeds the belief, the next two are booked
silences — and the ERROR line prints as an event:

```
[event #1 gain=0.128 th=0.000] ERROR disk full on /var
```

Then read the receipts — the quiet was not a hang, it was booked:

```bash
node src/cli.js scan /tmp/demo.ledger.jsonl
# scan(/tmp/demo.ledger.jsonl): CHAIN VERIFIED — 4 receipt(s)
#   event: 1
#   seed: 1
#   silence: 2
# reading: ALIVE — 1 event(s), 2 silence(s) booked, admission 33.3%
```

## Everyday usage

### 1. Tail a file that only speaks when it matters

```bash
node src/cli.js tail /var/log/app.log --ledger app.ledger.jsonl --k 2
```

`--k` raises/lowers the surprise bar (threshold = mean + k·σ of admitted
gains; default 2.0). The ledger persists and replays: restart with the same
`--ledger` and the chain continues where it left off.

### 2. Follow an SSE / newline HTTP stream

```bash
node src/cli.js follow https://example.com/events --k 1.5 --ledger events.ledger.jsonl
```

`data:` lines and SSE comments are handled; the shape of the text, not its
arrival, decides admission.

### 3. Digest a one-shot text (files, reports, transcripts)

```bash
cat incident-report.md | node src/cli.js -
cat report.md | node src/cli.js digest    # digest reads STDIN; it ignores a filename argument
```

Prints each admitted line and a stderr summary (`N pulls booked, M silences`).
The first meal of this cell was its own merge-sweep report (docs/IN-SERVICE.md,
Service 1).

### 4. Verify a ledger (and name the silence pattern)

```bash
node src/cli.js scan org-watch.ledger.jsonl --panel   # instrument snapshot (read-only)
```

Exit 0 verified / 1 broken / 2 unreadable. The reading names the stream's
state: `EMPTY`, `QUIET` (receipts, no events — receipted quiet, not a hang),
`ALIVE` (with admission %), or `TAMPER` with the row and reason.

### 5. Use it as a library

```js
import { JevIterator, Throttle, Ledger } from 'jeviter';

const it = new JevIterator(streamOfLines, { k: 2, ledger: new Ledger('my-cell') });
for await (const ev of it) {
  console.log('the world moved:', ev.text, ev.gain.toFixed(3));
}

const api = new Throttle(callEndpoint, { k: 2, window: 16 });
api.call('routine payload');      // familiar → shed, returns undefined, receipted
api.call('genuinely new shape');  // surprising → escalated, fn runs
```

### 6. Serve it over MCP

```bash
node src/mcp.js
```

Register with any MCP client (Claude Desktop, fleet agents). `jeviter_tail`
opens a stream handle, `jeviter_next` rests until the world moves,
`jeviter_throttle` wraps an endpoint, `jeviter_ledger_verify` replays a JSONL
ledger from genesis.

### 7. Distill a persona playtest into a checked CANON stub

```bash
node examples/vibe-distill.js --check
```

Runs the shipped fixture through the distiller's gates (CITATION, DUP, JEV
GATE, WELL-FORMEDNESS) — the fixture passes; try editing the fixture to lie
about its transcript lines and watch it refuse.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| First line/event never emitted | Seeding is not news — the first pull seeds the belief | Expected behavior; the `seed` row is in the ledger |
| Everything after a burst is silenced | The dynamic threshold absorbed the burst's amplitude; the ratchet silences fixed-amplitude worlds after one admission | Expected; model the *shape* of genuinely-new events, or lower `--k` |
| `scan` says `TAMPER — chain breaks at row N` | The row at N was edited (or written by a different hash function) without re-chaining | Restore from the honest source; the row names its own failure; never "repair" in place |
| `scan` exits 2 | Ledger file unreadable/unparseable | Check the path; an unreadable ledger is never a PASS |
| `tui: needs a TTY` | No terminal on stdout | Run in a real TTY; pipe `scan --panel` for non-interactive reads |
| `follow <url>` exits 0 with no output and no ledger rows | `follow` never checks the HTTP status — a 404 stream is a silent success | Verify the URL manually (curl it) before trusting a quiet `follow` (wave-69 drill finding) |
| `digest report.md` books nothing / waits on stdin | `digest` ignores its file argument and always reads STDIN | Pipe into it: `cat report.md | node src/cli.js digest` (wave-69 drill finding) |
| `TypeError: it is not iterable` in examples/org-watch.js or jev-ci.js | the `gh` CLI is not installed (or not authenticated); without `gh` the examples crash with a TypeError, not a friendly error | Install the gh CLI AND `gh auth login`; these examples are in-service tools, not tests (wave-69 drill finding) |
| Ledger row looks like a JSON string inside JSON | `{"body":"{\"cell\":...}","hash":"..."}` | Parse `body` as a second JSON step; that is the format |
| My payload text is cut off in receipts | Payloads truncate at 200 chars by design | Keep the ledger as an audit trail; store full text elsewhere |
| `node --test` fails with an odd discovery error | Invoked outside the package root with explicit dirs | Use `npm test` from the repo root |

## FAQ

**Why "rest, and react" instead of just debouncing?**
Debouncing hides work on a timer; jeviter's admission rule is a *belief* about
the stream's shape (mean + k·σ over admitted gains), and every non-admission
is a receipt. You get less noise AND an audit trail — a silenced pull you
cannot audit is indistinguishable from a hang, which is the failure mode
debouncing also has.

**Is the hash chain cryptographically strong?**
No, and that is honest: fnv1a-64 is a fast, fleet-pinned checksum chosen for
byte-exact cross-verification with jev-quilt's Bookkeeper and other ports, not
for adversarial cryptography. It detects accidental tamper and forces any
forger to re-chain; the replay-equality and double-entry checks are the
stronger teeth. Do not use it as your only defense for high-value secrets.

**What does "JEV" have to do with this if there is no API call?**
The distiller's "JEV GATE" applies the judge philosophy locally: new lessons
pass through the Throttle (surprising escalate, familiar book silence). The
same noul/choice/score gate exists as a real API path in the sibling repo
quilt-jev-toolkit; here it runs offline with zero dependencies.

**Can I use it in the browser?**
The core (`src/core.js`, `src/profile.js`) is dependency-free ESM and was
written browser-native first. The CLI/TUI/MCP/examples use node: modules and
are Node-side.

**How do I contribute a new "cell" (like governor/dream/distill)?**
Follow the house pattern: doctrine in the header comment, pinned by tests in
`test/`, every reading booked as a hash-chained ledger row, refusal as a
first-class outcome, never-throw on malformed input. See
docs/DEVELOPER-GUIDE.md.
