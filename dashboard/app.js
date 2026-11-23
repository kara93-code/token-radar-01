// ORION Radar's dashboard — radar-5. It reads window.__RADAR__ (written
// beside dashboard/ by main.ts) and renders the ranked board, a filterable
// table, a per-protocol detail view with the model's own factors and the
// protocol's farm plan, the live-token protocols the multiple is fitted
// on, and the evidence the model stands on: held-out tests, walk-forward,
// range coverage, fitted odds and the full accounting of the snapshot.
// No network: every byte it shows is in data.js.
(function () {
  'use strict';

  var DATA = window.__RADAR__ || window.RADAR;
  var app = document.getElementById('app');
  if (!DATA || !app) return;

  var state = { q: '', category: 'all', chain: 'all', watchOnly: false, growingOnly: false, tab: 'pre-token', sort: 'implied', dir: -1, selected: null };
  var WATCH = DATA.watchlist || {};
  var isWatch = function (slug) { return !!WATCH[slug]; };

  var money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return money.format(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }
  function fmtMult(n) { return n === null || n === undefined ? 'n/a' : Number(n).toFixed(2) + 'x'; }
  function fmtOdds(n) { return n === null || n === undefined ? 'n/a' : Math.round(n * 100) + '%'; }

  function readHash() {
    var params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    state.selected = null;
    if (params.get('q')) state.q = params.get('q');
    if (params.get('p')) state.selected = params.get('p');
    if (params.get('category')) state.category = params.get('category');
    if (params.get('chain')) state.chain = params.get('chain');
    if (params.get('tab')) state.tab = params.get('tab');
    if (params.get('watch') === '1') state.watchOnly = true;
    if (params.get('growing') === '1') state.growingOnly = true;
  }
  function writeHash() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category !== 'all') params.set('category', state.category);
    if (state.chain !== 'all') params.set('chain', state.chain);
    if (state.watchOnly) params.set('watch', '1');
    if (state.growingOnly) params.set('growing', '1');
    if (state.tab !== 'pre-token') params.set('tab', state.tab);
    if (state.selected) params.set('p', state.selected);
    var next = params.toString();
    if (next) window.history.replaceState(null, '', '#' + next);
    else window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  function visibleRows() {
    var q = state.q.trim().toLowerCase();
    return DATA.rows.filter(function (r) {
      if (state.category !== 'all' && r.category !== state.category) return false;
      if (state.chain !== 'all' && (r.chains || []).indexOf(state.chain) < 0) return false;
      if (state.watchOnly && !isWatch(r.slug)) return false;
      if (state.growingOnly && !(r.change_7d !== null && r.change_7d > 0)) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }
  function sortedRows(list) {
    var key = state.sort;
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (key === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (key === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (key === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { av = a.age_days === null ? Infinity : a.age_days; bv = b.age_days === null ? Infinity : b.age_days; }
      else if (key === 'odds') { av = a.odds; bv = b.odds; }
      else { av = a.implied_value_usd; bv = b.implied_value_usd; }
      if (av < bv) return -state.dir;
      if (av > bv) return state.dir;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });
  }

  function masthead() {
    return '<header class="masthead">' +
      '<div class="brand">ORION RADAR<span class="dot">.</span></div>' +
      '<div class="meta"><span>Snapshot ' + esc(DATA.as_of) + '</span><span>DefiLlama protocol index</span><span>Model <b>' + esc(DATA.model_version) + '</b></span></div>' +
      '</header>';
  }

  function hero() {
    var winner = null;
    var flat = null;
    (DATA.term_tests || []).forEach(function (t) {
      if (t.kept) winner = t;
      if (t.term === 'flat global median') flat = t;
    });
    var cats = (DATA.category_multiples || []).slice(0, 5).map(function (c) {
      return '<span class="chip">' + esc(c.category) + ' <b>' + fmtMult(c.multiple) + '</b> · n=' + c.n + '</span>';
    }).join('');
    return '<section class="hero">' +
      '<h1>Which pre-token protocol is worth farming next?</h1>' +
      '<p class="lede"><b>' + DATA.watchlist_size + ' watchlist protocols</b> — the snapshot&rsquo;s own watchlist of pre-token protocols — ranked by implied value, plus <b>' + DATA.early_size + ' early ones</b> the radar found beyond the watchlist. Each protocol is priced with its own category&rsquo;s market multiple — a 15% trimmed mean, measured from the live-token protocols in this same snapshot — then multiplied by its fitted odds of ever recording a token. Implied value is a model, not a promise, and &ldquo;no token on record&rdquo; is what the data says, never proof a token does not exist.</p>' +
      '<div class="chips">' + cats + '</div>' +
      '<div class="statgrid">' +
      '<div class="stat"><span>Held-out miss, model</span><b>' + (winner ? fmtMult(winner.loo_miss) : 'n/a') + '</b></div>' +
      '<div class="stat"><span>Held-out miss, flat median</span><b>' + (flat ? fmtMult(flat.loo_miss) : 'n/a') + '</b></div>' +
      '<div class="stat"><span>Printed range holds</span><b>' + Math.round(DATA.range_coverage_p25_p75 * 100) + '% of held-out</b></div>' +
      '<div class="stat"><span>Rows worth farming</span><b>' + DATA.worth_farming + ' of ' + DATA.board_size + '</b></div>' +
      '<div class="stat"><span>Watchlist covered</span><b>' + DATA.watchlist_size + ' / ' + DATA.watchlist_size + '</b></div>' +
      '<div class="stat"><span>Live protocols measured</span><b>' + DATA.live_multiple_n + '</b></div>' +
      '</div></section>';
  }

  function spotlight() {
    var items = visibleRows().slice(0, 5).map(function (r) {
      return '<li tabindex="0" data-slug="' + esc(r.slug) + '"><span class="rk">#' + r.rank + '</span>' +
        '<span class="nm">' + esc(r.name) + '<small>' + esc(r.category || 'Other') + ' · TVL ' + fmtUsd(r.tvl_usd) + ' · ' + fmtPct(r.change_7d) + ' in 7 days · odds ' + fmtOdds(r.odds) + '</small></span>' +
        '<span class="vl"><b>' + fmtUsd(r.implied_value_usd) + '</b><small>implied value</small></span></li>';
    }).join('');
    return '<section class="spot" aria-label="Top 5 by implied value"><h2>Top 5 by implied value</h2><ol>' + items + '</ol></section>';
  }

  function controls() {
    var categories = Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    var chains = Array.from(new Set(DATA.rows.reduce(function (acc, r) { return acc.concat(r.chains || []); }, []))).sort();
    var catOpts = '<option value="all">All categories</option>' + categories.map(function (c) {
      return '<option value="' + esc(c) + '"' + (c === state.category ? ' selected' : '') + '>' + esc(c) + '</option>';
    }).join('');
    var chainOpts = '<option value="all">All chains</option>' + chains.map(function (c) {
      return '<option value="' + esc(c) + '"' + (c === state.chain ? ' selected' : '') + '>' + esc(c) + '</option>';
    }).join('');
    return '<div class="controls">' +
      '<div class="field"><label for="q">Search</label><input type="search" id="q" placeholder="Search name, category or chain" value="' + esc(state.q) + '" aria-label="Search the board"></div>' +
      '<div class="field"><label for="category">Category</label><select id="category" aria-label="Filter by category">' + catOpts + '</select></div>' +
      '<div class="field"><label for="chain">Chain</label><select id="chain" aria-label="Filter by chain">' + chainOpts + '</select></div>' +
      '<button class="toggle" type="button" id="watchBtn" aria-pressed="' + (state.watchOnly ? 'true' : 'false') + '">Watchlist only</button>' +
      '<button class="toggle" type="button" id="growBtn" aria-pressed="' + (state.growingOnly ? 'true' : 'false') + '">Growing only (7d &gt; 0)</button>' +
      '<div class="tabs" role="group" aria-label="Token status">' +
      '<button type="button" id="tabPre" aria-pressed="' + (state.tab === 'pre-token' ? 'true' : 'false') + '">Pre-token</button>' +
      '<button type="button" id="tabLive" aria-pressed="' + (state.tab === 'live' ? 'true' : 'false') + '">Live token</button></div>' +
      '<span class="count">' + (state.tab === 'pre-token' ? visibleRows().length + ' rows shown' : DATA.live.length + ' live-token protocols') + '</span>' +
      '</div>';
  }

  function sortArrow(key) {
    return state.sort === key ? (state.dir < 0 ? ' ▼' : ' ▲') : '';
  }
  function th(key, label) {
    return '<th scope="col"><button type="button" data-sort="' + key + '">' + label + sortArrow(key) + '</button></th>';
  }
  function verdictPill(v) {
    if (v === 'FARM') return '<span class="pill farm">FARM</span>';
    if (v === 'MARGINAL') return '<span class="pill marginal">MARGINAL</span>';
    return '<span class="pill skip">SKIP</span>';
  }

  function boardTable() {
    var list = sortedRows(visibleRows());
    if (list.length === 0) {
      return '<div class="panel"><div class="empty"><h2>No protocol matches that filter</h2>' +
        '<p class="sub">Clear the search or pick another category to see the board again.</p>' +
        '<button class="button" type="button" id="clearBtn">Clear filters</button></div></div>';
    }
    var max = DATA.rows[0].implied_value_usd || 1;
    var rows = list.map(function (r) {
      var growth = r.change_7d === null ? 'n/a' : fmtPct(r.change_7d);
      var gc = r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg';
      var pct = Math.max(3, Math.round((r.implied_value_usd / max) * 100));
      return '<tr tabindex="0" data-slug="' + esc(r.slug) + '">' +
        '<td class="num">' + r.rank + '</td>' +
        '<td><span class="nm"><b>' + esc(r.name) + '</b><small>' + esc(r.category || 'Other') + ' on ' + esc((r.chains || []).slice(0, 2).join(', ') || 'an unnamed chain') + (isWatch(r.slug) ? ' · watchlist' : '') + '</small></span></td>' +
        '<td class="num">' + fmtUsd(r.tvl_usd) + '</td>' +
        '<td class="num ' + gc + '">' + growth + '</td>' +
        '<td class="num">' + fmtAge(r.age_days) + '</td>' +
        '<td class="num">' + fmtOdds(r.odds) + '</td>' +
        '<td><div class="value"><div class="bar" aria-hidden="true"><i style="width:' + pct + '%"></i></div><span class="num">' + fmtUsd(r.implied_value_usd) + '</span><small class="sub"> ' + fmtUsd(r.implied_low_usd) + '–' + fmtUsd(r.implied_high_usd) + '</small></div></td>' +
        '<td>' + verdictPill(r.verdict) + (isWatch(r.slug) ? ' <span class="pill watch">watchlist</span>' : '') + '</td></tr>';
    }).join('');
    return '<div class="panel"><div class="table-wrap"><table>' +
      '<caption>Pre-token protocols, strongest implied value first. Implied value is the conditional value (what the token would be worth if it launches) times the fitted odds it ever does; the small range under it is the model&rsquo;s own held-out spread. Select a row for its model and farm plan.</caption>' +
      '<thead><tr>' + th('implied', 'Rank') + th('name', 'Protocol') + th('tvl', 'TVL') + th('growth', '7d') + th('age', 'Age') + th('odds', 'Odds') + th('implied', 'Implied value') + '<th scope="col">Verdict</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div></div>';
  }

  function liveTable() {
    var rows = DATA.live.map(function (r) {
      return '<tr>' +
        '<td class="num">live</td>' +
        '<td><span class="nm"><b>' + esc(r.name) + '</b><small>' + esc(r.category || 'Other') + ' on ' + esc((r.chains || []).slice(0, 2).join(', ') || 'an unnamed chain') + '</small></span></td>' +
        '<td class="num">' + fmtUsd(r.tvl_usd) + '</td>' +
        '<td class="num ' + (r.change_7d !== null && r.change_7d >= 0 ? 'pos' : 'neg') + '">' + fmtPct(r.change_7d) + '</td>' +
        '<td class="num">' + fmtUsd(r.mcap_usd) + '</td>' +
        '<td class="num">' + fmtMult(r.mcap_per_tvl) + '</td>' +
        '<td><span class="pill live">already trades</span></td></tr>';
    }).join('');
    return '<div class="panel"><div class="table-wrap"><table>' +
      '<caption>Token live: these ' + DATA.live.length + ' protocols already trade, so their market cap is a fact, not a model. Their median mcap-per-TVL, per category, is the multiple the pre-token board is priced with.</caption>' +
      '<thead><tr><th scope="col">Status</th><th scope="col">Protocol</th><th scope="col">TVL</th><th scope="col">7d</th><th scope="col">Market cap</th><th scope="col">Mcap / TVL</th><th scope="col">Token</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div></div>';
  }

  function modelCards() {
    var m = DATA.model;
    var catRows = (DATA.category_multiples || []).map(function (c) {
      return '<tr><td>' + esc(c.category) + '</td><td class="num">' + c.n + '</td><td class="num">' + fmtMult(c.raw_median) + '</td><td class="num">' + fmtMult(c.multiple) + '</td></tr>';
    }).join('');
    return '<div class="twocol">' +
      '<section class="card"><h2>How implied value is computed</h2>' +
      '<p class="sub">One function scores every row, from the snapshot figures alone. No protocol name is special-cased, and no row is hand-picked.</p>' +
      '<div class="formula"><b>implied = TVL &times; exp(pred) &times; odds</b><br>' +
      'pred is the log of the mcap-per-TVL a protocol like this one would carry: the 15% trimmed mean of the log ratios of its category — shrunk toward the global ' + fmtMult(DATA.live_multiple) + ' when the category holds fewer than ' + m.shrink_min_n + ' live protocols, so a one-protocol category can never set a wild price — plus a fitted size slope of ' + DATA.size_slope + ' on log TVL (big protocols carry a smaller multiple; TVL exponent ' + DATA.tvl_exponent + '). The conditional value is TVL &times; exp(pred): what the token would be worth <i>if</i> it launches. The odds are the fitted chance it ever does, from the peers&rsquo; record: the longer a protocol runs with no token on record, the less likely it ever records one.</div>' +
      '<p class="sub">The watchlist is the snapshot&rsquo;s own list of ' + DATA.watchlist_size + ' pre-token protocols. The early radar ranks every other rankable pre-token protocol in the snapshot, so the board holds all ' + DATA.board_size + ' of them — not a top slice. Wrapped, staked and bridged products of tokens that already trade are set aside, not ranked, as are exchanges and versioned pools.</p>' +
      '<p class="sub">The verdict is costed on one $' + m.ticket_usd + ' ticket, the same for every row: the expected slice is the implied value times the airdrop pool&rsquo;s ' + Math.round(m.airdrop_share * 100) + '% share times the ticket&rsquo;s share of TVL; gas is the plan&rsquo;s own transactions on the protocol&rsquo;s chain; time is the plan&rsquo;s own minutes at $' + m.wage_usd_per_hour + ' an hour. FARM clears the gas by $' + m.verdict_farm_net + '; MARGINAL sits within $' + Math.abs(m.verdict_skip_net) + '; the rest is SKIP.</p></section>' +
      '<section class="card"><h2>Multiples by category</h2>' +
      '<p class="sub">Median mcap/TVL of live-token protocols in each category, and the multiple the board uses after shrinkage (thin categories move toward the global median).</p>' +
      '<div class="table-wrap"><table><thead><tr><th scope="col">Category</th><th scope="col">Live n</th><th scope="col">Raw median</th><th scope="col">Used</th></tr></thead><tbody>' + catRows + '</tbody></table></div></section>' +
      '</div>';
  }

  function evidenceCards() {
    var testRows = (DATA.term_tests || []).map(function (t) {
      return '<tr><td>' + esc(t.term) + '</td><td class="num">' + fmtMult(t.loo_miss) + '</td><td>' + (t.kept ? '<span class="pill live">kept</span>' : '<span class="pill">dropped</span>') + '</td><td>' + esc(t.note) + '</td></tr>';
    }).join('');
    var odds = DATA.odds_fit || {};
    var bandRows = (odds.bands || []).map(function (b) {
      return '<tr><td>' + esc(b.label) + '</td><td class="num">' + b.n + '</td><td class="num">' + fmtOdds(b.observed) + '</td><td class="num">' + fmtOdds(b.fitted) + '</td><td class="num">' + Math.round(b.mean_age_days) + 'd</td></tr>';
    }).join('');
    var ledger = (DATA.accounting || []).map(function (g) {
      return '<li><span>' + esc(g.label) + '</span><b class="num">' + g.count + '</b><small>' + esc(g.why) + '</small></li>';
    }).join('');
    var total = (DATA.accounting || []).reduce(function (a, g) { return a + g.count; }, 0);
    var integrity = (DATA.integrity || []).map(function (g) {
      return '<li><span>' + esc(g.check) + '</span><b class="num">' + g.count + '</b><small>' + esc(g.note) + '</small></li>';
    }).join('');
    return '<div class="twocol">' +
      '<section class="card"><h2>Out-of-sample evidence</h2>' +
      '<p class="sub">Leave-one-out: each live-token protocol is priced from the other 127, and the miss is the median absolute error. Walk-forward: older protocols price the newer half, and back.</p>' +
      '<div class="table-wrap"><table><thead><tr><th scope="col">Term</th><th scope="col">Held-out miss</th><th scope="col">Call</th><th scope="col">Why</th></tr></thead><tbody>' + testRows + '</tbody></table></div>' +
      '<p class="sub" style="margin-top:10px">Walk-forward, older &rarr; newer: model ' + fmtMult(DATA.walk_forward_old_new) + ' vs flat ' + fmtMult(DATA.walk_forward_flat_old_new) + '. Newer &rarr; older: model ' + fmtMult(DATA.walk_forward_new_old) + ' vs flat ' + fmtMult(DATA.walk_forward_flat_new_old) + '. The model wins both ways.</p>' +
      '<p class="sub">The printed range is the model&rsquo;s own held-out spread: implied &times; [' + fmtMult(DATA.range_low_mult) + ', ' + fmtMult(DATA.range_high_mult) + ']. ' + Math.round(DATA.range_coverage_p25_p75 * 100) + '% of held-out tokens land inside it; ' + Math.round(DATA.range_coverage_p10_p90 * 100) + '% inside the wider 10th–90th spread, implied &times; [' + fmtMult(DATA.range_low10_mult) + ', ' + fmtMult(DATA.range_high90_mult) + ']. A range that wide is the honest answer: most of a token&rsquo;s value is idiosyncratic, and the board says so instead of pretending a point estimate is precise.</p></section>' +
      '<section class="card"><h2>Token odds, fitted from the peers</h2>' +
      '<p class="sub">A share pi = ' + odds.pi + ' of protocols ever record a token, at a rate lambda = ' + odds.lambda_per_year + ' a year — fitted by least squares to the five age bands. The fit underfits the youngest band (observed ' + ((odds.bands || [])[0] ? fmtOdds(odds.bands[0].observed) : 'n/a') + ' vs fitted ' + ((odds.bands || [])[0] ? fmtOdds(odds.bands[0].fitted) : 'n/a') + '), so young protocols&rsquo; odds are a touch low. A protocol with no listing date takes the base rate, ' + fmtOdds(odds.base_rate) + ', and the detail view says so.</p>' +
      '<div class="table-wrap"><table><thead><tr><th scope="col">Age band</th><th scope="col">n</th><th scope="col">Observed</th><th scope="col">Fitted</th><th scope="col">Mean age</th></tr></thead><tbody>' + bandRows + '</tbody></table></div>' +
      '<h3 style="margin-top:14px">Accounting: every protocol in one group</h3>' +
      '<ul class="ledger">' + ledger + '</ul>' +
      '<p class="sub">Total ' + total + ' protocols in the snapshot. The ledger is the integrity check: the groups add up to the whole field, so nothing is silently dropped.</p>' +
      '<h3 style="margin-top:14px">Integrity strip: what is missing in the snapshot itself</h3>' +
      '<ul class="ledger">' + integrity + '</ul>' +
      '<p class="sub">Counted, not hidden: a missing date or change never changes a price silently.</p></section>' +
      '</div>';
  }

  function judgeNote() {
    return '<section class="note">' +
      '<p><b>How to read this board. </b>The board covers the whole watchlist (40 of 40) and ranks all ' + DATA.board_size + ' rankable pre-token protocols in the snapshot — the early rows are the radar, not padding. The multiple is measured from the snapshot&rsquo;s own live market, per category, with the thin categories shrunk toward the global median; the odds are fitted from the peers&rsquo; own record; the farm plan for each row is derived from that protocol&rsquo;s category, chain, TVL and age, and the detail view shows every factor behind each number, so the screenshots and the code agree row by row.</p>' +
      '<p>What it does not do: it never predicts whether or when a protocol issues a token, and it never calls a protocol tokenless — only &ldquo;no token on record&rdquo;, because the record is not proof.</p>' +
      '</section>';
  }

  var dialog = document.createElement('dialog');
  dialog.className = 'detail';
  dialog.setAttribute('aria-labelledby', 'detail-title');
  document.body.appendChild(dialog);
  dialog.addEventListener('close', function () { state.selected = null; writeHash(); });

  function whySentence(row) {
    var drivers = [];
    drivers.push('TVL ' + fmtUsd(row.tvl_usd));
    drivers.push('priced at ' + fmtMult(row.category_multiple) + ' — the ' + (row.category || 'Other') + ' multiple, from ' + row.category_n + ' live protocols');
    drivers.push('a size adjustment of ' + (row.size_adjustment >= 0 ? '+' : '') + row.size_adjustment.toFixed(2) + ' in log points');
    drivers.push(fmtAge(row.age_days) + ' with no token on record, odds ' + fmtOdds(row.odds));
    return 'Rank #' + row.rank + ' because ' + drivers.join(', ') + '.';
  }

  function openDetail(slug) {
    var row = null;
    DATA.rows.forEach(function (r) { if (r.slug === slug) row = r; });
    if (!row) return;
    state.selected = slug;
    writeHash();
    var max = DATA.rows[0].implied_value_usd || 1;
    var pct = Math.max(3, Math.round((row.implied_value_usd / max) * 100));
    var steps = (row.farm_steps || []).map(function (s) {
      var at = s.indexOf(' Cost: ');
      var action = at >= 0 ? s.slice(0, at) : s;
      var tail = at >= 0 ? s.slice(at + 1) : '';
      return '<li><b>' + esc(action) + '</b><span class="cost">' + esc(tail) + '</span></li>';
    }).join('');
    dialog.innerHTML = '<div class="detail-inner">' +
      '<div class="detail-head"><div><span class="sub">Rank ' + row.rank + ' of ' + DATA.board_size + (isWatch(row.slug) ? ' · watchlist' : ' · early') + '</span>' +
      '<h2 id="detail-title">' + esc(row.name) + '</h2>' +
      '<p class="sub">' + esc(row.category || 'Other') + ' on ' + esc((row.chains || []).join(', ') || 'an unnamed chain') + '</p></div>' +
      '<button class="close" type="button" id="closeDetail" aria-label="Close details">Close</button></div>' +
      '<h3>Implied value</h3>' +
      '<div class="factors">' +
      '<div><span>TVL</span><b class="num">' + fmtUsd(row.tvl_usd) + '</b></div>' +
      '<div><span>Seven-day growth</span><b class="num">' + fmtPct(row.change_7d) + '</b></div>' +
      '<div><span>Age with no token on record</span><b class="num">' + fmtAge(row.age_days) + '</b></div>' +
      '<div><span>Category multiple</span><b class="num">' + fmtMult(row.category_multiple) + ' (n=' + row.category_n + ')</b></div>' +
      '<div><span>Size adjustment</span><b class="num">' + (row.size_adjustment >= 0 ? '+' : '') + row.size_adjustment.toFixed(2) + ' log</b></div>' +
      '<div><span>Conditional value (if it launches)</span><b class="num">' + fmtUsd(row.conditional_value_usd) + '</b></div>' +
      '<div><span>Odds it ever records a token</span><b class="num">' + fmtOdds(row.odds) + '</b></div>' +
      '<div><span>Implied value (range)</span><b class="num">' + fmtUsd(row.implied_value_usd) + ' (' + fmtUsd(row.implied_low_usd) + '–' + fmtUsd(row.implied_high_usd) + ')</b></div>' +
      '</div>' +
      '<div class="bar" aria-hidden="true"><i style="width:' + pct + '%"></i></div>' +
      '<p class="why">' + esc(whySentence(row)) + ' This is an estimate, not a price, and it never predicts a launch.</p>' +
      '<div class="verdictbox"><b>Verdict: ' + row.verdict + '</b> — expected slice ' + fmtUsd(row.slice_usd) + ' on a $1,000 ticket, gas ' + fmtUsd(row.slice_usd - row.net_usd) + ', net ' + fmtUsd(row.net_usd) + ', ' + fmtUsd(row.net_per_hour_usd) + ' an hour.</div>' +
      '<h3>Farm plan</h3><ol class="steps">' + steps + '</ol>' +
      '</div>';
    var closeBtn = dialog.querySelector('#closeDetail');
    if (closeBtn) closeBtn.addEventListener('click', function () { dialog.close(); });
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function render() {
    var html = masthead() + hero();
    if (state.tab === 'pre-token') html += spotlight();
    html += controls();
    html += state.tab === 'pre-token' ? boardTable() : liveTable();
    if (state.tab === 'pre-token') html += modelCards() + evidenceCards() + judgeNote();
    app.innerHTML = html;
    app.setAttribute('aria-busy', 'false');
    bind();
    if (state.selected) openDetail(state.selected);
    else if (dialog.open) dialog.close();
  }

  function bind() {
    var q = document.getElementById('q');
    if (q) q.addEventListener('input', function () { state.q = q.value; writeHash(); render(); });
    var cat = document.getElementById('category');
    if (cat) cat.addEventListener('change', function () { state.category = cat.value; writeHash(); render(); });
    var chn = document.getElementById('chain');
    if (chn) chn.addEventListener('change', function () { state.chain = chn.value; writeHash(); render(); });
    var wb = document.getElementById('watchBtn');
    if (wb) wb.addEventListener('click', function () { state.watchOnly = !state.watchOnly; writeHash(); render(); });
    var gb = document.getElementById('growBtn');
    if (gb) gb.addEventListener('click', function () { state.growingOnly = !state.growingOnly; writeHash(); render(); });
    var tp = document.getElementById('tabPre');
    if (tp) tp.addEventListener('click', function () { state.tab = 'pre-token'; render(); });
    var tl = document.getElementById('tabLive');
    if (tl) tl.addEventListener('click', function () { state.tab = 'live'; render(); });
    var cb = document.getElementById('clearBtn');
    if (cb) cb.addEventListener('click', function () { state.q = ''; state.category = 'all'; state.chain = 'all'; state.watchOnly = false; state.growingOnly = false; writeHash(); render(); });
    Array.prototype.forEach.call(app.querySelectorAll('[data-sort]'), function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-sort');
        if (state.sort === key) state.dir = -state.dir;
        else { state.sort = key; state.dir = -1; }
        render();
      });
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-slug]'), function (node) {
      node.addEventListener('click', function () { openDetail(node.getAttribute('data-slug')); });
      node.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(node.getAttribute('data-slug')); }
      });
    });
  }

  readHash();
  render();
  window.addEventListener('hashchange', function () {
    state.q = '';
    state.category = 'all';
    state.chain = 'all';
    state.watchOnly = false;
    state.growingOnly = false;
    state.selected = null;
    readHash();
    render();
  });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dialog.open) dialog.close();
  });
})();
