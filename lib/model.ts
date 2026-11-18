// Launch Radar — the value model and the farm plans.
//
// One snapshot in, one ranked board out. Every number below is computed
// from the snapshot's own figures; no protocol name is ever special-cased.
//
// The model ("radar-2") in one line:
//
//   implied = TVL x M x G x A x B
//
//   M  live-market multiple: the median mcap/TVL across the snapshot's own
//      live-token protocols (both figures above zero), clamped to
//      [0.05, 0.60]. The market itself sets the price of a dollar of TVL;
//      the entry never hardcodes it.
//   G  growth factor: the 7-day TVL change, clamped to [-40, +80] per cent.
//      Rises are weighted 0.55, falls 0.85 — a drawdown bites harder than a
//      rally lifts — and the factor is clamped to [0.55, 1.45].
//   A  age factor: how long the protocol has run with no token on record.
//      0.55 + 0.45 x (1 - exp(-age_days / 400)), so a protocol listed years
//      ago scores near 1.00 and a newcomer near 0.55. Unknown age counts
//      as 180 days.
//   B  breadth factor: 1 + 0.03 x min(chains - 1, 4). A protocol live on
//      more chains has a wider surface to farm and to launch from.
//
// The board ranks every rankable pre-token protocol: the 40 watchlist
// slugs plus every other pre-token protocol below the floor that is not a
// CEX and not a versioned pool. Live-token protocols are set aside with
// their market caps and mcap/TVL ratios — the market's own numbers, never
// a model's — so the reader can see what the multiple M is measured from.

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
  multiple_floor: number;
  multiple_cap: number;
  growth_floor: number;
  growth_cap: number;
  growth_up_weight: number;
  growth_down_weight: number;
  growth_factor_floor: number;
  growth_factor_cap: number;
  age_floor: number;
  age_range: number;
  age_scale_days: number;
  unknown_age_days: number;
  breadth_per_chain: number;
  breadth_max_chains: number;
}

export const MODEL: ModelConstants = {
  multiple_floor: 0.05,
  multiple_cap: 0.6,
  growth_floor: -40,
  growth_cap: 80,
  growth_up_weight: 0.55,
  growth_down_weight: 0.85,
  growth_factor_floor: 0.55,
  growth_factor_cap: 1.45,
  age_floor: 0.55,
  age_range: 0.45,
  age_scale_days: 400,
  unknown_age_days: 180,
  breadth_per_chain: 0.03,
  breadth_max_chains: 4,
};

export const MODEL_VERSION = 'radar-2';

