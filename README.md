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

## The model (radar-4)

`implied = TVL x exp(pred) x odds`, computed from the snapshot's own figures:

- **pred — the log of the market-cap-per-TVL a protocol like this one
  would carry.** The median log ratio of the protocol's OWN category,
  shrunk toward the global median when the category holds fewer than 5
  live protocols, so a one-protocol category can never set a wild price,
  plus a fitted size slope on log TVL: big protocols carry a smaller
  multiple than small ones, and the fit says how much smaller. The
  conditional value is TVL x exp(pred): what the token would be worth
  *if* it launches. No category is named in code — every median and
  the slope are fitted from the snapshot at run time.
- **odds — the fitted chance the protocol ever records a token.**
  Fitted from the peers' record: the share of protocols that record a
  token rises with age, so a survival curve (a share pi of protocols
  ever record one, at a rate lambda a year) is fitted to five age
  bands by least squares, and the odds are the curve's answer for the
  protocol's own age. The longer a protocol runs with no token on
  record, the less likely it ever records one. A protocol with no
  listing date takes the base rate — the share of all protocols that
  record a token — and the dashboard says so.

The model was tested, not asserted. Leave-one-out over the 128
live-token protocols: the winner misses by x3.37, the flat global
median by x5.07. The 7-day TVL change, the age inside the value, and
the chain count were each fitted and tested held-out, and each one made
the miss worse, so none of them is in the price — the dashboard shows
the per-term table, the walk-forward both ways, and the range coverage
(50% of held-out tokens land inside the printed P25–P75 range).
The printed range of an implied value comes from the model's own
held-out misses.

The verdict is costed on one $1,000 ticket, the same for every row:
the expected slice is the implied value times the airdrop pool's 5%
share times the ticket's share of TVL; gas is the plan's own
transactions on the protocol's chain; time is the plan's own minutes
at $25 an hour. FARM clears the gas by $5; MARGINAL sits within $5;
the rest is SKIP.

No protocol name is ever special-cased. Live-token protocols are set
aside with their market caps — the market's own numbers, never a model's.
Wrapped, staked and bridged products of tokens that already trade are
set aside too, as are exchanges and versioned pools: WBTC is Bitcoin on
Ethereum, not a protocol waiting on a launch of its own. The dashboard
carries the full accounting: all 758 protocols in exactly one group.

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
spotlight, a detail view for every protocol (conditional value, odds,
implied value with its range, every factor behind its number, a
why-this-rank sentence, the costed FARM / MARGINAL / SKIP verdict, plus
its 7-step farm plan with costs and times), a table of the multiples by
category, the out-of-sample evidence (held-out tests, walk-forward,
range coverage), the fitted odds bands, the full accounting ledger, and
a separate live-token view showing all 128 protocols the multiples are
measured from.

## License

MIT. See `LICENSE`.
