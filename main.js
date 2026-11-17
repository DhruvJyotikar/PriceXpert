'use strict';

const API_BASE = window.PRICE_XPERT_API_BASE || (
  ['localhost', '127.0.0.1'].includes(window.location.hostname) && window.location.port !== '3001'
    ? 'http://localhost:3001'
    : ''
);
const PLATFORMS = {
  amazon: ['Amazon India', '🛒'],
  flipkart: ['Flipkart', '🎯'],
  myntra: ['Myntra', '👗'],
  ajio: ['AJIO', '✨'],
  meesho: ['Meesho', '🌸']
};

const money = value => Number.isFinite(Number(value)) && Number(value) > 0 ? `₹${Number(value).toLocaleString('en-IN')}` : '—';
const escapeHtml = value => String(value || '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]);
const platformFromUrl = value => Object.keys(PLATFORMS).find(key => String(value).toLowerCase().includes(key === 'amazon' ? 'amazon.' : `${key}.com`));
const statusLabel = value => ({ matched: 'In stock', unavailable: 'Unavailable', not_found: 'Not found', blocked: 'Temporarily blocked', error: 'Lookup failed' }[value] || 'Unknown');

let currentData = null;
let currentSort = 'best';

const orderRows = (rows, mode) => {
  const rank = { matched: 0, unavailable: 1, not_found: 2, blocked: 3, error: 4 };
  return [...rows].sort((a, b) => {
    const state = (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
    if (mode === 'availability') return state || (a.landedPrice ?? Infinity) - (b.landedPrice ?? Infinity);
    if (state && (a.status !== 'matched' || b.status !== 'matched')) return state;
    if (mode === 'price') return (a.price || Infinity) - (b.price || Infinity);
    if (mode === 'discount') return (b.discountPercent || 0) - (a.discountPercent || 0);
    if (mode === 'delivery') return (a.deliveryCharge ?? Infinity) - (b.deliveryCharge ?? Infinity);
    return (a.landedPrice ?? Infinity) - (b.landedPrice ?? Infinity);
  });
};

function renderResults(data, sortMode = 'best') {
  currentData = data;
  currentSort = sortMode;
  const section = document.getElementById('results-section');
  if (!section) return;
  section.classList.remove('hidden');

  const mount = document.getElementById('react-results') || document.querySelector('.results-container');
  if (!mount) return;

  const product = data.product;
  const identity = product.identity || {};
  const rows = orderRows(data.comparison || [], sortMode);
  const live = orderRows(rows, 'best').filter(row => row.status === 'matched' && row.landedPrice !== null);
  const best = live[0], next = live[1];
  const liveRankMap = new Map(rows.filter(r => r.status === 'matched').map((r, i) => [r.platform, i + 1]));

  const sortOptions = [
    ['best', 'Best deal (landed price)'],
    ['price', 'Listed price'],
    ['discount', 'Highest discount'],
    ['delivery', 'Lowest delivery charge'],
    ['availability', 'Availability']
  ].map(([v, l]) => `<option value="${v}" ${v === sortMode ? 'selected' : ''}>${l}</option>`).join('');

  const tableRows = rows.map(row => {
    const isBest = liveRankMap.get(row.platform) === 1;
    const rankNum = liveRankMap.get(row.platform);
    const delivery = row.deliveryCharge == null ? '<span class="muted">Not shown by store</span>' : row.deliveryCharge === 0 ? 'Free' : money(row.deliveryCharge);
    const deliveryDetail = row.deliveryText ? `<small>${row.deliveryScope === 'pincode' ? 'for pincode' : 'store default'} · ${escapeHtml(row.deliveryText)}</small>` : '';
    const discountCol = row.discountPercent ? `<strong>${row.discountPercent}% off</strong><small>Save ${money(row.discountAmount)}</small>` : '<span class="muted">—</span>';
    const offersCol = row.offers?.length ? `<ul class="offer-list">${row.offers.map(o => `<li>${escapeHtml(o)}</li>`).join('')}</ul>` : '<span class="muted">No verified offer displayed</span>';
    const buyLink = row.url ? `<a class="table-buy ${isBest ? 'best-buy' : ''}" href="${escapeHtml(row.url)}" target="_blank" rel="noopener noreferrer">${isBest ? 'Best deal' : 'View listing'} ↗</a>` : '<span class="muted">No listing link</span>';

    return `<tr class="status-${escapeHtml(row.status)} ${isBest ? 'best-row' : ''}">
      <td>${rankNum ? `#${rankNum}` : '—'}</td>
      <td><strong>${PLATFORMS[row.platform]?.[1] || '🛍️'} ${escapeHtml(row.platformName)}</strong>${row.title ? `<span class="listing-title">${escapeHtml(row.title)}</span>` : ''}${row.matchScore ? `<small>Match confidence: ${row.matchScore}%</small>` : ''}${row.message ? `<small class="row-message">${escapeHtml(row.message)}</small>` : ''}</td>
      <td><strong>${money(row.price)}</strong>${row.mrp ? `<small>MRP ${money(row.mrp)}</small>` : ''}</td>
      <td>${discountCol}</td>
      <td>${delivery}${deliveryDetail}</td>
      <td><span class="availability ${escapeHtml(row.status)}">${statusLabel(row.status)}</span></td>
      <td>${offersCol}</td>
      <td><strong class="landed-price">${money(row.landedPrice)}</strong><small>price + delivery</small></td>
      <td>${buyLink}</td>
    </tr>`;
  }).join('');

  mount.innerHTML = `
    <div class="product-header">
      <div class="product-img-wrap">
        <div class="product-img-placeholder">
          ${product.image ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" onerror="this.remove()">` : '📦'}
        </div>
      </div>
      <div class="product-info">
        <div class="product-source-tag">${PLATFORMS[product.sourcePlatform]?.[1] || '🔗'} Source: ${PLATFORMS[product.sourcePlatform]?.[0] || 'product page'}</div>
        <h2 class="product-title">${escapeHtml(product.title)}</h2>
        <p class="product-identity">${escapeHtml([identity.brand, identity.model, ...(identity.variant || [])].filter(Boolean).join(' · '))}</p>
        <div class="comparison-scope">${data.meta?.pincode ? `Delivery lookup requested for pincode ${escapeHtml(data.meta.pincode)}. Stores that do not accept it automatically are marked accordingly.` : 'Add a pincode above for location-aware delivery and availability where supported.'}</div>
      </div>
    </div>
    <div class="comparison-toolbar">
      <div>
        <h3>Verified listing comparison</h3>
        <p>Rows are ranked by listed price plus displayed delivery charge.</p>
      </div>
      <label>Sort <select id="sort-select">${sortOptions}</select></label>
    </div>
    <div class="savings-banner">
      <div class="sb-icon">💡</div>
      <div class="sb-text">
        <div class="sb-title">${best ? `Best current listing: ${escapeHtml(best.platformName)}` : 'No matching listing found yet'}</div>
        <div class="sb-desc">${best ? `${live.length} matching listing${live.length === 1 ? '' : 's'} shown; ranking uses listed price plus displayed delivery.` : 'Every supported store is shown with its lookup status.'}</div>
      </div>
      <div class="sb-amount">
        <span class="sb-save-label">Difference to next deal</span>
        <span class="sb-save-num">${best && next ? money(Math.max(0, next.landedPrice - best.landedPrice)) : '—'}</span>
      </div>
    </div>
    <div class="comparison-table-wrap" tabindex="0">
      <table class="comparison-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Store & matching listing</th>
            <th>Price</th>
            <th>Discount</th>
            <th>Delivery</th>
            <th>Availability</th>
            <th>Verified offers</th>
            <th>Final listed cost</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
    <p class="comparison-disclaimer">“Final listed cost” is the current listing price plus the delivery charge displayed by the store. Offer eligibility, final stock, and checkout charges are confirmed by the store.</p>
  `;

  const select = document.getElementById('sort-select');
  if (select) {
    select.addEventListener('change', e => renderResults(data, e.target.value));
  }

  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

window.analyzeURL = async () => {
  const urlEl = document.getElementById('url-input');
  const pinEl = document.getElementById('pincode-input');
  const url = urlEl ? urlEl.value.trim() : '';
  const pincode = pinEl ? pinEl.value.trim() : '';
  const message = document.getElementById('url-message');
  const setMessage = (type, text) => {
    if (!message) return;
    message.className = `url-message ${type}`;
    const txtNode = document.getElementById('url-message-text');
    if (txtNode) txtNode.textContent = text;
    message.classList.remove('hidden');
  };
  if (!url) return setMessage('error', 'Please paste a product URL first.');
  try {
    const endpoint = new URL(`${API_BASE}/api/compare`);
    endpoint.searchParams.set('url', url);
    if (pincode) endpoint.searchParams.set('pincode', pincode);
    const button = document.getElementById('search-btn');
    if (button) {
      button.disabled = true;
      const btnText = button.querySelector('.btn-text');
      if (btnText) btnText.textContent = 'Searching supported stores…';
    }
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(90000) });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || 'Comparison could not be completed.');
    renderResults(data, currentSort);
    const matched = data.comparison.filter(row => row.status === 'matched').length;
    setMessage(matched ? 'success' : 'error', matched ? `Compared ${matched} matching listing${matched === 1 ? '' : 's'}; ${data.comparison.length - matched} stores reported separately.` : 'The product was identified, but no matching listing is currently available. Review the store statuses below.');
  } catch (error) {
    setMessage('error', error.name === 'TimeoutError' ? 'The comparison timed out. Please try again.' : error.message);
  } finally {
    const button = document.getElementById('search-btn');
    if (button) {
      button.disabled = false;
      const btnText = button.querySelector('.btn-text');
      if (btnText) btnText.textContent = 'Compare Prices';
    }
  }
};

function updatePlatformHint() {
  const urlEl = document.getElementById('url-input');
  const url = urlEl ? urlEl.value.trim() : '';
  const platform = platformFromUrl(url);
  const badge = document.getElementById('detected-platform');
  const pName = document.getElementById('platform-name');
  if (pName) pName.textContent = platform ? `${PLATFORMS[platform][1]} ${PLATFORMS[platform][0]}` : url ? 'Product URL detected' : 'Paste Product URL';
  if (badge) badge.classList.toggle('detected', Boolean(platform));
  document.querySelectorAll('.p-chip').forEach((chip, index) => chip.classList.toggle('active', Object.keys(PLATFORMS)[index] === platform));
}

function initCanvas() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = window.innerWidth, H = window.innerHeight;

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W; canvas.height = H;
  }
  window.addEventListener('resize', resize);
  resize();

  const hexes = [];
  const COLS = Math.ceil(W / 80) + 2;
  const ROWS = Math.ceil(H / 92) + 2;
  const HEX_SIZE = 38;

  for (let r = -1; r < ROWS; r++) {
    for (let c = -1; c < COLS; c++) {
      const x = c * 80 + (r % 2 ? 40 : 0);
      const y = r * 92;
      hexes.push({
        x, y,
        phase: Math.random() * Math.PI * 2,
        speed: 0.003 + Math.random() * 0.004,
        color: Math.random() > 0.5 ? 'purple' : 'cyan',
        alpha: 0.02 + Math.random() * 0.04,
      });
    }
  }

  function drawHex(x, y, size, alpha, color) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = color === 'purple' ? `rgba(168,85,247,${alpha})` : `rgba(6,182,212,${alpha})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  let tick = 0;
  function animate() {
    ctx.clearRect(0, 0, W, H);
    tick++;

    hexes.forEach(h => {
      const pulse = Math.sin(tick * h.speed + h.phase);
      drawHex(h.x, h.y, HEX_SIZE + pulse * 3, h.alpha + pulse * 0.015, h.color);
    });

    const t = tick * 0.005;
    const orbs = [
      { x: W * 0.2 + Math.sin(t) * 150, y: H * 0.3 + Math.cos(t * 0.7) * 100, r: 260, c: [168, 85, 247], a: 0.07 },
      { x: W * 0.8 + Math.cos(t * 0.6) * 200, y: H * 0.6 + Math.sin(t * 0.8) * 120, r: 220, c: [6, 182, 212], a: 0.06 },
      { x: W * 0.5 + Math.sin(t * 1.2) * 180, y: H * 0.8 + Math.cos(t) * 80, r: 180, c: [99, 102, 241], a: 0.05 },
    ];

    orbs.forEach(o => {
      const grad = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
      grad.addColorStop(0, `rgba(${o.c[0]},${o.c[1]},${o.c[2]},${o.a})`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    });

    requestAnimationFrame(animate);
  }

  animate();
}

function initParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  const COUNT = 28;
  const colors = ['#a855f7', '#06b6d4', '#f59e0b', '#22c55e', '#f43f5e'];

  for (let i = 0; i < COUNT; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = 3 + Math.random() * 6;
    const color = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      box-shadow: 0 0 ${size * 2}px ${color};
      animation-delay: ${Math.random() * 12}s;
    `;
    container.appendChild(p);
  }
}

const inputEl = document.getElementById('url-input');
if (inputEl) {
  inputEl.addEventListener('input', updatePlatformHint);
  inputEl.addEventListener('keydown', event => { if (event.key === 'Enter') window.analyzeURL(); });
}
const pinEl = document.getElementById('pincode-input');
if (pinEl) {
  pinEl.addEventListener('keydown', event => { if (event.key === 'Enter') window.analyzeURL(); });
}

initCanvas();
initParticles();

window.loadDemoProduct = () => {
  const input = document.getElementById('url-input');
  if (input) {
    input.value = 'https://www.amazon.in/Puma-Unisex-Adult-Smashic-Black-Matte-Sneaker/dp/B0BSLJ245H/';
    updatePlatformHint();
    window.analyzeURL();
  }
};
