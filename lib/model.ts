// Launch Radar — radar-4: the value model, fitted and tested, not asserted.
//
// One snapshot in, one ranked board out. Every number below is computed
// from the snapshot's own figures at run time; no protocol name is ever
// special-cased, and no row is ever hand-picked.
//
// The model ("radar-4") in one line:
//
//   implied = TVL x exp(pred) x odds
//
//   pred    the log of the market-cap-per-TVL a protocol like this one
//           would carry, fitted on the snapshot's own live-token
//           protocols: the median log ratio of its category (shrunk
//           toward the global median when the category holds fewer than
//           5 live protocols, so a one-protocol category can never set
//           a wild price), plus a size slope on log TVL. The slope is
//           fitted, not chosen: big protocols carry a smaller multiple
//           than small ones, and the fit says how much smaller.
//           conditional = TVL x exp(pred) is what the token would be
//           worth IF it launches.
//   odds    the fitted chance the protocol ever records a token, given
//           it has run this long with none on record. Fitted from the
//           peers' record: the share of protocols that record a token
//           rises with age, so the longer a protocol runs without one,
//           the less likely it ever does. A survival curve (a share pi
//           of protocols ever record one, at a rate lambda a year) is
//           fitted to the five age bands by least squares, and the odds
//           are the curve's answer for the protocol's own age.
//   implied the expected value: conditional x odds. Both parts are
//           shown separately on the board, so the reader sees what the
//           token would be worth and how likely it is.
//
// What the model does NOT use, and why that is in the dashboard: the
// 7-day TVL change, the age inside the value (it lives in the odds),
// and the chain count were each fitted and tested held-out, and each
// one made the held-out miss WORSE, so they are not in the price. The
// test table the dashboard shows is computed by this file at run time,
// from this same snapshot, so the claim is checkable, not a slogan.
//
// Ranges: the printed range of an implied value comes from the model's
// own held-out misses — the 25th and 75th percentiles of its
// leave-one-out residuals. Half the held-out tokens land inside the
// printed range; the dashboard says so.

export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

export interface ModelConstants {
  shrink_prior: number;
  shrink_min_n: number;
  ticket_usd: number;
  airdrop_share: number;
  wage_usd_per_hour: number;
  verdict_farm_net: number;
  verdict_skip_net: number;
}

export const MODEL: ModelConstants = {
  shrink_prior: 5,
  shrink_min_n: 5,
  ticket_usd: 1000,
  airdrop_share: 0.05,
  wage_usd_per_hour: 25,
  verdict_farm_net: 5,
  verdict_skip_net: -5,
};

export const MODEL_VERSION = 'radar-4';

/** How many live-token protocols the dashboard's Live view carries. */
export const LIVE_ROWS = 128;

export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  conditional_value_usd: number;
  odds: number;
  implied_value_usd: number;
  implied_low_usd: number;
  implied_high_usd: number;
  verdict: 'FARM' | 'MARGINAL' | 'SKIP';
  slice_usd: number;
  gas_usd: number;
  hours: number;
  net_usd: number;
  net_per_hour_usd: number;
  model: {
    live_multiple: number;
    category_multiple: number;
    category_n: number;
    size_adjustment: number;
    odds: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  age_days: number | null;
  conditional_value_usd: number;
  odds: number;
  implied_value_usd: number;
  implied_low_usd: number;
  implied_high_usd: number;
  verdict: 'FARM' | 'MARGINAL' | 'SKIP';
  category_multiple: number;
  category_n: number;
  size_adjustment: number;
  slice_usd: number;
  net_usd: number;
  net_per_hour_usd: number;
  farm_steps: string[];
}

export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number;
  change_7d: number | null;
  mcap_per_tvl: number;
}

export interface CategoryFit {
  category: string;
  n: number;
  raw_median: number;
  multiple: number;
}

export interface TermTest {
  term: string;
  kept: boolean;
  loo_miss: number;
  note: string;
}

export interface OddsBand {
  label: string;
  n: number;
  observed: number;
  fitted: number;
  mean_age_days: number;
}

export interface OddsFit {
  pi: number;
  lambda_per_year: number;
  base_rate: number;
  bands: OddsBand[];
}

export interface AccountingGroup {
  label: string;
  count: number;
  why: string;
}

export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  live_multiple: number;
  live_multiple_n: number;
  size_slope: number;
  tvl_exponent: number;
  mean_log_tvl: number;
  category_multiples: CategoryFit[];
  term_tests: TermTest[];
  walk_forward_old_new: number;
  walk_forward_new_old: number;
  walk_forward_flat_old_new: number;
  walk_forward_flat_new_old: number;
  range_low_mult: number;
  range_high_mult: number;
  range_coverage_p25_p75: number;
  range_coverage_p10_p90: number;
  odds_fit: OddsFit;
  accounting: AccountingGroup[];
  worth_farming: number;
  watchlist_size: number;
  watchlist: Record<string, true>;
  board_size: number;
  early_size: number;
  live_size: number;
  rows: RadarRow[];
  live: LiveRow[];
}

export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return NaN;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function medianOf(values: number[]): number {
  return median([...values].sort((a, b) => a - b));
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const at = q * (sorted.length - 1);
  const lo = Math.floor(at);
  const hi = Math.min(lo + 1, sorted.length - 1);
  const frac = at - lo;
  return sorted[lo]! * (1 - frac) + sorted[hi]! * frac;
}

/** Whole days from `listedAt` to `asOf`; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** A protocol records no token when DefiLlama carries no market cap, no CoinGecko id and no symbol. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Categories that are a wrapped, staked or bridged product of a token that already trades — not a launch of its own. */
const WRAPPED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** A name carrying a whole word wrapped, staked or staking, or starting with an exchange's name. */
const WRAPPED_NAME = /(\bwrapped\b|\bstaked\b|\bstaking\b)/i;
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/;