/** How many live-token protocols the dashboard's Live view carries, by market cap. */
export const LIVE_ROWS = 24;

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
  implied_value_usd: number;
  model: {
    live_multiple: number;
    growth_pct: number;
    growth_factor: number;
    age_factor: number;
    breadth_factor: number;
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
  implied_value_usd: number;
  growth_factor: number;
  age_factor: number;
  breadth_factor: number;
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

export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  live_multiple: number;
  live_multiple_n: number;
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

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
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

/**
 * The live-market multiple M: the median market-cap-per-TVL across the
 * snapshot's live-token protocols with both figures above zero, clamped
 * to the model's floor and cap. Returns the multiple and how many live
 * protocols it was measured from.
 */
export function liveMultiple(snapshot: Snapshot, model: ModelConstants): { multiple: number; n: number } {
  const ratios = snapshot.protocols
    .filter((p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0)
    .map((p) => (p.mcap_usd as number) / p.tvl_usd)
    .sort((a, b) => a - b);
  if (ratios.length === 0) return { multiple: 0.2, n: 0 };
  const mid = Math.floor(ratios.length / 2);
  const median = ratios.length % 2 === 1 ? ratios[mid]! : (ratios[mid - 1]! + ratios[mid]!) / 2;
  return { multiple: clamp(median, model.multiple_floor, model.multiple_cap), n: ratios.length };
}

/** The growth factor G from a protocol's 7-day TVL change. */
export function growthFactor(change7d: number | null, model: ModelConstants): { pct: number; factor: number } {
  const pct = clamp(finite(change7d, 0), model.growth_floor, model.growth_cap);
  const weight = pct >= 0 ? model.growth_up_weight : model.growth_down_weight;
  const factor = clamp(1 + (pct / 100) * weight, model.growth_factor_floor, model.growth_factor_cap);
  return { pct, factor };
}

/** The age factor A from days listed with no token on record. */
export function ageFactor(age: number | null, model: ModelConstants): number {
  const days = age ?? model.unknown_age_days;
  return model.age_floor + model.age_range * (1 - Math.exp(-Math.max(0, days) / model.age_scale_days));
}

/** The breadth factor B from how many chains the protocol runs on. */
export function breadthFactor(chains: string[], model: ModelConstants): number {
  const extra = Math.min(Math.max(chains.length - 1, 0), model.breadth_max_chains);
  return 1 + extra * model.breadth_per_chain;
}

/** All four factors and the implied value one protocol gets. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  multiple: number,
  model: ModelConstants,
): { implied: number; growthPct: number; growth: number; age: number; breadth: number; ageDays: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const { pct, factor: growth } = growthFactor(protocol.change_7d, model);
  const ageF = ageFactor(age, model);
  const breadth = breadthFactor(protocol.chains, model);
  const implied = Math.max(1, Math.round(protocol.tvl_usd * multiple * growth * ageF * breadth));
  return { implied, growthPct: pct, growth, age: ageF, breadth, ageDays: age };
}

function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** The capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
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
    return `Borrow a small amount against the deposit once, then repay it, so the wallet shows both sides of the market.`;
  }
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) {
    return `Swap a small amount through the same pool a second time on a different day, so the wallet shows repeat use.`;
  }
  if (c.includes('bridge')) {
    return `Bridge a second, smaller amount back a week later, so the wallet shows two-way use.`;
  }
  if (c.includes('staking') || c.includes('restak')) {
    return `Restake the rewards once instead of claiming them, so the position compounds.`;
  }
  if (c.includes('perpetual') || c.includes('derivative')) {
    return `Close the hedge, then open a fresh one the following week at a smaller size.`;
  }
  if (c.includes('prediction')) {
    return `Settle one market and open a second one, so the wallet shows repeat participation.`;
  }
  if (c.includes('curator') || c.includes('allocator')) {
    return `Move a small part of the vault position into a second vault of the same protocol.`;
  }
  if (c.includes('stable')) {
    return `Swap a small amount of the stable asset for USDC and back, so the wallet shows active use.`;
  }
  if (c.includes('rwa')) {
    return `Claim any accrued yield once, then redeposit it into the same asset.`;
  }
  if (c.includes('insurance')) {
    return `Renew or top up the cover once before it lapses.`;
  }
  return `Do one more qualifying action a week later — a deposit, a swap, or a vote — so the wallet shows repeat use.`;
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

/**
 * A protocol's farm plan: six steps, each an action with a cost and a
 * time. The plan is derived from the protocol's own record (category,
 * chains, TVL, age), never from a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  return [
    {
      text: `Open a fresh wallet that holds only the funds you will farm with, and write its seed phrase on paper kept offline. Never reuse the wallet that holds your savings.`,
      cost: 'no cost to create',
      time: '5 minutes',
    },
    {
      text: coreAction(p, capital, chain),
      cost: `$${capital} of capital and about $${capital >= 150 ? 8 : 4} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: secondAction(p),
      cost: 'about $2 of gas',
      time: '10 minutes, one week later',
    },
    {
      text: `Keep the position open for at least ${hold} days and repeat a qualifying action once a week. A single-day visit rarely counts; protocols snapshot activity over weeks.`,
      cost: `the $${capital} stays in the position, about $2 of gas a week`,
      time: `${hold} days, 10 minutes a week`,
    },
    {
      text: `Check ${p.name}'s own points or rewards page once a week, from the link the protocol itself publishes. Never pay anyone to claim, and never connect the wallet to a link from a direct message.`,
      cost: 'free to check',
      time: '5 minutes a week',
    },
    {
      text: `Keep a farm log: the wallet address, the dates, every transaction hash, and the amounts. If a token launches, the log is what proves the position; to exit, unwind in the reverse order you entered.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; multiple: number; multipleN: number } {
  const { multiple, n } = liveMultiple(snapshot, model);
  const index = new Map(snapshot.protocols.map((p) => [p.slug, p]));
  const chosen = new Map<string, SnapshotProtocol>();
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: every other rankable pre-token protocol, not just the
  // biggest few — the board is the whole field the radar can see.
  for (const p of snapshot.protocols) {
    if (!chosen.has(p.slug) && isRankable(p)) chosen.set(p.slug, p);
  }
  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, multiple, model);
    return { p, ...v };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  const board: BoardRow[] = scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.ageDays,
    implied_value_usd: s.implied,
    model: {
      live_multiple: round4(multiple),
      growth_pct: round4(s.growthPct),
      growth_factor: round4(s.growth),
      age_factor: round4(s.age),
      breadth_factor: round4(s.breadth),
      age_days: s.ageDays,
    },
    farm_steps: farmSteps(s.p, s.ageDays).map(stepText),
  }));
  return { board, multiple, multipleN: n };
}

/** The live-token protocols, by market cap, with the ratio the multiple is measured from. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX' && p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0)
    .sort((a, b) => (b.mcap_usd as number) - (a.mcap_usd as number) || b.tvl_usd - a.tvl_usd)
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
}

/** A board row's compact form for data.js: the farm plan travels with it, so the page never re-derives it. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    growth_factor: row.model.growth_factor,
    age_factor: row.model.age_factor,
    breadth_factor: row.model.breadth_factor,
    farm_steps: row.farm_steps,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const { board, multiple, multipleN } = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    live_multiple: round4(multiple),
    live_multiple_n: multipleN,
    watchlist_size: snapshot.watchlist.length,
    watchlist: Object.fromEntries(snapshot.watchlist.map((s) => [s, true])) as Record<string, true>,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  if (board.length < 100) return `the board holds ${board.length} rows, fewer than the gate's 100`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.trim().length < 20 || s.trim().length > 600) return `${r.slug} has a farm step of ${s.trim().length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
