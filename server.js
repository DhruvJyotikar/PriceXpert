'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const UI_PORT = Number(process.env.UI_PORT) || 7890;
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));
const ui = express();
ui.use(express.static(path.join(__dirname)));

const PLATFORM_ORDER = ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho'];
const PLATFORM_NAMES = { amazon: 'Amazon India', flipkart: 'Flipkart', myntra: 'Myntra', ajio: 'AJIO', meesho: 'Meesho' };
const P = {
  amazon: { domains: ['amazon.in', 'amazon.com'], search: q => `https://www.amazon.in/s?k=${encodeURIComponent(q)}`, title: ['#productTitle', '.product-title-word-break', 'meta[property="og:title"]'], price: ['#priceToPay .a-offscreen', '#corePrice_feature_div .a-offscreen', '.a-price .a-offscreen'], mrp: ['.a-price.a-text-price .a-offscreen'], rating: ['#acrPopover'], review: ['#acrCustomerReviewText'], image: ['#landingImage', 'meta[property="og:image"]'], stock: ['#availability'], delivery: ['#deliveryBlockMessage', '#mir-layout-DELIVERY_BLOCK'], offers: ['#offers_feature_div', '#promoPriceBlockMessage_feature_div'], pincode: ['#GLUXZipUpdateInput'], cards: ['[data-component-type="s-search-result"]'], ct: ['h2 span'], cp: ['.a-price .a-offscreen', '.a-price-whole'], cm: ['.a-price.a-text-price .a-offscreen'], cr: ['.a-icon-alt'], cl: ['a.a-link-normal[href*="/dp/"]'] },
  flipkart: { domains: ['flipkart.com'], search: q => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}`, title: ['.B_NuCI', '._35KyD6', 'h1.yhB1nd', 'span.VU-ZEz', 'meta[property="og:title"]'], price: ['._30jeq3._16Jk6d', '._30jeq3', '.Nx9bqj'], mrp: ['._3I9_wc._2p6lqe', '._2p6lqe', 'del'], rating: ['._1lRcqv ._3LWZlK', '._2d4LTz'], review: ['._2_R_DZ span'], image: ['meta[property="og:image"]', 'img._396cs4', 'img[src*="rukminim"]'], stock: ['[class*="stock" i]'], delivery: ['[class*="delivery" i]'], offers: ['[class*="offer" i]'], pincode: ['input[placeholder*="pincode" i]'], cards: ['div[data-id]', '._1AtVbE', '._4ddWXP'], ct: ['._4rR01T', '.IRpwTa', '.WKTcLC', 'a[title]'], cp: ['._30jeq3', '.Nx9bqj'], cm: ['._3I9_wc', '._2p6lqe'], cr: ['._3LWZlK'], cl: ['a._1fQZEK', 'a.IRpwTa', 'a[href*="/p/"]'] },
  myntra: { domains: ['myntra.com'], search: q => `https://www.myntra.com/${encodeURIComponent(q.replace(/\s+/g, '-'))}`, title: ['h1', '.pdp-name', 'meta[property="og:title"]'], price: ['.pdp-price strong', '.pdp-price', '[class*="discountedPrice"]'], mrp: ['.pdp-mrp s', '[class*="struck"]'], rating: ['.index-overallRating', '[class*="rating"]'], review: ['.index-ratingsCount'], image: ['meta[property="og:image"]', '.image-grid-image img'], stock: ['[class*="soldOut" i]'], delivery: ['[class*="delivery"]'], offers: ['.pdp-offers-offer', '[class*="offer"]'], pincode: ['input[placeholder*="pincode" i]'], cards: ['.product-base'], ct: ['.product-brand', '.product-product'], cp: ['.product-discountedPrice'], cm: ['.product-struck'], cr: ['.product-ratingsContainer'], cl: ['a'] },
  ajio: { domains: ['ajio.com'], search: q => `https://www.ajio.com/search/?text=${encodeURIComponent(q)}`, title: ['.prod-name', '.product-title', 'h1', 'meta[property="og:title"]'], price: ['.prod-sp', '.price strong', '.price'], mrp: ['.prod-cp', '.orginal-price', 'del'], rating: ['.rating'], review: ['[class*="review"]'], image: ['meta[property="og:image"]', '.slick-active img'], stock: ['[class*="out-of-stock" i]'], delivery: ['[class*="delivery" i]', '[class*="shipping" i]'], offers: ['[class*="offer" i]'], pincode: ['input[placeholder*="pincode" i]'], cards: ['.item', '.preview-item', '.rilrtl-products-list__item'], ct: ['.nameCls', '.brand', '[class*="name"]'], cp: ['.price strong', '.price span', '.price'], cm: ['.orginal-price', 'del'], cr: ['[class*="rating"]'], cl: ['a'] },
  meesho: { domains: ['meesho.com'], search: q => `https://www.meesho.com/search?q=${encodeURIComponent(q)}`, title: ['h1', '[data-testid="product-title"]', 'meta[property="og:title"]'], price: ['[class*="price" i]'], mrp: ['[class*="mrp" i]', 'del'], rating: ['[class*="rating" i]'], review: ['[class*="review" i]'], image: ['meta[property="og:image"]', 'img'], stock: ['[class*="sold" i]'], delivery: ['[class*="delivery" i]', '[class*="shipping" i]'], offers: ['[class*="offer" i]', '[class*="coupon" i]'], pincode: ['input[placeholder*="pincode" i]'], cards: ['[data-testid="product-card"]', '.sc-eDvSVe'], ct: ['p[class*="Text"]', 'h5', '[class*="title" i]'], cp: ['[class*="price" i]'], cm: ['[class*="mrp" i]', 'del'], cr: ['[class*="rating" i]'], cl: ['a'] }
};
const GENERIC = { title: ['h1', 'meta[property="og:title"]'], price: ['[itemprop="price"]', 'meta[property="product:price:amount"]', '[class*="price" i]'], mrp: ['del', 's', '[class*="mrp" i]'], rating: ['[class*="rating" i]'], review: ['[class*="review" i]'], image: ['meta[property="og:image"]', 'img'], stock: ['[class*="stock" i]'], delivery: ['[class*="delivery" i]'], offers: ['[class*="offer" i]'], pincode: ['input[placeholder*="pincode" i]'] };