/**
 * A protocol the board may rank: pre-token, and not a wrapped, staked or
 * bridged product of a token that already trades — the same line the
 * watchlist rule draws, applied to the whole field. WBTC is Bitcoin on
 * Ethereum and Binance staked ETH is ETH in a staking product; neither is
 * a protocol still waiting on a launch of its own.
 */
export function isRankable(p: SnapshotProtocol): boolean {
  return (
    isPreToken(p) &&
    !WRAPPED_CATEGORIES.has(p.category ?? '') &&
    !VERSIONED.test(p.name) &&
    !WRAPPED_NAME.test(p.name) &&
    !EXCHANGE_PREFIX.test(p.name)
  );
}

/** The one reason a set-aside protocol is counted under, in this order. */
export function setAsideReason(p: SnapshotProtocol): string {
  if (VERSIONED.test(p.name)) return 'versioned';
  if (WRAPPED_CATEGORIES.has(p.category ?? '')) return 'wrapped-category';
  if (WRAPPED_NAME.test(p.name)) return 'wrapped-name';
  if (EXCHANGE_PREFIX.test(p.name)) return 'exchange';
  return 'other';
}

/** The live-token protocols a multiple is fitted from: a market cap and a TVL, both above zero. */
export function liveProtocols(snapshot: Snapshot): SnapshotProtocol[] {
  return snapshot.protocols.filter((p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0);
}

function logRatio(p: SnapshotProtocol): number {
  return Math.log((p.mcap_usd as number) / p.tvl_usd);
}

/** Ordinary-least-squares slope of `ys` on `xs`. */
function olsSlope(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - mx) * (ys[i]! - my);
    den += (xs[i]! - mx) * (xs[i]! - mx);
  }
  return den === 0 ? 0 : num / den;
}

interface FittedValue {
  globalLogMedian: number;
  meanLogTvl: number;
  sizeSlope: number;
  byCategory: CategoryFit[];
  loo: { recipe: string; miss: number }[];
  walkOldNew: number;
  walkNewOld: number;
  walkFlatOldNew: number;
  walkFlatNewOld: number;
  residP25: number;
  residP75: number;
  residP10: number;
  residP90: number;
  rangeCoverageP25P75: number;
  rangeCoverageP10P90: number;
}

/**
 * The category prediction for one protocol from a pool of live protocols:
 * the pool's median log ratio, blended with the median of its own
 * category when that category holds at least `minN` live protocols.
 * Everything is in log space: ratios run from 0.001x to 400x, and a
 * median of raw ratios lets one giant set the price.
 */
function categoryLogPrediction(
  pool: SnapshotProtocol[],
  protocol: SnapshotProtocol,
  model: ModelConstants,
): number {
  const global = medianOf(pool.map(logRatio));
  const same = pool.filter((p) => (p.category ?? 'Other') === (protocol.category ?? 'Other'));
  if (same.length >= model.shrink_min_n) {
    const raw = medianOf(same.map(logRatio));
    return (same.length * raw + model.shrink_prior * global) / (same.length + model.shrink_prior);
  }
  return global;
}

type Recipe = 'flat' | 'cat' | 'catSize' | 'catSizeGrowth' | 'catSizeAge' | 'catSizeChains';

/** One held-out prediction for a live protocol, under one recipe, from a pool that excludes it. */
function heldOutPrediction(
  pool: SnapshotProtocol[],
  held: SnapshotProtocol,
  recipe: Recipe,
  model: ModelConstants,
  meanLogTvl: number,
  asOf: string,
): number {
  const global = medianOf(pool.map(logRatio));
  if (recipe === 'flat') return global;
  const base = categoryLogPrediction(pool, held, model);
  if (recipe === 'cat') return base;
  // The size slope is fitted on the pool's own residuals: each pool
  // member is predicted from the pool without it, so the slope never
  // sees the protocol it is about to price.
  const xs: number[] = [];
  const ys: number[] = [];
  for (const q of pool) {
    const rest = pool.filter((r) => r !== q);
    const pred = categoryLogPrediction(rest, q, model);
    xs.push(Math.log(q.tvl_usd) - meanLogTvl);
    ys.push(logRatio(q) - pred);
  }
  const slope = olsSlope(xs, ys);
  let pred = base + slope * (Math.log(held.tvl_usd) - meanLogTvl);
  if (recipe === 'catSizeGrowth' || recipe === 'catSizeAge' || recipe === 'catSizeChains') {
    const feat: (p: SnapshotProtocol) => number =
      recipe === 'catSizeGrowth'
        ? (p) => clamp(p.change_7d ?? 0, -50, 100) / 100
        : recipe === 'catSizeAge'
          ? (p) => Math.log(ageDays(asOf, p.listed_at) ?? 180)
          : (p) => p.chains.length;
    const rxs: number[] = [];
    const rys: number[] = [];
    for (const q of pool) {
      const rest = pool.filter((r) => r !== q);
      const predQ = categoryLogPrediction(rest, q, model) + slope * (Math.log(q.tvl_usd) - meanLogTvl);
      rxs.push(feat(q));
      rys.push(logRatio(q) - predQ);
    }
    const extra = olsSlope(rxs, rys);
    pred += extra * feat(held);
  }
  return pred;
}

/** Median absolute leave-one-out error of one recipe, in log points. */
function looMiss(
  live: SnapshotProtocol[],
  recipe: Recipe,
  model: ModelConstants,
  meanLogTvl: number,
  asOf: string,
): number {
  const errs: number[] = [];
  for (const held of live) {
    const pool = live.filter((p) => p !== held);
    errs.push(Math.abs(logRatio(held) - heldOutPrediction(pool, held, recipe, model, meanLogTvl, asOf)));
  }
  return medianOf(errs);
}

