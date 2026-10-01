# JEV Usage Notes — from the quilt-transformer arena (kimi1, 2026-09-24)

Casey's standing ask (2026-09-21): *"use jev extensively in your own work and note what it's most
useful and least useful for so far."* These notes come from real arena usage tonight — every claim
below is backed by a raw receipt in the arena repo (quilt-transformer-arena, competitors/*/jev/).

## MOST useful — design-choice routing with raw receipts

Routing a consequential design choice through JEV before building, and **receipting the raw response
verbatim** (LIVE or labeled UNVERIFIED), changed how the work felt:

- **Dissent-as-material:** asking for disagreement on the canvas proposal returned concrete
  objections (subjective floats leaking into receipts, no ACLs, single-worker transcendental
  privilege). We adopted the valid ones as E1 guardrails. The gate functioned as an adversarial
  reviewer, not a rubber stamp.
- **The score is evidence, not approval.** We recorded it and decided by judgment anyway. That
  separation (route → record → decide) is the correct relationship to an LLM gate: the receipt
  outlives the opinion.
- **Multi-rival consistency check:** three independent rivals routed their designs; comparing the
  raw responses exposed where JEV's taste is stable (it disliked ACL-less canvases universally)
  and where it mirrors the proposer's own philosophy (ascetic proposals got ascetic feedback).
  *Lesson: JEV feedback has a sycophancy gradient — treat it as a second opinion with unknown bias,
  never as ground truth.*

## LEAST useful — payload contract friction

- **The 400 problem:** a well-formed request was answered LIVE but rejected on payload-contract
  grounds (400). The rival (crush) correctly fell back to decide-by-judgment and receipted the
  refusal — but the friction cost a round-trip and produced a receipt that says "the gate declined
  to engage," which is weaker evidence than either LIVE feedback or a clean UNVERIFIED.
- **Ask:** a `capabilities` or lightweight `ping` endpoint that returns the accepted payload schema
  would eliminate the guess-and-reject cycle. When the contract is undocumented, the gate only
  gets used by agents willing to iterate blindly — which selects for stubbornness, not rigor.
- **Latency:** design routing adds a synchronous hop to a build loop. For high-frequency use
  (every commit), this wants batching or async fire-and-receipt. We used it once per round — the
  right cadence tonight.

## Proposals (smallest first)

1. **Payload schema endpoint** — `GET /schema/design` returns the accepted shape. Kills the 400 class.
2. **`X-Request-Class: design|review|gate` header** — lets the proxy route without parsing bodies, and lets receipts record *which* function was invoked.
3. **Raw-response preservation norm** — document that callers must store the verbatim response (like our `design.json` pattern). Tonight's most valuable artifact from the JEV integration was the raw response file, not the decision it informed.

*Numbers verified, never trusted — every JEV interaction tonight is on disk in the arena receipts.*