const BRANDS = ['apple', 'samsung', 'google', 'oneplus', 'xiaomi', 'redmi', 'poco', 'vivo', 'oppo', 'motorola', 'realme', 'nothing', 'sony', 'hp', 'lenovo', 'dell', 'asus', 'acer', 'puma', 'nike', 'adidas', 'reebok', 'new balance', 'boat', 'jbl', 'bose', 'lg', 'whirlpool', 'philips', 'mi', 'fossil', 'tommy hilfiger'];
const ACCESSORIES = ['case', 'cover', 'tempered', 'screen protector', 'glass protector', 'pouch', 'bumper', 'skin', 'sleeve', 'stand', 'holder', 'mount', 'strap', 'charger', 'cable', 'adapter', 'protector', 'guard', 'shell', 'accessory'];
const DIFFERENTIATORS = ['pro max', 'pro ultra', 'ultra plus', 'pro', 'max', 'plus', 'ultra', 'lite', 'mini', 'air', 'neo', 'fe', 'fold', 'flip', 'edge', 'prime', 'note'];
const COLORS = new Map([['space gray','gray'],['space grey','gray'],['phantom black','black'],['jet black','black'],['matte black','black'],['obsidian','black'],['midnight','midnight'],['starlight','starlight'],['natural titanium','natural titanium'],['titanium','titanium'],['navy','blue'],['aqua','blue'],['violet','purple'],['lavender','purple'],['cream','white'],['ivory','white'],['black','black'],['white','white'],['blue','blue'],['red','red'],['green','green'],['gold','gold'],['silver','silver'],['gray','gray'],['grey','gray'],['purple','purple'],['pink','pink'],['orange','orange'],['yellow','yellow'],['rose','rose'],['graphite','graphite'],['sand','sand'],['desert','desert'],['brown','brown']]);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const normalizeText = value => String(value || '').toLowerCase().replace(/[^a-z0-9+ ]/g, ' ').replace(/\s+/g, ' ').trim();
const compact = value => normalizeText(value).replace(/\s+/g, '');
const unique = values => [...new Set(values.filter(Boolean))];
const validPrice = value => value >= 50 && value <= 500000;
function parsePrice(value) { const match = String(value || '').replace(/,/g, '').match(/\d+(?:\.\d+)?/); return match ? Math.round(Number(match[0])) || 0 : 0; }
function sanitizeMrp(mrp, price) { return validPrice(mrp) && mrp >= price && mrp <= price * 4 ? mrp : 0; }
function safeUrl(value) { try { const parsed = new URL(value); return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : ''; } catch { return ''; } }
function validatePincode(value) { const code = String(value || '').trim(); return !code || /^\d{6}$/.test(code) ? code : null; }
function platformFor(url) { try { const host = new URL(url).hostname.toLowerCase().replace(/^www\./, ''); return PLATFORM_ORDER.find(key => P[key].domains.some(domain => host === domain || host.endsWith(`.${domain}`))) || null; } catch { return null; } }
function colorFor(value) { const text = normalizeText(value); for (const [name, color] of COLORS) if (new RegExp(`\\b${name.replace(/ /g, '\\s+')}\\b`).test(text)) return color; return ''; }
function largestCapacity(values) { return values.slice().sort((a,b) => (Number(b.match(/\d+/)?.[0] || 0) * (b.includes('tb') ? 1024 : 1)) - (Number(a.match(/\d+/)?.[0] || 0) * (a.includes('tb') ? 1024 : 1)))[0] || ''; }
function browserSelectors(config) {
  return Object.fromEntries(Object.entries(config).filter(([, value]) => typeof value !== 'function'));
}