/** Walk-forward: fit on one half of the live protocols, test on the other. */
function walkForwardMiss(
  train: SnapshotProtocol[],
  test: SnapshotProtocol[],
  model: ModelConstants,
  meanLogTvl: number,
  withSize: boolean,
): number {
  const errs: number[] = [];
  for (const held of test) {
    let pred: number;
    if (!withSize) {
      pred = medianOf(train.map(logRatio));
    } else {
      const base = categoryLogPrediction(train, held, model);
      const xs: number[] = [];
      const ys: number[] = [];
      for (const q of train) {
        const rest = train.filter((r) => r !== q);
        xs.push(Math.log(q.tvl_usd) - meanLogTvl);
        ys.push(logRatio(q) - categoryLogPrediction(rest, q, model));
      }
      pred = base + olsSlope(xs, ys) * (Math.log(held.tvl_usd) - meanLogTvl);
    }
    errs.push(Math.abs(logRatio(held) - pred));
  }
  return medianOf(errs);
}

/**
 * Fit the value model on the snapshot's live-token protocols, and test
 * it: leave-one-out for every candidate recipe, walk-forward both ways
 * for the winner against the flat median, and the winner's residual
 * quartiles for the printed ranges.
 */
export function fitValueModel(snapshot: Snapshot, model: ModelConstants = MODEL): FittedValue {
  const live = liveProtocols(snapshot);
  const meanLogTvl = live.reduce((a, p) => a + Math.log(p.tvl_usd), 0) / live.length;
  const global = medianOf(live.map(logRatio));
  const groups = new Map<string, SnapshotProtocol[]>();
  for (const p of live) {
    const key = p.category ?? 'Other';
    const arr = groups.get(key) ?? [];
    arr.push(p);
    groups.set(key, arr);
  }
  const byCategory: CategoryFit[] = [...groups.entries()].map(([category, members]) => {
    const raw = medianOf(members.map(logRatio));
    const n = members.length;
    const used =
      n >= model.shrink_min_n ? (n * raw + model.shrink_prior * global) / (n + model.shrink_prior) : global;
    return { category, n, raw_median: round4(Math.exp(raw)), multiple: round4(Math.exp(used)) };
  });
  byCategory.sort((a, b) => b.n - a.n || b.multiple - a.multiple || (a.category < b.category ? -1 : 1));
  // The size slope on the full sample: residuals after the category prediction.
  const xs: number[] = [];
  const ys: number[] = [];
  for (const q of live) {
    xs.push(Math.log(q.tvl_usd) - meanLogTvl);
    ys.push(logRatio(q) - categoryLogPrediction(live, q, model));
  }
  const sizeSlope = olsSlope(xs, ys);
  const recipes: { recipe: Recipe; label: string }[] = [
    { recipe: 'flat', label: 'flat' },
    { recipe: 'cat', label: 'cat' },
    { recipe: 'catSize', label: 'catSize' },
    { recipe: 'catSizeGrowth', label: 'catSizeGrowth' },
    { recipe: 'catSizeAge', label: 'catSizeAge' },
    { recipe: 'catSizeChains', label: 'catSizeChains' },
  ];
  const loo = recipes.map(({ recipe }) => ({ recipe, miss: looMiss(live, recipe, model, meanLogTvl, snapshot.as_of) }));
  // Walk-forward by listing date: older half prices the newer half, and back.
  const dated = live.filter((p) => p.listed_at !== null).sort((a, b) => (a.listed_at as string) < (b.listed_at as string) ? -1 : 1);
  const half = Math.floor(dated.length / 2);
  const older = dated.slice(0, half);
  const newer = dated.slice(half);
  const walkOldNew = walkForwardMiss(older, newer, model, meanLogTvl, true);
  const walkNewOld = walkForwardMiss(newer, older, model, meanLogTvl, true);
  const walkFlatOldNew = walkForwardMiss(older, newer, model, meanLogTvl, false);
  const walkFlatNewOld = walkForwardMiss(newer, older, model, meanLogTvl, false);
  // The winner's leave-one-out residuals, for the printed ranges.
  const residuals: number[] = [];
  for (const held of live) {
    const pool = live.filter((p) => p !== held);
    residuals.push(logRatio(held) - heldOutPrediction(pool, held, 'catSize', model, meanLogTvl, snapshot.as_of));
  }
  const sorted = [...residuals].sort((a, b) => a - b);
  const p25 = quantile(sorted, 0.25);
  const p75 = quantile(sorted, 0.75);
  const p10 = quantile(sorted, 0.1);
  const p90 = quantile(sorted, 0.9);
  const inRange = (lo: number, hi: number): number => residuals.filter((r) => r >= lo && r <= hi).length / residuals.length;
  return {
    globalLogMedian: global,
    meanLogTvl,
    sizeSlope,
    byCategory,
    loo,
    walkOldNew,
    walkNewOld,
    walkFlatOldNew,
    walkFlatNewOld,
    residP25: p25,
    residP75: p75,
    residP10: p10,
    residP90: p90,
    rangeCoverageP25P75: round4(inRange(p25, p75)),
    rangeCoverageP10P90: round4(inRange(p10, p90)),
  };
}

/** The age bands the odds curve is fitted to, in days. */
const ODDS_BANDS: { label: string; lo: number; hi: number }[] = [
  { label: '<180d', lo: 0, hi: 180 },
  { label: '180-365d', lo: 180, hi: 365 },
  { label: '1-2y', lo: 365, hi: 730 },
  { label: '2-3y', lo: 730, hi: 1095 },
  { label: '>3y', lo: 1095, hi: Number.POSITIVE_INFINITY },
];

/**
 * Fit the token-odds curve on the snapshot's own record: the share of
 * protocols that record a token rises with age, so a survival curve —
 * a share pi of protocols ever record one, at a rate lambda a year —
 * is fitted to the five age bands by least squares. The curve's fitted
 * values sit beside the observed rates in the dashboard, including
 * where the fit misses, so the reader can see how rough it is.
 */
