# Playtest — jeviter TUI, first watch

Persona: SRE on-call (Priya), first contact with the instrument panel.
Terminal: 80×24, replayed fixture ledger (7 receipts: 1 ALIVE event, 4 booked silences).

## Run

I started the panel against yesterday's firehose ledger and the first
frame surprised me: the silences were VISIBLE.
The ALIVE line named the one event and then listed every silence the
tail swallowed, each with its own gain and threshold.
At 80 columns nothing wrapped; at 40 the panel clamped instead of
shattering — small, but it kept the receipt column readable.
The admission sparkline is a nice touch: 6.1% admission over a hundred
repo census looks like a flat river, which is the honest shape of a
quiet org.
What I missed: there is no per-cell breakdown — I could not tell which
of the six events came from the census and which from my own tail.
The ratchet line said RATCHET armed and I believed it, but I cannot
point at the row that armed it.
Refresh at 250 ms feels chatty over mosh; 500 ms would still catch a
storm and would stop the flicker.
The escape-stripping is correct — I piped a frame through `less` and
found no raw ANSI in the capture.
The café test below is deliberate: a non-ASCII payload (café Δ 日本語)
rendered and hashed without drama, byte-for-byte what profile.js pins.

## Lessons

- Silence-as-data is the panel's whole personality: a tail that hides what it swallowed would be a costume, and this one shows the swallowed rows with their gains (T9, T11)
- The width clamp keeps receipts readable at 40 columns instead of overflowing the frame — small dignity, real trust (T12, T13)
- The sparkline renders a quiet org as a flat river at 6.1% admission; see L1 for why that honesty is the feature (T14, T16)
- The ratchet readout asserts RATCHET armed but the panel never names the row that armed it — a claim I cannot audit is a claim I do not fully believe (T19, T20)
- Refresh at 250 ms flickers over mosh; 500 ms would still catch a storm and would end the flicker (T21, T22)
- The non-ASCII payload café Δ 日本語 round-trips through the profiler exactly as profile.js pins (T25, T26)