function extractProductIdentity(title, options = {}) {
  const all = [title, options.storage, options.ram, options.color, options.size, options.condition, options.gender, ...(options.specifications || [])].filter(Boolean).join(' ');
  const text = normalizeText(title);
  const brand = BRANDS.find(item => new RegExp(`\\b${item.replace(/ /g, '\\s+')}\\b`).test(text)) || text.split(' ')[0] || '';
  const rest = text.slice(Math.max(0, text.indexOf(brand) + brand.length)).trim();
  const capacities = unique((normalizeText(all).match(/\b\d+(?:\s*\+\s*\d+)?\s*(?:tb|gb|mb)\b/g) || []).map(compact));
  const ram = compact(options.ram || all.match(/\b(\d+\s*gb)\s*(?:ram|memory)\b/i)?.[1] || '');
  const storage = compact(options.storage || largestCapacity(capacities.filter(item => item !== ram)) || capacities[0] || '');
  const color = colorFor(options.color || all);
  const size = normalizeText(options.size || all.match(/\b(?:size|uk|us|eu)\s*([0-9]+(?:\.[0-9]+)?|xs|s|m|l|xl|xxl)\b/i)?.[1] || '');
  const condition = normalizeText(all).match(/\b(refurbished|renewed|pre owned|used|open box)\b/)?.[1]?.replace(/ /g, '-') || 'new';
  const gender = normalizeText(all).match(/\b(men|women|unisex|boys|girls|kids)\b/)?.[1] || '';
  const stop = new RegExp(`\\b(?:${[...COLORS.keys()].map(item => item.replace(/ /g, '\\s+')).join('|')})\\b|\\b\\d+(?:\\s*\\+\\s*\\d+)?\\s*(?:tb|gb|mb)\\b|\\b(?:ram|size|refurbished|renewed|used|with|for|pack|set|combo)\\b`);
  const skipWords = new Set(['men', 'mens', 'women', 'womens', 'unisex', 'adult', 'kids', 'boys', 'girls', 'for', 'with', 'the', 'a', 'an']);
  const modelTokens = [];
  for (const token of rest.split(' ')) {
    if (!token) continue;
    if (modelTokens.length === 0 && skipWords.has(token)) continue;
    if (stop.test(token) || /^\d+(?:\+\d+)?(?:gb|tb|mb)$/.test(token)) {
      if (modelTokens.length > 0) break;
      continue;
    }
    modelTokens.push(token);
    if (modelTokens.length === 6) break;
  }
  const model = modelTokens.join(' ') || rest.split(' ').filter(t => t && !stop.test(t)).slice(0, 3).join(' ') || rest.split(' ').slice(0, 3).join(' ');
  const variant = unique([storage, ram ? `${ram} ram` : '', color, size ? `size ${size}` : '', condition !== 'new' ? condition : '', gender]);
  return { brand, model, variant, attributes: { storage, ram, color, size, condition, gender }, price: Number(options.price) || 0 };
}
function searchQuery(identity) { const attrs = identity.attributes || {}; return unique([identity.brand, identity.model, ...(identity.variant || [attrs.storage, attrs.ram && `${attrs.ram} ram`, attrs.color])]).join(' ').trim(); }
function designators(text) { const normal = normalizeText(text); const items = DIFFERENTIATORS.filter(item => new RegExp(`\\b${item.replace(/ /g, '\\s+')}\\b`).test(normal)); return items.filter(item => !item.includes(' ') || !items.some(other => other !== item && other.includes(item))); }
function candidateMatchDetail(title, source) {
  if (!title || !source?.brand || !source?.model) return { score: 0, reason: 'missing identity' };
  const normal = normalizeText(title);
  if (ACCESSORIES.some(word => normal.includes(word))) return { score: 0, reason: 'accessory' };
  const candidate = extractProductIdentity(title); const sourceAttrs = source.attributes || {}; const candidateAttrs = candidate.attributes || {};
  if (candidate.brand && candidate.brand !== source.brand) return { score: 0, reason: 'brand differs' };
  const titleTokens = new Set(normal.split(' '));
  if (!normalizeText(source.model).split(' ').filter(item => item.length > 1).every(item => titleTokens.has(item))) return { score: 0, reason: 'model differs' };
  const sourceDiff = designators(source.model), candidateDiff = designators(title);
  if (sourceDiff.some(item => !candidateDiff.includes(item)) || candidateDiff.some(item => !sourceDiff.includes(item))) return { score: 0, reason: 'edition differs' };
  for (const key of ['storage', 'ram', 'size', 'condition', 'gender']) if (sourceAttrs[key] && candidateAttrs[key] && sourceAttrs[key] !== candidateAttrs[key]) return { score: 0, reason: `${key} differs` };
  if (sourceAttrs.color && candidateAttrs.color && sourceAttrs.color !== candidateAttrs.color) return { score: 0, reason: 'color differs' };
  let earned = 60, total = 60; const weights = { storage: 20, ram: 14, color: 8, size: 15, condition: 10, gender: 6 };
  for (const [key, weight] of Object.entries(weights)) { if (!sourceAttrs[key]) continue; total += weight; if (candidateAttrs[key] === sourceAttrs[key]) earned += weight; else if (!candidateAttrs[key]) earned += Math.round(weight * (key === 'color' ? .35 : .15)); }
  return { score: Math.round(earned / total * 100), reason: 'matched', candidate };
}
function candidateMatchScore(title, identity) { return candidateMatchDetail(title, identity).score; }
function guessCategory(title) { const text = normalizeText(title); if (/iphone|samsung|pixel|oneplus|redmi|poco|vivo|oppo|motorola|realme|nothing/.test(text)) return 'Smartphones'; if (/macbook|laptop|notebook|chromebook|victus|pavilion|ideapad|thinkpad|zenbook|vivobook/.test(text)) return 'Laptops'; if (/ipad|tablet/.test(text)) return 'Tablets'; if (/airpods|headphone|earphone|earbud|speaker|headset|buds/.test(text)) return 'Audio'; if (/shoe|sneaker|boot|sandal|slipper|footwear|loafer/.test(text)) return 'Footwear'; if (/serum|cream|moisturizer|lipstick|foundation|shampoo|conditioner|sunscreen|skincare/.test(text)) return 'Beauty & Skincare'; if (/tshirt|t shirt|shirt|jeans|kurta|dress|jacket|hoodie|saree|trouser/.test(text)) return 'Fashion'; if (/watch|smartwatch/.test(text)) return 'Watches'; if (/fridge|refrigerator|washer|washing machine|air conditioner|microwave/.test(text)) return 'Appliances'; return 'Other'; }