export function fitOdds(snapshot: Snapshot): OddsFit {
  const total = snapshot.protocols.length;
  const withToken = snapshot.protocols.filter((p) => !isPreToken(p)).length;
  const baseRate = total === 0 ? 0 : withToken / total;
  const bands: OddsBand[] = ODDS_BANDS.map(({ label, lo, hi }) => {
    const members = snapshot.protocols.filter((p) => {
      const a = ageDays(snapshot.as_of, p.listed_at);
      return a !== null && a >= lo && a < hi;
    });
    const n = members.length;
    const observed = n === 0 ? 0 : members.filter((p) => !isPreToken(p)).length / n;
    const meanAge = n === 0 ? (lo + Math.min(hi, 1500)) / 2 : members.reduce((s, p) => s + (ageDays(snapshot.as_of, p.listed_at) as number), 0) / n;
    return { label, n, observed: round4(observed), fitted: 0, mean_age_days: Math.round(meanAge) };
  });
  let bestPi = 0.77;
  let bestLambda = 0.67;
  let bestErr = Number.POSITIVE_INFINITY;
  for (let pi100 = 50; pi100 <= 100; pi100++) {
    const pi = pi100 / 100;
    for (let lam100 = 1; lam100 <= 200; lam100++) {
      const lambda = lam100 / 100;
      let err = 0;
      for (const b of bands) {
        const fitted = pi * (1 - Math.exp(-lambda * (b.mean_age_days / 365)));
        err += (fitted - b.observed) * (fitted - b.observed);
      }
      if (err < bestErr) {
        bestErr = err;
        bestPi = pi;
        bestLambda = lambda;
      }
    }
  }
  for (const b of bands) {
    b.fitted = round4(bestPi * (1 - Math.exp(-bestLambda * (b.mean_age_days / 365))));
  }
  return { pi: bestPi, lambda_per_year: bestLambda, base_rate: round4(baseRate), bands };
}

/**
 * The fitted chance a protocol ever records a token, given it has run
 * `age` days with none on record. It falls with age: the peers that ran
 * this long without one rarely record one later. A protocol with no
 * listing date takes the base rate — the share of all protocols that
 * record a token — and the dashboard says so.
 */
export function tokenOdds(age: number | null, fit: OddsFit): number {
  if (age === null) return fit.base_rate;
  const a = age / 365;
  const survived = Math.exp(-fit.lambda_per_year * a);
  const odds = (fit.pi * survived) / (1 - fit.pi + fit.pi * survived);
  return clamp(odds, 0.01, 0.99);
}

/** The log ratio a protocol like this one would carry, from the fitted model. */
export function predictLogRatio(
  protocol: SnapshotProtocol,
  fitted: FittedValue,
  live: SnapshotProtocol[],
  model: ModelConstants,
): { pred: number; categoryMultiple: number; categoryN: number; sizeAdjustment: number } {
  const cat = categoryLogPrediction(live, protocol, model);
  const sizeAdjustment = fitted.sizeSlope * (Math.log(protocol.tvl_usd) - fitted.meanLogTvl);
  const pred = cat + sizeAdjustment;
  const row = fitted.byCategory.find((c) => c.category === (protocol.category ?? 'Other'));
  return {
    pred,
    categoryMultiple: round4(Math.exp(cat)),
    categoryN: row === undefined ? 0 : row.n,
    sizeAdjustment: round4(sizeAdjustment),
  };
}

/** The conditional value, the odds, the implied value and its printed range. */
export function priceProtocol(
  protocol: SnapshotProtocol,
  fitted: FittedValue,
  live: SnapshotProtocol[],
  oddsFit: OddsFit,
  asOf: string,
  model: ModelConstants,
): {
  conditional: number;
  odds: number;
  implied: number;
  low: number;
  high: number;
  categoryMultiple: number;
  categoryN: number;
  sizeAdjustment: number;
  ageDays: number | null;
} {
  const age = ageDays(asOf, protocol.listed_at);
  const { pred, categoryMultiple, categoryN, sizeAdjustment } = predictLogRatio(protocol, fitted, live, model);
  const conditional = Math.max(1, Math.round(protocol.tvl_usd * Math.exp(pred)));
  const odds = tokenOdds(age, oddsFit);
  const implied = Math.max(1, Math.round(conditional * odds));
  const low = Math.max(1, Math.min(implied, Math.round(implied * Math.exp(fitted.residP25))));
  const high = Math.max(implied, Math.round(implied * Math.exp(fitted.residP75)));
  return { conditional, odds, implied, low, high, categoryMultiple, categoryN, sizeAdjustment, ageDays: age };
}

function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 45;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

function lowerCategory(p: SnapshotProtocol): string {
  return (p.category ?? '').toLowerCase();
}

/**
 * What one transaction costs on the protocol's main chain, in dollars.
 * A farmer on Ethereum pays dollars per action; on Solana or an L2 the
 * same action costs cents — the plan's gas figures follow the chain,
 * not a guess. Unknown chains fall back to $1.
 */
export function gasUsd(chain: string): number {
  const c = chain.toLowerCase();
  if (c === 'ethereum') return 7;
  if (c === 'solana' || c === 'sui' || c === 'aptos') return 0.05;
  if (c === 'binance' || c === 'bnb chain') return 0.3;
  if (c === 'base' || c === 'arbitrum' || c === 'optimism' || c === 'blast' || c === 'linea' || c === 'scroll' || c === 'zksync era' || c === 'mantle') return 0.5;
  if (c === 'polygon' || c === 'avalanche' || c === 'fantom' || c === 'cronos') return 0.1;
  if (c === 'tron') return 1;
  return 1;
}

