'use strict';

if (typeof window === 'undefined') {
  // If run via Node.js (`node app.js`), start the PriceXpert server
  const server = require('./server.js');
  if (require.main === module) {
    server.startServer();
  }
  module.exports = server;
} else {
  // Browser client runtime
  const API_BASE = (typeof window !== 'undefined' && window.location.port === '3001') ? '' : 'http://localhost:3001';
  const PLATFORMS = {
    amazon: { name: 'Amazon India', emoji: '🛒' },
    flipkart: { name: 'Flipkart', emoji: '🎯' },
    myntra: { name: 'Myntra', emoji: '👗' },
    ajio: { name: 'AJIO', emoji: '✨' },
    meesho: { name: 'Meesho', emoji: '🌸' },
  };
  let comparisonRows = [];
  let currentResponse = null;

  const money = value => Number.isFinite(Number(value)) && Number(value) > 0
    ? `₹${Number(value).toLocaleString('en-IN')}` : '—';
  const escapeHtml = value => String(value || '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  const platformFromUrl = value => {
    const lower = String(value || '').toLowerCase();
    return Object.keys(PLATFORMS).find(key => lower.includes(key === 'amazon' ? 'amazon.' : `${key}.com`)) || null;
  };
  const isValidUrl = value => { try { const url = new URL(value); return /^https?:$/.test(url.protocol); } catch { return false; } };

  function showMessage(type, message) {
    const node = document.getElementById('url-message');
    if (!node) return;
    node.className = `url-message ${type}`;
    const textNode = document.getElementById('url-message-text');
    if (textNode) textNode.textContent = message;
    node.classList.remove('hidden');
  }
  function hideMessage() {
    const node = document.getElementById('url-message');
    if (node) node.classList.add('hidden');
  }
  function setLoading(loading, label = 'Compare Prices') {
    const button = document.getElementById('search-btn');
    if (!button) return;
    button.disabled = loading;
    button.style.pointerEvents = loading ? 'none' : '';
    const textNode = button.querySelector('.btn-text');
    if (textNode) textNode.textContent = label;
    const spinner = button.querySelector('.btn-spinner');
    if (spinner) spinner.classList.toggle('hidden', !loading);
    const arrow = button.querySelector('.btn-arrow');
    if (arrow) arrow.classList.toggle('hidden', loading);
  }
  function updatePlatformHint() {
    const input = document.getElementById('url-input');
    if (!input) return;
    const url = input.value.trim();
    const platform = platformFromUrl(url);
    const badge = document.getElementById('detected-platform');
    const label = document.getElementById('platform-name');
    if (badge) badge.classList.toggle('detected', Boolean(platform));
    if (label) label.textContent = platform ? `${PLATFORMS[platform].emoji} ${PLATFORMS[platform].name}` : url ? 'Product URL detected' : 'Paste Product URL';
    document.querySelectorAll('.p-chip').forEach(chip => chip.classList.toggle('active', chip.dataset.platform === platform));
  }

  async function analyzeURL() {
    const urlInput = document.getElementById('url-input');
    const pincodeInput = document.getElementById('pincode-input');
    const url = urlInput ? urlInput.value.trim() : '';
    const pincode = pincodeInput ? pincodeInput.value.trim() : '';
    if (!url) return showMessage('error', 'Please paste a product URL first.');
    if (!isValidUrl(url)) return showMessage('error', 'Please enter a complete http(s) product URL.');
    if (pincode && !/^\d{6}$/.test(pincode)) return showMessage('error', 'Delivery pincode must contain exactly six digits.');

    hideMessage();
    setLoading(true, 'Identifying product…');
    try {
      const endpoint = new URL(`${API_BASE}/api/compare`);
      endpoint.searchParams.set('url', url);
      if (pincode) endpoint.searchParams.set('pincode', pincode);
      setLoading(true, 'Searching supported stores…');
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(90000) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.error) throw new Error(data.error || 'Comparison could not be completed.');
      currentResponse = data;
      comparisonRows = data.comparison || [];
      renderProduct(data);
      sortComparisonTable('best');
      const matched = comparisonRows.filter(row => row.status === 'matched').length;
      const unavailable = comparisonRows.length - matched;
      showMessage(matched ? 'success' : 'error', matched
        ? `Compared ${matched} matching listing${matched === 1 ? '' : 's'}; ${unavailable} store${unavailable === 1 ? '' : 's'} reported separately.`
        : 'The product was identified, but no matching listing is currently available. Review the store statuses below.');
    } catch (error) {
      showMessage('error', error.name === 'TimeoutError' ? 'The comparison timed out. Please try again.' : error.message || 'Could not compare this product.');
    } finally {
      setLoading(false);
    }
  }

  function renderProduct(data) {
    const product = data.product;
    const resultsSec = document.getElementById('results-section');
    if (!resultsSec) return;
    resultsSec.classList.remove('hidden');

    const sourceTag = document.getElementById('source-platform-tag');
    if (sourceTag) sourceTag.textContent = `${PLATFORMS[product.sourcePlatform]?.emoji || '🔗'} Source: ${PLATFORMS[product.sourcePlatform]?.name || 'product page'}`;
    const titleEl = document.getElementById('product-title');
    if (titleEl) titleEl.textContent = product.title;
    const identity = product.identity || {};
    const parts = [identity.brand, identity.model, ...(identity.variant || [])].filter(Boolean);
    const identityEl = document.getElementById('product-identity');
    if (identityEl) identityEl.textContent = parts.join(' · ');
    const scopeEl = document.getElementById('comparison-scope');
    if (scopeEl) {
      scopeEl.textContent = data.meta?.pincode
        ? `Delivery lookup requested for pincode ${data.meta.pincode}. Stores that do not accept it automatically are marked accordingly.`
        : 'Add a pincode above for location-aware delivery and availability where supported.';
    }
    const image = document.getElementById('product-img');
    if (image) {
      image.innerHTML = product.image
        ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" onerror="this.remove()">`
        : '📦';
    }
    resultsSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function sortedRows(mode) {
    const statusRank = { matched: 0, unavailable: 1, not_found: 2, blocked: 3, error: 4 };
    return [...comparisonRows].sort((left, right) => {
      const state = (statusRank[left.status] ?? 9) - (statusRank[right.status] ?? 9);
      if (mode === 'availability') return state || (left.landedPrice ?? Infinity) - (right.landedPrice ?? Infinity);
      if (state && (left.status !== 'matched' || right.status !== 'matched')) return state;
      if (mode === 'price') return (left.price || Infinity) - (right.price || Infinity);
      if (mode === 'discount') return (right.discountPercent || 0) - (left.discountPercent || 0);
      if (mode === 'delivery') return (left.deliveryCharge ?? Infinity) - (right.deliveryCharge ?? Infinity);
      return (left.landedPrice ?? Infinity) - (right.landedPrice ?? Infinity);
    });
  }
  function statusLabel(row) {
    const labels = { matched: 'In stock', unavailable: 'Unavailable', not_found: 'Not found', blocked: 'Temporarily blocked', error: 'Lookup failed' };
    return labels[row.status] || 'Unknown';
  }
  function deliveryCell(row) {
    if (row.deliveryCharge === null || row.deliveryCharge === undefined) return `<span class="muted">Not shown by store</span>${row.deliveryText ? `<small>${escapeHtml(row.deliveryText)}</small>` : ''}`;
    const scope = row.deliveryScope === 'pincode' ? 'for pincode' : 'store default';
    return `${row.deliveryCharge === 0 ? 'Free' : money(row.deliveryCharge)}<small>${scope}${row.deliveryText ? ` · ${escapeHtml(row.deliveryText)}` : ''}</small>`;
  }
  function offersCell(row) {
    if (!row.offers?.length) return '<span class="muted">No verified offer displayed</span>';
    return `<ul class="offer-list">${row.offers.map(offer => `<li>${escapeHtml(offer)}</li>`).join('')}</ul>`;
  }
  function renderSummary(rows) {
    const live = rows.filter(row => row.status === 'matched' && row.landedPrice !== null);
    const best = live[0];
    const next = live[1];
    const titleEl = document.getElementById('sb-title');
    if (titleEl) titleEl.textContent = best ? `Best current listing: ${best.platformName}` : 'No matching listing found yet';
    const descEl = document.getElementById('sb-desc');
    if (descEl) {
      descEl.textContent = best
        ? `${live.length} matching listing${live.length === 1 ? '' : 's'} shown; ranking uses listed price plus displayed delivery.`
        : 'Every supported store is shown with its lookup status.';
    }
    const maxSavEl = document.getElementById('max-savings');
    if (maxSavEl) maxSavEl.textContent = best && next ? money(Math.max(0, next.landedPrice - best.landedPrice)) : '—';
  }
  function renderTable(rows) {
    const body = document.getElementById('comparison-table-body');
    if (!body) return;
    const liveRank = new Map(rows.filter(row => row.status === 'matched').map((row, index) => [row.platform, index + 1]));
    body.innerHTML = rows.map(row => {
      const best = liveRank.get(row.platform) === 1;
      const link = row.url ? `<a class="table-buy ${best ? 'best-buy' : ''}" href="${escapeHtml(row.url)}" target="_blank" rel="noopener noreferrer">${best ? 'Best deal' : 'View listing'} ↗</a>` : '<span class="muted">No listing link</span>';
      return `<tr class="status-${escapeHtml(row.status)} ${best ? 'best-row' : ''}">
        <td>${liveRank.get(row.platform) ? `#${liveRank.get(row.platform)}` : '—'}</td>
        <td><strong>${PLATFORMS[row.platform]?.emoji || '🛍️'} ${escapeHtml(row.platformName)}</strong>${row.title ? `<span class="listing-title">${escapeHtml(row.title)}</span>` : ''}${row.matchScore ? `<small>Match confidence: ${row.matchScore}%</small>` : ''}${row.message ? `<small class="row-message">${escapeHtml(row.message)}</small>` : ''}</td>
        <td><strong>${money(row.price)}</strong>${row.mrp ? `<small>MRP ${money(row.mrp)}</small>` : ''}</td>
        <td>${row.discountPercent ? `<strong>${row.discountPercent}% off</strong><small>Save ${money(row.discountAmount)}</small>` : '<span class="muted">—</span>'}</td>
        <td>${deliveryCell(row)}</td>
        <td><span class="availability ${escapeHtml(row.status)}">${statusLabel(row)}</span></td>
        <td>${offersCell(row)}</td>
        <td><strong class="landed-price">${money(row.landedPrice)}</strong><small>price + delivery</small></td>
        <td>${link}</td>
      </tr>`;
    }).join('');
  }
  function sortComparisonTable(mode) {
    const rows = sortedRows(mode);
    renderTable(rows);
    renderSummary(sortedRows('best'));
  }
  function loadDemoProduct() {
    const input = document.getElementById('url-input');
    if (input) {
      input.value = 'https://www.amazon.in/Puma-Unisex-Adult-Smashic-Black-Matte-Sneaker/dp/B0BSLJ245H/';
      updatePlatformHint();
      analyzeURL();
    }
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

  const urlInput = document.getElementById('url-input');
  if (urlInput) {
    urlInput.addEventListener('input', updatePlatformHint);
    urlInput.addEventListener('keydown', event => { if (event.key === 'Enter') analyzeURL(); });
  }
  const pincodeInput = document.getElementById('pincode-input');
  if (pincodeInput) {
    pincodeInput.addEventListener('keydown', event => { if (event.key === 'Enter') analyzeURL(); });
  }

  initCanvas();
  initParticles();

  window.analyzeURL = analyzeURL;
  window.sortComparisonTable = sortComparisonTable;
  window.loadDemoProduct = loadDemoProduct;
}