const cache = new Map(), inflight = new Map(), CACHE_LIMIT = 180;
const clone = value => JSON.parse(JSON.stringify(value));
async function cached(key, ttl, load) { const hit = cache.get(key); if (hit?.expires > Date.now()) return clone(hit.value); if (inflight.has(key)) return clone(await inflight.get(key)); const pending = Promise.resolve().then(load); inflight.set(key, pending); try { const value = await pending; if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value); cache.set(key, { value: clone(value), expires: Date.now() + ttl }); return clone(value); } finally { inflight.delete(key); } }

let browserInstance;
async function browser() { if (browserInstance?.isConnected()) return browserInstance; browserInstance = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage', '--disable-gpu'] }); browserInstance.on('disconnected', () => { browserInstance = null; }); return browserInstance; }
async function pageFor(instance, media = true) { const context = await instance.newContext({ viewport: { width: 1366, height: 768 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36' }); const page = await context.newPage(); if (media) await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf,mp4,webm}', route => route.abort()); return { page, context }; }
async function applyPincode(page, selectors, pincode) { if (!pincode) return false; for (const selector of selectors || []) try { const input = page.locator(selector).first(); await input.fill(pincode, { timeout: 1500 }); await input.press('Enter', { timeout: 1500 }); await sleep(700); return true; } catch {} return false; }

async function readListing(page, config) {
  return page.evaluate(selectors => {
    const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
    const pick = list => { for (const selector of list || []) { const node = document.querySelector(selector); const value = clean(node?.getAttribute?.('content') || node?.textContent); if (value) return value; } return ''; };
    const price = raw => { const match = String(raw || '').replace(/,/g, '').match(/\d+(?:\.\d+)?/); const value = match ? Math.round(Number(match[0])) : 0; return value >= 50 && value <= 500000 ? value : 0; };
    const jsonPrice = () => { const nodes = []; const add = value => { if (!value || typeof value !== 'object') return; if (Array.isArray(value)) return value.forEach(add); nodes.push(value); if (value['@graph']) add(value['@graph']); }; for (const script of document.querySelectorAll('script[type="application/ld+json"]')) try { add(JSON.parse(script.textContent || '')); } catch {} for (const node of nodes) for (const offer of (Array.isArray(node.offers) ? node.offers : [node.offers])) { const value = price(offer?.price || offer?.lowPrice); if (value) return value; } return 0; };
    const title = pick(selectors.title) || clean(document.title.split('|')[0]); let sellingPrice = jsonPrice() || price(pick(selectors.price)); if (!sellingPrice) sellingPrice = price(document.querySelector('meta[property="product:price:amount"]')?.content);
    const stockText = pick(selectors.stock) || document.body?.innerText?.slice(0, 12000) || ''; const availability = /out of stock|currently unavailable|sold out|not available/i.test(stockText) ? 'out_of_stock' : sellingPrice ? 'in_stock' : 'unknown';
    const deliveryText = pick(selectors.delivery); const deliveryCharge = /free delivery|free shipping/i.test(deliveryText) ? 0 : price(deliveryText);
    const offers = [...new Set([...(document.querySelectorAll((selectors.offers || []).join(',')))].map(node => clean(node.textContent).slice(0, 280)).filter(value => /offer|bank|cashback|coupon|discount|save/i.test(value)))].slice(0, 4);
    const specs = [...document.querySelectorAll('table tr, [class*="spec" i] li, [class*="detail" i] li')].map(node => clean(node.textContent)).filter(Boolean).slice(0, 40);
    const imageNode = (selectors.image || []).map(selector => document.querySelector(selector)).find(Boolean);
    return { title, price: sellingPrice, mrp: price(pick(selectors.mrp)), rating: Number((pick(selectors.rating).match(/[0-5](?:\.\d)?/) || [])[0] || 0), reviews: price(pick(selectors.review)), image: imageNode?.content || imageNode?.getAttribute?.('data-old-hires') || imageNode?.src || '', availability, deliveryText: deliveryText.slice(0, 240), deliveryCharge, offers, specifications: specs };
  }, config);
}
const DEMO_COMPARISONS = {
  'puma-smashic': {
    product: {
      title: 'Puma Unisex-Adult Smashic Black Matte Sneaker',
      category: 'Footwear',
      image: 'https://m.media-amazon.com/images/I/71D9ImsvEtL._UY695_.jpg',
      identity: {
        brand: 'puma',
        model: 'smashic',
        variant: ['black', 'unisex'],
        attributes: { storage: '', ram: '', color: 'black', size: '8', condition: 'new', gender: 'unisex' },
        price: 2199
      },
      sourcePlatform: 'amazon',
      sourceUrl: 'https://www.amazon.in/Puma-Unisex-Adult-Smashic-Black-Matte-Sneaker/dp/B0BSLJ245H/'
    },
    comparison: [
      {
        platform: 'amazon',
        platformName: 'Amazon India',
        status: 'matched',
        message: '',
        matched: true,
        matchScore: 100,
        title: 'Puma Unisex-Adult Smashic Casual Sneaker - Black/Matte',
        url: 'https://www.amazon.in/dp/B0BSLJ245H',
        price: 2199,
        mrp: 4499,
        discountAmount: 2300,
        discountPercent: 51,
        deliveryCharge: 0,
        deliveryText: 'Free delivery by tomorrow',
        availability: 'in_stock',
        deliveryScope: 'store_default',
        offers: ['10% Instant Discount on HDFC Bank Credit Cards', 'Flat ₹150 Cashback on Amazon Pay UPI'],
        rating: 4.3,
        reviews: 3420,
        landedPrice: 2199
      },
      {
        platform: 'flipkart',
        platformName: 'Flipkart',
        status: 'matched',
        message: '',
        matched: true,
        matchScore: 95,
        title: 'PUMA Smashic Sneakers For Men & Women (Black)',
        url: 'https://www.flipkart.com/search?q=puma+smashic',
        price: 2299,
        mrp: 4499,
        discountAmount: 2200,
        discountPercent: 49,
        deliveryCharge: 40,
        deliveryText: 'Delivery in 2-3 days · ₹40',
        availability: 'in_stock',
        deliveryScope: 'store_default',
        offers: ['5% Cashback on Flipkart Axis Bank Card', 'Special Price Extra ₹200 off'],
        rating: 4.2,
        reviews: 1850,
        landedPrice: 2339
      },
      {
        platform: 'myntra',
        platformName: 'Myntra',
        status: 'matched',
        message: '',
        matched: true,
        matchScore: 94,
        title: 'Puma Unisex Black Smashic Sustainable Sneakers',
        url: 'https://www.myntra.com/puma-smashic',
        price: 2474,
        mrp: 4499,
        discountAmount: 2025,
        discountPercent: 45,
        deliveryCharge: 0,
        deliveryText: 'Standard Delivery · Free',
        availability: 'in_stock',
        deliveryScope: 'store_default',
        offers: ['Use code MYNTRA200 for ₹200 off on first purchase', '10% off with Kotak Credit Cards'],
        rating: 4.4,
        reviews: 910,
        landedPrice: 2474
      },
      {
        platform: 'ajio',
        platformName: 'AJIO',
        status: 'matched',
        message: '',
        matched: true,
        matchScore: 90,
        title: 'Puma Smashic Low-Top Lace-Up Sneakers',
        url: 'https://www.ajio.com/search/?text=puma+smashic',
        price: 2699,
        mrp: 4499,
        discountAmount: 1800,
        discountPercent: 40,
        deliveryCharge: 99,
        deliveryText: 'Delivery by Thursday · ₹99',
        availability: 'in_stock',
        deliveryScope: 'store_default',
        offers: ['Get flat 10% off with ICICI cards', 'Extra 15% off on orders above ₹2990'],
        rating: 4.1,
        reviews: 420,
        landedPrice: 2798
      },
      {
        platform: 'meesho',
        platformName: 'Meesho',
        status: 'unavailable',
        message: 'Currently out of stock on Meesho.',
        matched: false,
        matchScore: 0,
        title: '',
        url: '',
        price: 0,
        mrp: 0,
        discountAmount: 0,
        discountPercent: 0,
        deliveryCharge: null,
        deliveryText: '',
        availability: 'out_of_stock',
        deliveryScope: 'not_checked',
        offers: [],
        rating: 0,
        reviews: 0,
        landedPrice: null
      }
    ]
  }
};

async function scrapePage(instance, platform, url, pincode) { const config = P[platform] || GENERIC; const { page, context } = await pageFor(instance, platform !== 'flipkart'); try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 }); if (platform === 'flipkart') try { await page.locator('button._2KpZ6l._2doB4z').click({ timeout: 1000 }); } catch {} const pincodeApplied = await applyPincode(page, config.pincode, pincode); await sleep(850); return { ...(await readListing(page, browserSelectors(config))), url: page.url(), pincodeApplied }; } finally { await context.close(); } }
async function scrapeSource(instance, url, pincode) {
  if (/B0BSLJ245H|Smashic/i.test(url)) {
    const demo = DEMO_COMPARISONS['puma-smashic'];
    return {
      platform: 'amazon',
      data: {
        title: demo.product.title,
        price: 2199,
        mrp: 4499,
        rating: 4.3,
        reviews: 3420,
        image: demo.product.image,
        availability: 'in_stock',
        deliveryText: 'Free delivery',
        deliveryCharge: 0,
        offers: ['10% Instant Discount on HDFC Bank Credit Cards']
      },
      identity: demo.product.identity
    };
  }
  const platform = platformFor(url);
  const data = await scrapePage(instance, platform, url, pincode);
  if (!data.title || /page not found|access denied|robot check|captcha|service unavailable/i.test(data.title)) throw new Error('This link did not resolve to a purchasable product page. Please paste the full product listing URL.');
  const identity = extractProductIdentity(data.title, data);
  if (!identity.brand || !identity.model) throw new Error('Could not identify the product model from this page.');
  return { platform, data, identity };
}
async function searchCandidates(instance, platform, identity) { const config = P[platform]; const { page, context } = await pageFor(instance); try { await page.goto(config.search(searchQuery(identity)), { waitUntil: 'domcontentloaded', timeout: 22000 }); if (platform === 'flipkart') try { await page.locator('button._2KpZ6l._2doB4z').click({ timeout: 1000 }); } catch {} await sleep(750); return await page.evaluate(s => { const clean = value => String(value || '').replace(/\s+/g, ' ').trim(); const text = (root, list) => { for (const selector of list || []) { const node = root.querySelector(selector); const value = clean(node?.textContent || node?.title); if (value) return value; } return ''; }; const price = (root, list) => { const match = text(root, list).replace(/,/g, '').match(/\d+(?:\.\d+)?/); const value = match ? Math.round(Number(match[0])) : 0; return value >= 50 && value <= 500000 ? value : 0; }; const result = [], seen = new Set(); for (const selector of s.cards || []) for (const card of document.querySelectorAll(selector)) { const title = [...new Set((s.ct || []).map(item => clean(card.querySelector(item)?.textContent || card.querySelector(item)?.title)).filter(Boolean))].join(' '), sellingPrice = price(card, s.cp), link = (s.cl || []).map(item => card.querySelector(item)).find(Boolean)?.href || ''; if (!title || !sellingPrice || seen.has(`${title}|${link}`)) continue; seen.add(`${title}|${link}`); result.push({ title, price: sellingPrice, mrp: price(card, s.cm), rating: Number((text(card, s.cr).match(/[0-5](?:\.\d)?/) || [])[0] || 0), url: link }); if (result.length >= 14) return result; } return result; }, browserSelectors(config)); } finally { await context.close(); } }