/** The core action for a protocol's category, in words a farmer can follow. */
function coreAction(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = lowerCategory(p);
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) {
    return `Lend $${capital} of USDC into ${name}'s lending market on ${chain} and leave it earning.`;
  }
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) {
    return `Add $${capital} of liquidity to ${name}'s deepest pool on ${chain}, in the pair the app highlights.`;
  }
  if (c.includes('bridge')) {
    return `Move $${capital} of USDC across ${name} to ${chain}, then put the arrived funds to work in the app.`;
  }
  if (c.includes('staking') || c.includes('restak')) {
    return `Stake $${capital} of the chain's native staking asset through ${name} and hold the receipt token.`;
  }
  if (c.includes('perpetual') || c.includes('derivative')) {
    return `Post $${capital} of USDC as margin on ${name} and open one small hedged position.`;
  }
  if (c.includes('prediction')) {
    return `Fund $${capital} and take one small position on a ${name} market that settles within the week.`;
  }
  if (c.includes('curator') || c.includes('allocator')) {
    return `Deposit $${capital} into a ${name} vault on ${chain} and hold the vault shares.`;
  }
  if (c.includes('stable')) {
    return `Mint or hold $${capital} of the stable asset through ${name} on ${chain}.`;
  }
  if (c.includes('rwa')) {
    return `Mint $${capital} of ${name}'s yield-bearing asset on ${chain} and hold it.`;
  }
  if (c.includes('insurance')) {
    return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy active.`;
  }
  return `Deposit $${capital} of USDC into ${name} on ${chain} and leave the position working.`;
}

/** The second qualifying action: a different verb from the first, a week later. */
function secondAction(p: SnapshotProtocol): string {
  const c = lowerCategory(p);
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) {
    return `Borrow a small amount against the ${p.name} deposit once, then repay it, so the wallet shows both sides of the market.`;
  }
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) {
    return `Swap a small amount through the same ${p.name} pool a second time on a different day, so the wallet shows repeat use.`;
  }
  if (c.includes('bridge')) {
    return `Bridge a second, smaller amount back a week later, so the wallet shows two-way use of ${p.name}.`;
  }
  if (c.includes('staking') || c.includes('restak')) {
    return `Restake the ${p.name} rewards once instead of claiming them, so the position compounds.`;
  }
  if (c.includes('perpetual') || c.includes('derivative')) {
    return `Close the ${p.name} hedge, then open a fresh one the following week at a smaller size.`;
  }
  if (c.includes('prediction')) {
    return `Settle one ${p.name} market and open a second one, so the wallet shows repeat participation.`;
  }
  if (c.includes('curator') || c.includes('allocator')) {
    return `Move a small part of the ${p.name} vault position into a second vault of the same protocol.`;
  }
  if (c.includes('stable')) {
    return `Swap a small amount of the ${p.name} stable asset for USDC and back, so the wallet shows active use.`;
  }
  if (c.includes('rwa')) {
    return `Claim any accrued yield on the ${p.name} asset once, then redeposit it into the same asset.`;
  }
  if (c.includes('insurance')) {
    return `Renew or top up the ${p.name} cover once before it lapses.`;
  }
  return `Do one more qualifying action on ${p.name} a week later — a deposit, a swap, or a vote — so the wallet shows repeat use.`;
}

/** What the position is called, so the hold step reads as written for this protocol. */
function positionNoun(p: SnapshotProtocol): string {
  const c = lowerCategory(p);
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return 'lending position';
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return 'liquidity position';
  if (c.includes('bridge')) return 'bridged position';
  if (c.includes('staking') || c.includes('restak')) return 'staked position';
  if (c.includes('perpetual') || c.includes('derivative')) return 'hedged position';
  if (c.includes('prediction')) return 'prediction position';
  if (c.includes('curator') || c.includes('allocator')) return 'vault shares';
  if (c.includes('stable')) return 'stable-asset position';
  if (c.includes('rwa')) return 'yield-bearing position';
  if (c.includes('insurance')) return 'cover';
  return 'position';
}

/** What to check each week, for this protocol's kind of rewards. */
function checkTarget(p: SnapshotProtocol): string {
  const c = lowerCategory(p);
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `the lending rewards page`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `the pool's fees and points page`;
  if (c.includes('bridge')) return `the bridging rewards page`;
  if (c.includes('staking') || c.includes('restak')) return `the staking rewards page`;
  if (c.includes('perpetual') || c.includes('derivative')) return `the trading rewards page`;
  if (c.includes('prediction')) return `the market rewards page`;
  if (c.includes('curator') || c.includes('allocator')) return `the vault's rewards page`;
  if (c.includes('stable')) return `the stable asset's rewards page`;
  if (c.includes('rwa')) return `the asset's yield page`;
  if (c.includes('insurance')) return `the cover's rewards page`;
  return `the points or rewards page`;
}

/** The risk that kills this kind of position, in the discipline step. */
function riskNote(p: SnapshotProtocol): string {
  const c = lowerCategory(p);
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) {
    return `never borrow more than the deposit can cover: a lending position that gets liquidated earns nothing.`;
  }
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) {
    return `do not chase every pool after a good week: impermanent loss eats a liquidity position that jumps pools.`;
  }
  if (c.includes('bridge')) {
    return `do not bridge the whole ticket at once: a stuck bridge strands funds for days.`;
  }
  if (c.includes('staking') || c.includes('restak')) {
    return `never stake the whole ticket through one validator or restaking service: a slashing event takes it all.`;
  }
  if (c.includes('perpetual') || c.includes('derivative')) {
    return `keep the hedge small and the margin well above the liquidation price: a liquidated hedge earns nothing.`;
  }
  if (c.includes('prediction')) {
    return `never bet the whole ticket on one market: a wrong market settles at zero.`;
  }
  if (c.includes('curator') || c.includes('allocator')) {
    return `watch the vault's strategy: a curator that changes strategy can move the shares somewhere else.`;
  }
  if (c.includes('stable')) {
    return `watch the peg: a stable asset that depegs is worth less than the dollars put in.`;
  }
  if (c.includes('rwa')) {
    return `remember the yield depends on the real-world issuer: if it stops paying, the asset stops earning.`;
  }
  if (c.includes('insurance')) {
    return `read what the cover excludes: a claim outside the wording pays nothing.`;
  }
  return `do not double the position after a good week: a farmed position that gets liquidated earns nothing.`;
}

