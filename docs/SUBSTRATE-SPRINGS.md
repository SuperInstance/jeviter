# Substrate springs — where the new org repos plug into jeviter

The fleet's `substrate-*` packages are not dependencies to add blindly. They are
springs: exact tools that can replace an intentionally local seam in jeviter
without changing the doctrine. Current reading after mining the three repos:

| Substrate repo | Existing jeviter seam | Spring it provides | Honest gap |
|---|---|---|---|
| `SuperInstance/substrate-rng` | `Ledger(cell)` names a cell; profiles are deterministic functions of text. | `Xoshiro256`, `SplitMix64`, `stringToSeed` (FNV-1a → u64) can seed reproducible watch variants, shuffle replay fixtures, and generate deterministic probe streams for threshold tests. | Keep the receipt hash function pinned to `fnv1a64` UTF-8. Substrate RNG is for experiment/probe randomness, never for receipt identity. |
| `SuperInstance/substrate-embedding` | `JevIterator` accepts `profileFn`; today `profile()` is the letter-class organ. | A semantic `profileFn` adapter can embed each pull, bucket dims, and return the same rational-profile shape. That would make jeviter react to meaning-shift, not just symbol-shift. | `HashEmbedder` is deterministic but non-semantic. `RemoteEmbedder`/BGE gives semantics but crosses a network and can change under us; receipt the embedding payload or hash if used. |
| `SuperInstance/substrate-vectors` | `klGain(base, reading)` compares two profiles; throttling compares one boundary belief to one request. | `topK`, `kMeans`, `silhouette`, and PQ give a neighborhood layer: cluster event profiles, route alarms to nearest prior event families, or admit only novelty far from the current boundary. | Adds a second model of "near" beside KL. Keep KL as the receipted admission rule until vector semantics are pinned by tests. |

## The smallest honest builds

1. **Deterministic probe stream.** Use `substrate-rng` to synthesize lines with
   known letter-class transitions; assert the ratchet still silences fixed
   amplitude after one admission. This tests the classifier without pretending
   the probe is org data.
2. **Semantic profile adapter seam.** Add an optional `profileFn` example that
   embeds text, reduces to a small rational profile, and books the source text
   hash in the ledger. No default change until the seam has pinned vectors.
3. **Alarm neighborhood index.** Persist event embeddings beside the existing
   JSONL ledger, then use `topK(..., 'cosine')` only as a reporting overlay on
   `scanLedger()` — never as a silent admission path.

## Canon note

The fleet canary remains pinned as:

```text
fnv1a64("café Δ 日本語") = 0x024a555471370b18d
```

`substrate-rng`, `substrate-vectors`, and `substrate-embedding` all now carry
that canary in their own tests. Any jeviter integration must keep receipt
identity on the same UTF-8 FNV-1a rule so ledgers cross-verify with jev-quilt,
duke-lab WASM, and quilt-engine-ports GDScript.
