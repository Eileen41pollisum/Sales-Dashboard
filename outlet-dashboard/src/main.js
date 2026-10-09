/* ------------------------------------------------------------------
   DATA LAYER: the only place data is loaded.
   Resolves to an array of rows:
   { outlet, week, sales, target, orders, returns }
   Config comes from Vite env vars (see .env.example).
------------------------------------------------------------------ */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function loadData() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  }
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/outlet_weeks?select=outlet,week,sales,target,orders,returns&order=week.asc,outlet.asc`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.map(r => ({
    outlet: r.outlet,
    week: r.week,
    sales: Number(r.sales),
    target: Number(r.target),
    orders: Number(r.orders),
    returns: Number(r.returns),
  }));
}

/* ------------------------------ UI ------------------------------ */
const THRESHOLD = 90;
let ROWS = [], OUTLETS = ['All'], current = 'All';

const $ = id => document.getElementById(id);
const fmtMoney = n => '$' + n.toLocaleString('en-SG');
const fmtPct = n => n.toFixed(1) + '%';
const fmtDate = s => new Date(s + 'T00:00:00').toLocaleDateString('en-SG', { day: 'numeric', month: 'short' });
const sum = (a, k) => a.reduce((t, r) => t + r[k], 0);
const pctOf = r => r.sales / r.target * 100;

function renderFilters() {
  $('filters').innerHTML = OUTLETS.map(o => `<button data-o="${o}">${o}</button>`).join('');
}

function render() {
  const rows = current === 'All' ? ROWS : ROWS.filter(r => r.outlet === current);
  document.querySelectorAll('#filters button').forEach(b => b.classList.toggle('active', b.dataset.o === current));

  const sales = sum(rows, 'sales'), target = sum(rows, 'target'),
        orders = sum(rows, 'orders'), returns = sum(rows, 'returns');
  $('k-sales').textContent = fmtMoney(sales);
  $('n-sales').textContent = 'Target ' + fmtMoney(target);
  $('k-target').textContent = target ? fmtPct(sales / target * 100) : '–';
  $('n-target').textContent = (sales - target >= 0 ? '+' : '–') + fmtMoney(Math.abs(sales - target)) + ' vs target';
  $('k-orders').textContent = orders.toLocaleString('en-SG');
  $('n-orders').textContent = orders ? fmtMoney(Math.round(sales / orders)) + ' avg order' : '';
  $('k-returns').textContent = orders ? fmtPct(returns / orders * 100) : '–';
  $('n-returns').textContent = returns + ' returns';

  if (rows.length) {
    const weeks = rows.map(r => r.week).sort();
    $('range').textContent = `Weeks of ${fmtDate(weeks[0])} – ${fmtDate(weeks[weeks.length - 1])} · ${current === 'All' ? 'all outlets' : current}`;
  }

  // Chart
  const MAX = 120; // axis top, in % of target
  const lines = [[100, ''], [THRESHOLD, 't90']].map(([v, c]) =>
    `<div class="gl ${c}" style="bottom:calc(46px + (100% - 46px) * ${v / MAX})"><span>${v}%</span></div>`).join('');
  const cols = rows.map(r => {
    const p = pctOf(r), bad = p < THRESHOLD;
    return `<div class="col">
      <div class="bar ${bad ? 'bad' : ''}" style="height:calc(100% * ${Math.min(p, MAX) / MAX})" title="${r.outlet}, week of ${fmtDate(r.week)}: ${fmtPct(p)}"><b>${Math.round(p)}%</b></div>
      <div class="xl"><strong>${r.outlet}</strong>${fmtDate(r.week)}</div>
    </div>`;
  }).join('');
  $('chart').innerHTML = lines + cols;

  // Needs attention
  const bad = rows.filter(r => pctOf(r) < THRESHOLD).sort((a, b) => pctOf(a) - pctOf(b));
  $('attention').innerHTML = bad.length ? bad.map(r => `
    <li>
      <div><div class="who">${r.outlet}</div><div class="when">Week of ${fmtDate(r.week)}</div></div>
      <div><div class="pct">${fmtPct(pctOf(r))}</div><div class="gap">${fmtMoney(r.target - r.sales)} short</div></div>
    </li>`).join('') : '<li class="empty">All outlet-weeks are at or above 90% of target.</li>';
}

(async function init() {
  $('filters').addEventListener('click', e => {
    if (e.target.dataset.o) { current = e.target.dataset.o; render(); }
  });
  try {
    ROWS = await loadData();
    OUTLETS = ['All', ...new Set(ROWS.map(r => r.outlet))];
    renderFilters();
    render();
  } catch (err) {
    console.error(err);
    $('range').textContent = 'Could not load data: ' + err.message;
    $('range').classList.add('error');
  }
})();