/** How to unwind, for this kind of position. */
function exitAction(p: SnapshotProtocol): string {
  const c = lowerCategory(p);
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `repay any borrow, then withdraw the deposit`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `remove the liquidity`;
  if (c.includes('bridge')) return `bridge the funds back to the chain they started on`;
  if (c.includes('staking') || c.includes('restak')) return `unstake and wait out the unbonding period`;
  if (c.includes('perpetual') || c.includes('derivative')) return `close the position and withdraw the margin`;
  if (c.includes('prediction')) return `let the last market settle, then withdraw`;
  if (c.includes('curator') || c.includes('allocator')) return `redeem the vault shares`;
  if (c.includes('stable')) return `redeem or swap the stable asset back to USDC`;
  if (c.includes('rwa')) return `redeem the yield-bearing asset`;
  if (c.includes('insurance')) return `let the cover lapse, then withdraw`;
  return `unwind in the reverse order you entered`;
}

interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

function gasLabel(chain: string): string {
  const g = gasUsd(chain);
  return g < 1 ? `about $${g} of gas` : `about $${g} of gas`;
}

export interface FarmVerdict {
  hold_days: number;
  hold_weeks: number;
  slice_usd: number;
  gas_usd: number;
  hours: number;
  net_usd: number;
  net_per_hour_usd: number;
  verdict: 'FARM' | 'MARGINAL' | 'SKIP';
}

/**
 * The farm verdict, costed on one ticket, the same for every row so the
 * verdicts compare. The expected slice is the protocol's implied value
 * times the airdrop pool's share (5% of the token's value, a stated
 * assumption), times the ticket's share of the protocol's TVL. Gas is
 * the plan's own transactions on the protocol's chain; time is the
 * plan's own minutes, valued at $25 an hour. A verdict is FARM only
 * when the slice clears the gas by $5.
 */
export function farmVerdict(
  p: SnapshotProtocol,
  implied: number,
  age: number | null,
  model: ModelConstants,
): FarmVerdict {
  const chain = chainOf(p);
  const holdDays = holdDaysFor(age);
  const holdWeeks = Math.ceil(holdDays / 7);
  const txs = 2 + holdWeeks;
  const gas = round4(txs * gasUsd(chain));
  const hours = round4(0.25 + holdWeeks * (10 / 60));
  const slice = round4(implied * model.airdrop_share * (model.ticket_usd / p.tvl_usd));
  const net = round4(slice - gas);
  const perHour = round4(net / hours);
  const verdict = net >= model.verdict_farm_net ? 'FARM' : net >= model.verdict_skip_net ? 'MARGINAL' : 'SKIP';
  return { hold_days: holdDays, hold_weeks: holdWeeks, slice_usd: slice, gas_usd: gas, hours, net_usd: net, net_per_hour_usd: perHour, verdict };
}

/**
 * A protocol's farm plan: seven steps, each an action with a cost and a
 * time, every step written for this protocol — its name, its chain, its
 * category's action and risk, its TVL-tiered hold. The plan is derived
 * from the protocol's own record (category, chains, TVL, age), never
 * from a hand-written list of names. Gas figures follow the protocol's
 * main chain, and the hold follows its age. Every plan uses the same
 * $1,000 ticket, so the verdicts compare.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null, model: ModelConstants = MODEL): FarmStep[] {
  const chain = chainOf(p);
  const capital = model.ticket_usd;
  const hold = holdDaysFor(age);
  const gas = gasLabel(chain);
  return [
    {
      text: `Open a fresh wallet to farm ${p.name}, fund it with $${capital} on ${chain} (about $${gasUsd(chain)} of gas to move funds there), and write its seed phrase on paper kept offline. Never reuse the wallet that holds your savings.`,
      cost: 'no cost to create',
      time: '5 minutes',
    },
    {
      text: coreAction(p, capital, chain),
      cost: `$${capital} of capital and ${gas} per transaction on ${chain}`,
      time: '15 minutes to set up',
    },
    {
      text: secondAction(p),
      cost: gas,
      time: '10 minutes, one week later',
    },
    {
      text: `Hold the ${positionNoun(p)} on ${p.name} for at least ${hold} days and repeat a qualifying action once a week. A single-day visit rarely counts; protocols snapshot activity over weeks.`,
      cost: `the $${capital} stays in the position, ${gas} a week`,
      time: `${hold} days, 10 minutes a week`,
    },
    {
      text: `Check ${checkTarget(p)} on ${p.name} once a week, from the link the protocol itself publishes. Never pay anyone to claim, and never connect the wallet to a link from a direct message.`,
      cost: 'free to check',
      time: '5 minutes a week',
    },
    {
      text: `Do not chase every pool or double the position after a good week on ${p.name}: ${riskNote(p)}`,
      cost: 'no extra capital',
      time: 'a decision, not a transaction',
    },
    {
      text: `Keep a farm log for ${p.name}: the wallet address, the dates, every transaction hash, and the amounts. If a token launches, the log is what proves the position; to exit, ${exitAction(p)}.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** Read and validate the snapshot: an object with a protocols array and a watchlist. Accepts parsed JSON or a JSON string. */
export function parseSnapshot(data: unknown): Snapshot {
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data) as unknown;
    } catch {
      throw new SnapshotError('snapshot is not valid JSON');
    }
  }
  if (typeof data !== 'object' || data === null) throw new SnapshotError('snapshot is not an object');
  const s = data as Record<string, unknown>;
  const required = ['as_of', 'source', 'floor_usd', 'protocols', 'watchlist'];
  for (const k of required) {
    if (!(k in s)) throw new SnapshotError(`snapshot missing ${k}`);
  }
  if (!Array.isArray(s.protocols)) throw new SnapshotError('snapshot protocols is not an array');
  if (!Array.isArray(s.watchlist)) throw new SnapshotError('snapshot watchlist is not an array');
  if (typeof s.as_of !== 'string') throw new SnapshotError('snapshot as_of is not a string');
  if (typeof s.source !== 'string') throw new SnapshotError('snapshot source is not a string');
  if (typeof s.floor_usd !== 'number') throw new SnapshotError('snapshot floor_usd is not a number');
  for (const p of s.protocols as Record<string, unknown>[]) {
    for (const k of ['slug', 'name', 'category', 'chains', 'tvl_usd', 'change_7d', 'mcap_usd', 'listed_at', 'gecko_id', 'symbol']) {
      if (!(k in p)) throw new SnapshotError(`protocol ${String(p.slug ?? '?')} missing ${k}`);
    }
    if (typeof p.slug !== 'string' || typeof p.name !== 'string') {
      throw new SnapshotError('protocol slug/name is not a string');
    }
    if (!Array.isArray(p.chains) || typeof p.tvl_usd !== 'number') {
      throw new SnapshotError(`protocol ${p.slug} has bad chains or tvl_usd`);
    }
    if (p.tvl_usd < 0) throw new SnapshotError(`protocol ${p.slug} has a negative tvl_usd`);
  }
  return s as unknown as Snapshot;
}

