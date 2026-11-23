# token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/kara93-code/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/kara93-code/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Launch Radar: which pre-token DeFi protocol is worth farming next? This entry reads a frozen DefiLlama snapshot (758 protocols, 40 on the watchlist), ranks every rankable pre-token protocol by implied value, and shows a farm plan for each one.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=rts775m5&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>

## The model (radar-3)

`implied = TVL x Mcat x G x A x B`, computed from the snapshot's own figures:

- **Mcat — category multiple.** The median market-cap-per-TVL of the
  live-token protocols in the protocol's OWN category, measured from
  this same snapshot. A lending market is not priced like a DEX: the
  medians run from 0.13x (Lending) to 0.34x (Dexs) to 0.65x (Basis
  Trading). A category with fewer than 5 live protocols is shrunk
  toward the global median, so a thin category can never set a wild
  price; the result is clamped to [0.05, 1.00]. No category is named
  in code — every median is read off the snapshot at run time.
- **G — growth factor.** From the 7-day TVL change, clamped to -50% /
  +100%. Rises are weighted 0.60, falls 0.90 — a drawdown bites harder
  than a rally lifts — and the factor is clamped to [0.50, 1.60]. No
  reported change scores 1.00.
- **A — age factor, logarithmic.** How long the protocol has run with
  no token on record: 0.50 + 0.50 x ln(1 + age/90) / ln(1 + 1800/90).
  A log curve still separates a 3-year-old protocol from a 6-month-old
  one, where a saturating exponential had nearly flattened by 400 days.
- **B — breadth factor.** 1 + 0.04 per extra chain, up to 5 extra chains.

No protocol name is ever special-cased. Live-token protocols are set
aside with their market caps — the market's own numbers, never a model's.
Wrapped, staked and bridged products of tokens that already trade are
set aside too, as are exchanges and versioned pools: WBTC is Bitcoin on
Ethereum, not a protocol waiting on a launch of its own.

## Honest language

The snapshot records whether DefiLlama carries a token for a protocol.
This entry says "no token on record", never "has no token" — the record
is not proof. It never predicts whether or when a protocol issues a token.

## What it writes

That run writes `out/board.json` (198 rows), `out/data.js`,
`out/dashboard/`, `out/screenshots/` and `out/dossier.json`. The run is
deterministic: the same snapshot bytes always write the same output
bytes. Node 22.18+, standard library only, no network.

## Dashboard

A static page with no network: search, category and chain filters, a
watchlist-only toggle, a growing-only toggle, sortable columns, a top-5
spotlight, a detail view for every protocol (every factor behind its
number, a why-this-rank sentence, plus its 7-step farm plan with costs
and times), a table of the multiples by category, and a separate
live-token view showing the mcap/TVL ratios the multiples are measured
from.

## License

MIT. See `LICENSE`.
