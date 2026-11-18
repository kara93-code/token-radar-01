# Launch Radar — token-radar-01

Which pre-token DeFi protocol is worth farming next? This entry reads a
frozen DefiLlama snapshot (758 protocols, 40 on the watchlist), ranks all
289 rankable pre-token protocols by implied value, and shows a farm plan
for each one.

## The model (radar-2)

`implied = TVL x M x G x A x B`, computed from the snapshot's own figures:

- **M — live-market multiple.** The median market-cap-per-TVL of the
  live-token protocols in this same snapshot (0.20x here). The market
  itself sets the price of a dollar of TVL; the entry never hardcodes it.
- **G — growth factor.** From the 7-day TVL change, clamped to -40% /
  +80%. Rises are weighted 0.55, falls 0.85 — a drawdown bites harder
  than a rally lifts.
- **A — age factor.** How long the protocol has run with no token on
  record: 0.55 + 0.45 x (1 - exp(-age / 400 days)).
- **B — breadth factor.** 1 + 0.03 per extra chain, up to 4 extra chains.

No protocol name is ever special-cased. Live-token protocols are set
aside with their market caps — the market's own numbers, never a model's.
Wrapped, staked and bridged products of tokens that already trade are
set aside too, as are exchanges and versioned pools: WBTC is Bitcoin on
Ethereum, not a protocol waiting on a launch of its own.

## Honest language

The snapshot records whether DefiLlama carries a token for a protocol.
This entry says "no token on record", never "has no token" — the record
is not proof. It never predicts whether or when a protocol issues a token.

## Run it

Node 22.18+ only, standard library only, no network:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

That writes `out/board.json` (289 rows), `out/data.js`, `out/dashboard/`,
`out/screenshots/` and `out/dossier.json`. The run is deterministic:
the same snapshot bytes always write the same output bytes.

## Dashboard

A static page with no network: search, category and chain filters, a
watchlist-only toggle, sortable columns, a top-10 spotlight, a detail
view for every protocol (every factor behind its number, plus its farm
plan), and a separate live-token view showing the mcap/TVL ratios the
multiple is measured from.

## License

MIT. See `LICENSE`.