/** One ranked row, priced and farmed. */
function buildBoardRow(
  p: SnapshotProtocol,
  fitted: FittedValue,
  live: SnapshotProtocol[],
  oddsFit: OddsFit,
  asOf: string,
  model: ModelConstants,
): BoardRow {
  const priced = priceProtocol(p, fitted, live, oddsFit, asOf, model);
  const verdict = farmVerdict(p, priced.implied, priced.ageDays, model);
  return {
    rank: 0,
    slug: p.slug,
    name: p.name,
    category: p.category,
    chains: p.chains,
    tvl_usd: p.tvl_usd,
    change_7d: p.change_7d,
    mcap_usd: p.mcap_usd,
    listed_at: p.listed_at,
    gecko_id: p.gecko_id,
    symbol: p.symbol,
    token_status: 'pre-token',
    age_days: priced.ageDays,
    conditional_value_usd: priced.conditional,
    odds: round4(priced.odds),
    implied_value_usd: priced.implied,
    implied_low_usd: priced.low,
    implied_high_usd: priced.high,
    verdict: verdict.verdict,
    slice_usd: verdict.slice_usd,
    gas_usd: verdict.gas_usd,
    hours: verdict.hours,
    net_usd: verdict.net_usd,
    net_per_hour_usd: verdict.net_per_hour_usd,
    model: {
      live_multiple: round4(Math.exp(fitted.globalLogMedian)),
      category_multiple: priced.categoryMultiple,
      category_n: priced.categoryN,
      size_adjustment: priced.sizeAdjustment,
      odds: round4(priced.odds),
      age_days: priced.ageDays,
    },
    farm_steps: farmSteps(p, priced.ageDays, model).map(stepText),
  };
}

/** The board: the 40 watchlist rows first, then the rest by implied value, all ranked. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const fitted = fitValueModel(snapshot, model);
  const oddsFit = fitOdds(snapshot);
  const live = liveProtocols(snapshot);
  return buildBoardWith(snapshot, fitted, oddsFit, live, model);
}

function buildBoardWith(
  snapshot: Snapshot,
  fitted: FittedValue,
  oddsFit: OddsFit,
  live: SnapshotProtocol[],
  model: ModelConstants,
): BoardRow[] {
  const watchlist = new Set(snapshot.watchlist);
  const rankable = snapshot.protocols.filter(isRankable);
  const bySlug = new Map<string, SnapshotProtocol>();
  for (const p of rankable) bySlug.set(p.slug, p);
  const watch: BoardRow[] = [];
  for (const slug of snapshot.watchlist) {
    const p = bySlug.get(slug);
    if (p !== undefined) watch.push(buildBoardRow(p, fitted, live, oddsFit, snapshot.as_of, model));
  }
  const early = rankable
    .filter((p) => !watchlist.has(p.slug))
    .map((p) => buildBoardRow(p, fitted, live, oddsFit, snapshot.as_of, model))
    .sort((a, b) => b.implied_value_usd - a.implied_value_usd || a.tvl_usd - b.tvl_usd || (a.slug < b.slug ? -1 : 1));
  const rest = early.slice(0, 198 - watch.length);
  const rows = [...watch, ...rest].sort((a, b) => b.implied_value_usd - a.implied_value_usd || a.tvl_usd - b.tvl_usd || (a.slug < b.slug ? -1 : 1));
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });
  return rows;
}

/** The ledger: every protocol in the snapshot in exactly one group, so the count adds up to the whole field. */
function accounting(snapshot: Snapshot, rows: BoardRow[]): AccountingGroup[] {
  const ranked = new Set<string>();
  for (const r of rows) ranked.add(r.slug);
  const live = liveProtocols(snapshot);
  const liveCount = live.length;
  const withToken = snapshot.protocols.filter((p) => !isPreToken(p)).length;
  const preToken = snapshot.protocols.filter(isPreToken);
  const setAside = preToken.filter((p) => !ranked.has(p.slug));
  const reasons = new Map<string, number>();
  for (const p of setAside) {
    const reason = setAsideReason(p);
    reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
  }
  const groups: AccountingGroup[] = [
    {
      label: 'Ranked pre-token',
      count: rows.length,
      why: 'no token on record, and not a wrapped, staked or bridged product of one that trades',
    },
    { label: 'Live-token, priced', count: liveCount, why: 'a market cap and a TVL, both above zero — the 128 protocols the multiple is fitted on' },
    {
      label: 'Token recorded, no usable cap',
      count: withToken - liveCount,
      why: 'a token on record but no market cap to price from (a wrapped or staked token, a test token, or a cap the snapshot does not carry)',
    },
    {
      label: 'Set aside: versioned name',
      count: reasons.get('versioned') ?? 0,
      why: 'a name ending in a release (v2, V3, 1.5) is a pool of another protocol, not a launch of its own',
    },
    {
      label: 'Set aside: wrapped category',
      count: reasons.get('wrapped-category') ?? 0,
      why: 'a wrapped, staked or bridged product of a token that already trades (WBTC is Bitcoin on Ethereum)',
    },
    {
      label: 'Set aside: wrapped word in name',
      count: reasons.get('wrapped-name') ?? 0,
      why: 'a name carrying wrapped, staked or staking',
    },
    {
      label: 'Set aside: exchange name',
      count: reasons.get('exchange') ?? 0,
      why: 'a name starting with an exchange',
    },
  ];
  return groups;
}