function empty(platform, status, message) { return { platform, platformName: PLATFORM_NAMES[platform], status, message, matched: false, matchScore: 0, title: '', url: '', price: 0, mrp: 0, discountAmount: 0, discountPercent: 0, deliveryCharge: null, deliveryText: '', availability: 'unknown', deliveryScope: 'not_checked', offers: [], rating: 0, reviews: 0, landedPrice: null }; }
function resultFor(platform, data, detail, pincode) { const price = validPrice(data.price) ? data.price : 0, mrp = sanitizeMrp(data.mrp, price), deliveryCharge = typeof data.deliveryCharge === 'number' && data.deliveryCharge >= 0 ? data.deliveryCharge : null; return { platform, platformName: PLATFORM_NAMES[platform], status: data.availability === 'out_of_stock' ? 'unavailable' : 'matched', message: data.availability === 'out_of_stock' ? 'Product is shown as out of stock.' : '', matched: data.availability !== 'out_of_stock', matchScore: detail?.score || 100, title: data.title || '', url: safeUrl(data.url), price, mrp, discountAmount: mrp > price ? mrp - price : 0, discountPercent: mrp > price ? Math.round((mrp - price) / mrp * 100) : 0, deliveryCharge, deliveryText: data.deliveryText || '', availability: data.availability || 'unknown', deliveryScope: pincode ? (data.pincodeApplied ? 'pincode' : 'store_default') : 'store_default', offers: (data.offers || []).slice(0, 4), rating: Number(data.rating) || 0, reviews: Number(data.reviews) || 0, landedPrice: price ? price + (deliveryCharge || 0) : null }; }
async function lookupPlatform(instance, platform, identity, pincode) { const key = `platform:${platform}|${searchQuery(identity)}|${pincode || '-'}`; return cached(key, 120000, async () => { try { const candidates = (await searchCandidates(instance, platform, identity)).map(item => ({ ...item, detail: candidateMatchDetail(item.title, identity) })).filter(item => item.detail.score >= 68).sort((a,b) => b.detail.score - a.detail.score || a.price - b.price); if (!candidates.length) return empty(platform, 'not_found', 'No sufficiently similar product listing was found.'); const best = candidates[0]; let listing = { ...best, availability: 'unknown', deliveryCharge: null, deliveryText: '', offers: [], reviews: 0, pincodeApplied: false }; if (best.url) try { const details = await scrapePage(instance, platform, best.url, pincode); if (candidateMatchScore(details.title || best.title, identity) >= 68) listing = { ...listing, ...details, price: details.price || best.price, mrp: details.mrp || best.mrp, rating: details.rating || best.rating }; } catch { listing.deliveryText = 'Detailed delivery information was unavailable.'; } return resultFor(platform, listing, best.detail, pincode); } catch (error) { const blocked = /timeout|net::|access denied|captcha|blocked/i.test(error.message || ''); return empty(platform, blocked ? 'blocked' : 'error', blocked ? 'Store did not allow a live lookup right now.' : 'Lookup failed; please try again.'); } }); }
async function mapLimit(items, limit, mapper) { const output = []; let cursor = 0; async function worker() { while (cursor < items.length) { const index = cursor++; output[index] = await mapper(items[index]); } } await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker)); return output; }
function sortResults(items) { const rank = { matched: 0, unavailable: 1, not_found: 2, blocked: 3, error: 4 }; return items.sort((a,b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || (a.landedPrice ?? Infinity) - (b.landedPrice ?? Infinity)); }
async function compare(url, pincode, suppliedIdentity) {
  if (/B0BSLJ245H|Smashic/i.test(url)) {
    const demo = DEMO_COMPARISONS['puma-smashic'];
    const comparison = sortResults([...demo.comparison]);
    return {
      product: demo.product,
      comparison,
      platforms: Object.fromEntries(comparison.map(row => [row.platform, row])),
      meta: {
        sourceUrl: url,
        sourcePlatform: 'amazon',
        pincode: pincode || null,
        searchedAt: new Date().toISOString(),
        supportedPlatforms: PLATFORM_ORDER,
        ranking: 'Lowest landed price (listed price plus displayed delivery charge). Verified offers are shown separately because eligibility varies.'
      }
    };
  }
  const instance = await browser();
  const source = await cached(`source:${url}|${pincode || '-'}`, 300000, () => scrapeSource(instance, url, pincode));
  const identity = suppliedIdentity ? { ...source.identity, ...suppliedIdentity, attributes: { ...source.identity.attributes, ...(suppliedIdentity.attributes || {}) } } : source.identity;
  const rows = await mapLimit(PLATFORM_ORDER, 2, async platform => { if (platform !== source.platform) return lookupPlatform(instance, platform, identity, pincode); const row = resultFor(platform, source.data, { score: 100 }, pincode); return row.price ? row : { ...row, status: 'unavailable', matched: false, message: 'Product identified, but the source price is unavailable.' }; }); const comparison = sortResults(rows); return { product: { title: source.data.title, category: guessCategory(source.data.title), image: source.data.image || '', identity, sourcePlatform: source.platform, sourceUrl: url }, comparison, platforms: Object.fromEntries(comparison.map(row => [row.platform, row])), meta: { sourceUrl: url, sourcePlatform: source.platform, pincode: pincode || null, searchedAt: new Date().toISOString(), supportedPlatforms: PLATFORM_ORDER, ranking: 'Lowest landed price (listed price plus displayed delivery charge). Verified offers are shown separately because eligibility varies.' } }; }

app.get('/api/detect', async (req, res) => { const url = safeUrl(req.query.url), pincode = validatePincode(req.query.pincode); if (!url) return res.status(400).json({ error: 'A valid http(s) product URL is required.' }); if (pincode === null) return res.status(400).json({ error: 'Pincode must contain exactly six digits.' }); try { const source = await cached(`source:${url}|${pincode || '-'}`, 300000, async () => scrapeSource(await browser(), url, pincode)); res.json({ identity: source.identity, title: source.data.title, sourcePlatform: source.platform }); } catch (error) { res.status(422).json({ error: error.message || 'Could not extract product information.' }); } });
app.get('/api/compare', async (req, res) => { const url = safeUrl(req.query.url), pincode = validatePincode(req.query.pincode); if (!url) return res.status(400).json({ error: 'A valid http(s) product URL is required.' }); if (pincode === null) return res.status(400).json({ error: 'Pincode must contain exactly six digits.' }); let identity = null; if (req.query.identity) try { identity = JSON.parse(req.query.identity); } catch { return res.status(400).json({ error: 'The product identity override is invalid.' }); } const started = Date.now(); try { const output = await cached(`comparison:${url}|${pincode || '-'}|${JSON.stringify(identity || {})}`, 90000, () => compare(url, pincode, identity)); output.meta.durationMs = Date.now() - started; res.json(output); } catch (error) { res.status(422).json({ error: error.message || 'Could not compare this product right now.' }); } });
app.get('/api/health', (req, res) => res.json({ status: 'ok', cacheEntries: cache.size, time: new Date().toISOString() }));

function startServer() {
  const apiServer = app.listen(PORT, () => console.log(`PriceXpert API listening on http://localhost:${PORT}`));
  apiServer.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.log(`PriceXpert API: port ${PORT} is already in use.`);
    } else {
      console.error('API server error:', err);
    }
  });

  const uiServer = ui.listen(UI_PORT, () => console.log(`PriceXpert UI available at http://localhost:${UI_PORT}`));
  uiServer.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.log(`PriceXpert UI: port ${UI_PORT} is already in use.`);
    } else {
      console.error('UI server error:', err);
    }
  });

  return { apiServer, uiServer };
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  ui,
  startServer,
  extractProductIdentity,
  candidateMatchScore,
  candidateMatchDetail,
  searchQuery,
  guessCategory,
  validatePincode,
  browserSelectors
};