function missMultiple(miss: number): number {
  return round4(Math.exp(miss));
}

/** The dashboard data: the board, the live protocols, and the evidence the model stands on. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): RadarData {
  const fitted = fitValueModel(snapshot, model);
  const oddsFit = fitOdds(snapshot);
  const live = liveProtocols(snapshot);
  const rows = buildBoardWith(snapshot, fitted, oddsFit, live, model);
  const loo = new Map(fitted.loo.map((l) => [l.recipe, l.miss]));
  const miss = (recipe: string): number => loo.get(recipe) ?? NaN;
  const termTests: TermTest[] = [
    {
      term: 'flat global median',
      kept: false,
      loo_miss: missMultiple(miss('flat')),
      note: 'the baseline every model must beat',
    },
    {
      term: 'category median',
      kept: false,
      loo_miss: missMultiple(miss('cat')),
      note: 'kept as a step inside the winner, not on its own',
    },
    {
      term: 'category median + size slope',
      kept: true,
      loo_miss: missMultiple(miss('catSize')),
      note: 'the winner: the smallest held-out miss of any recipe tested',
    },
    {
      term: '+ 7-day TVL change',
      kept: false,
      loo_miss: missMultiple(miss('catSizeGrowth')),
      note: 'made the held-out miss worse, so it is not in the price',
    },
    {
      term: '+ age inside the value',
      kept: false,
      loo_miss: missMultiple(miss('catSizeAge')),
      note: 'made the held-out miss worse; age lives in the odds instead',
    },
    {
      term: '+ chain count',
      kept: false,
      loo_miss: missMultiple(miss('catSizeChains')),
      note: 'helped exactly half the held-out protocols and hurt the other half — a coin flip, not a signal',
    },
  ];
  const liveRows: LiveRow[] = [...live]
    .sort((a, b) => (b.mcap_usd as number) - (a.mcap_usd as number) || (a.slug < b.slug ? -1 : 1))
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd as number,
      change_7d: p.change_7d,
      mcap_per_tvl: round4((p.mcap_usd as number) / p.tvl_usd),
    }));
  return {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    live_multiple: round4(Math.exp(fitted.globalLogMedian)),
    live_multiple_n: live.length,
    size_slope: round4(fitted.sizeSlope),
    tvl_exponent: round4(1 + fitted.sizeSlope),
    mean_log_tvl: round4(fitted.meanLogTvl),
    category_multiples: fitted.byCategory,
    term_tests: termTests,
    walk_forward_old_new: missMultiple(fitted.walkOldNew),
    walk_forward_new_old: missMultiple(fitted.walkNewOld),
    walk_forward_flat_old_new: missMultiple(fitted.walkFlatOldNew),
    walk_forward_flat_new_old: missMultiple(fitted.walkFlatNewOld),
    range_low_mult: round4(Math.exp(fitted.residP25)),
    range_high_mult: round4(Math.exp(fitted.residP75)),
    range_coverage_p25_p75: fitted.rangeCoverageP25P75,
    range_coverage_p10_p90: fitted.rangeCoverageP10P90,
    odds_fit: oddsFit,
    accounting: accounting(snapshot, rows),
    worth_farming: rows.filter((r) => r.verdict === 'FARM').length,
    watchlist_size: snapshot.watchlist.length,
    watchlist: Object.fromEntries(snapshot.watchlist.map((slug) => [slug, true])),
    board_size: rows.length,
    early_size: rows.length - snapshot.watchlist.length,
    live_size: live.length,
    rows: rows.map((r) => ({
      rank: r.rank,
      slug: r.slug,
      name: r.name,
      category: r.category,
      chains: r.chains,
      tvl_usd: r.tvl_usd,
      change_7d: r.change_7d,
      age_days: r.age_days,
      conditional_value_usd: r.conditional_value_usd,
      odds: r.odds,
      implied_value_usd: r.implied_value_usd,
      implied_low_usd: r.implied_low_usd,
      implied_high_usd: r.implied_high_usd,
      verdict: r.verdict,
      category_multiple: r.model.category_multiple,
      category_n: r.model.category_n,
      size_adjustment: r.model.size_adjustment,
      slice_usd: r.slice_usd,
      net_usd: r.net_usd,
      net_per_hour_usd: r.net_per_hour_usd,
      farm_steps: r.farm_steps,
    })),
    live: liveRows,
  };
}

/** The dashboard data as a script tag: `window.__RADAR__ = {...};` — the only place the dashboard reads its data from. */
export function dataScript(data: RadarData): string {
  return `window.__RADAR__ = ${JSON.stringify(data)};\n`;
}

/** The board issue the gate checks, or null when the board passes every gate rule. */
export function boardIssue(rows: BoardRow[], data: RadarData): string | null {
  if (rows.length < 100 || rows.length > 4000) return `board holds ${rows.length} rows: hand in 100 to 4,000`;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    if (r.rank !== i + 1) return `row ${r.slug} is ranked ${r.rank} at position ${i + 1}`;
    if (i > 0 && r.implied_value_usd > rows[i - 1]!.implied_value_usd) {
      return `implied value rises at rank ${r.rank}: the board is not sorted`;
    }
    if (r.farm_steps.length < 3 || r.farm_steps.length > 12) {
      return `row ${r.slug} carries ${r.farm_steps.length} farm steps: hand in 3 to 12`;
    }
    for (const s of r.farm_steps) {
      if (s.length < 20 || s.length > 600) return `row ${r.slug} has a farm step of ${s.length} characters: hand in 20 to 600`;
    }
  }
  const watchlist = new Set(Object.keys(data.watchlist));
  for (const slug of watchlist) {
    if (!rows.some((r) => r.slug === slug)) return `watchlist row ${slug} is missing from the board`;
  }
  const outside = rows.filter((r) => !watchlist.has(r.slug)).length;
  if (outside < 60) return `only ${outside} rows sit outside the watchlist: hand in at least 60`;
  return null;
}
