/* =========================================================
   PALMA website engine.
   You don't need to edit this file: products and store settings
   are managed from the admin panel at  /admin
   (they are saved in data/products.json and data/settings.json).
   ========================================================= */

const ALL_CATEGORIES = { shower: 'Shower gels', hand: 'Hand washes', bundle: 'Bundles', shampoo: 'Shampoos' };
// Categories shown on the site (chosen in Store settings → "Categories on the website").
let CATEGORIES = { ...ALL_CATEGORIES };
function applyCategories() {
  const on = Array.isArray(CONFIG.categories) && CONFIG.categories.length ? CONFIG.categories : Object.keys(ALL_CATEGORIES);
  CATEGORIES = Object.fromEntries(Object.entries(ALL_CATEGORIES).filter(([id]) => on.includes(id)));
}
const categoryList = () => {
  const n = Object.values(CATEGORIES).map((x) => x.toLowerCase());
  const t = n.length > 1 ? n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1] : n[0] || '';
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const TYPE_LABEL = { shower: 'Shower gel', shampoo: 'Shampoo', hand: 'Hand wash', bundle: 'Bundle' };
const THEMES = {
  sea:   { color: '#8DB7C7', bg: '#E3ECEE' },
  amber: { color: '#C98A52', bg: '#F1E7DC' },
  sage:  { color: '#A8BF9E', bg: '#E6ECE1' },
  rose:  { color: '#D9A0A0', bg: '#F4E6E4' },
  sand:  { color: '#D8C3A0', bg: '#F3EDE2' },
  lilac: { color: '#B5A7CF', bg: '#ECE8F3' }
};

let CONFIG = {};
const IN_PREVIEW = new URLSearchParams(location.search).has('preview') && window.parent !== window;
let PRODUCTS = [];

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'product';
const money = (n) => (Number(n) > 0 ? `${CONFIG.currency || 'EGP'} ${Number(n).toLocaleString('en-US')}` : 'Price soon');
const findProduct = (id) => PRODUCTS.find((p) => p.id === id);
const productUrl = (p) => `product.html?id=${encodeURIComponent(p.id)}`;
const theme = (t) => THEMES[t] || THEMES.sage;
const waNumber = () => String(CONFIG.whatsapp || '').replace(/\D/g, '');

function normalizeProducts(list) {
  const seen = {};
  return (list || []).filter((p) => p && p.name && CATEGORIES[p.category]).map((p) => {
    let id = slug(p.name); seen[id] = (seen[id] || 0) + 1; if (seen[id] > 1) id += '-' + seen[id];
    const t = theme(p.theme);
    return { ...p, id, color: t.color, bg: t.bg, price: Number(p.price) || 0, compareAt: Number(p.compareAtPrice) || 0, includes: (p.includes || []).map((x) => (typeof x === 'string' ? x : x && x.item)).filter(Boolean), inStock: p.inStock !== false, gallery: (p.gallery || []).map((g) => (typeof g === 'string' ? g : g && g.image)).filter(Boolean) };
  });
}

async function loadData() {
  const get = (u) => fetch(u, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  const [settings, products] = await Promise.all([get('data/settings.json'), get('data/products.json')]);
  CONFIG = settings || {};
  applyCategories();
  loadData.lastProducts = products.products;
  PRODUCTS = normalizeProducts(products.products);
}

// How a product photo sits in its box, from the product's "Photo display" settings.
function photoStyle(p) {
  const fit = p.photoFit === 'whole' ? 'contain' : 'cover';
  const pos = { center: 'center', top: 'center top', bottom: 'center bottom', left: 'left center', right: 'right center' }[p.photoPosition] || 'center';
  const zoom = Math.min(200, Math.max(50, Number(p.photoZoom) || 100)) / 100;
  const pad = fit === 'contain' ? 'padding:6%;box-sizing:border-box;' : '';
  return `object-fit:${fit};object-position:${pos};transform:scale(${zoom});transform-origin:${pos};${pad}`;
}

// Photo box colour: "site" (default) = the website's main background colour,
// "auto" = match the photo's own background, "colour" = the product's colour.
const boxMode = (p) => (['auto', 'colour'].includes(p.photoBackground) ? p.photoBackground : 'site');
const boxBg = (p) => (p.photo && boxMode(p) === 'site' ? 'var(--bg)' : p.bg);

function photoTag(p, src, lazy = true) {
  const mode = boxMode(p);
  // In "site" mode the photo's white studio background melts into the website colour.
  const blend = mode === 'site' ? 'mix-blend-mode:multiply;' : '';
  return `<img class="photo" src="${esc(src)}" alt="${esc(p.name)}" style="${photoStyle(p)}${blend}"${mode === 'auto' ? ' data-autobg' : ''}${mode === 'site' ? ' data-sitebg' : ''}${lazy ? ' loading="lazy"' : ''}>`;
}

/* Makes the box around a photo the same colour as the photo's own background,
   by reading the colour at the photo's edges once it has loaded. */
function edgeColour(img) {
  // Average colour of the photo's outer edge, or null if the edge is busy (not a plain background).
  try {
    const c = document.createElement('canvas'); const n = 24; c.width = n; c.height = n;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, n, n);
    const px = g.getImageData(0, 0, n, n).data;
    const pts = [];
    for (let i = 0; i < n; i++) for (const [x, y] of [[i, 0], [i, n - 1], [0, i], [n - 1, i]]) {
      const o = (y * n + x) * 4; if (px[o + 3] >= 200) pts.push([px[o], px[o + 1], px[o + 2]]);
    }
    if (!pts.length) return null;
    const m = [0, 1, 2].map((j) => pts.reduce((a, q) => a + q[j], 0) / pts.length);
    const v = pts.reduce((a, q) => a + Math.abs(q[0] - m[0]) + Math.abs(q[1] - m[1]) + Math.abs(q[2] - m[2]), 0) / pts.length;
    return v > 36 ? null : m;
  } catch (e) { return null; } // photo from another site
}

function matchPhotoBackground(img) {
  const m = edgeColour(img); if (!m) return;
  const box = img.closest('.media, .pdp-media, .thumb, .hero-art');
  if (box) box.style.background = `rgb(${m.map(Math.round).join(', ')})`;
}

// Website-colour mode: brighten a light studio background to pure white, so that
// (with multiply blending) it becomes exactly the website's main colour.
function blendIntoSite(img) {
  const m = edgeColour(img); if (!m) return;
  const low = Math.min(...m);
  if (low < 170) return; // dark background: leave the photo as it is
  img.style.filter = `brightness(${Math.min(1.4, 255 / low).toFixed(3)})`;
}

document.addEventListener('load', (e) => {
  const img = e.target;
  if (img.tagName !== 'IMG') return;
  if (img.hasAttribute('data-autobg')) matchPhotoBackground(img);
  if (img.hasAttribute('data-sitebg')) blendIntoSite(img);
}, true);

function visual(p, w = 104, h = 220) {
  if (p.photo) return photoTag(p, p.photo);
  return `<div class="bottle" style="--c:${p.color};--w:${w}px;--h:${h}px" aria-hidden="true"><span class="cap"></span><span class="body"><span class="label"><b>${esc((CONFIG.brand || 'palma').toLowerCase())}</b>${w >= 100 && p.scent ? esc(p.scent) : ''}</span></span></div>`;
}

// Price with the original price struck through when a lower bundle/sale price is set.
function priceHtml(p) {
  if (p.compareAt > p.price && p.price > 0) {
    return `${money(p.price)} <s class="was">${money(p.compareAt)}</s>`;
  }
  return money(p.price);
}
const saveBadge = (p) => (p.compareAt > p.price && p.price > 0 ? `<span class="save">Save ${money(p.compareAt - p.price)}</span>` : '');

function card(p) {
  return `<article class="card">
    <a class="media" href="${productUrl(p)}" style="background:${boxBg(p)}" aria-label="${esc(p.name)}">${visual(p)}${saveBadge(p)}</a>
    <div class="info">
      <div><p class="type">${TYPE_LABEL[p.category] || ''}</p><h3><a href="${productUrl(p)}">${esc(p.name)}</a></h3>${p.includes.length ? `<p class="size">Includes ${p.includes.length} item${p.includes.length === 1 ? '' : 's'}</p>` : p.volume ? `<p class="size">${esc(p.volume)}</p>` : ''}</div>
      <p class="price">${priceHtml(p)}</p>
    </div>
    ${p.inStock ? `<button class="btn ghost" data-add="${p.id}">Add to cart</button>` : `<button class="btn ghost" disabled>Sold out</button>`}
  </article>`;
}

/* ---------- cart (saved in the visitor's browser) ---------- */
const CART_KEY = 'palma-cart';
function getCart() {
  try { return (JSON.parse(localStorage.getItem(CART_KEY)) || []).filter((l) => { const p = findProduct(l.id); return p && p.inStock; }); } catch { return []; }
}
function saveCart(c) { try { localStorage.setItem(CART_KEY, JSON.stringify(c)); } catch {} updateBadge(); }
function addToCart(id, qty = 1) {
  const c = getCart(); const l = c.find((x) => x.id === id);
  if (l) l.qty += qty; else c.push({ id, qty });
  saveCart(c);
  toast('Added to cart', true);
}
function setQty(id, qty) {
  let c = getCart();
  c = qty <= 0 ? c.filter((x) => x.id !== id) : c.map((x) => (x.id === id ? { ...x, qty } : x));
  saveCart(c);
}
const cartCount = () => getCart().reduce((n, l) => n + l.qty, 0);
function updateBadge() {
  const b = $('#cart-badge'); if (!b) return;
  const n = cartCount(); b.textContent = n; b.hidden = n === 0;
  $('#cart-link').setAttribute('aria-label', `Cart, ${n} item${n === 1 ? '' : 's'}`);
}

let toastTimer;
function toast(msg, withLink) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.innerHTML = esc(msg) + (withLink ? ' <a href="checkout.html">View cart</a>' : '');
  t.classList.add('show'); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ---------- shared header & footer ---------- */
function renderChrome() {
  const page = document.body.dataset.page;
  const brand = esc((CONFIG.brand || 'Palma').toLowerCase());
  const urlCat = new URLSearchParams(location.search).get('cat') || Object.keys(CATEGORIES)[0];
  const curCat = (c) => (page === 'shop' && urlCat === c ? ' aria-current="page"' : '');
  const top = Number(CONFIG.freeDeliveryOver) > 0 ? `Free delivery on orders over ${money(CONFIG.freeDeliveryOver)}` : (CONFIG.topBarText || '');
  $('#site-header').innerHTML = `
  ${top ? `<div class="topbar">${esc(top)}</div>` : ''}
  <div class="site-header"><div class="wrap">
    <a class="logo" href="index.html">${brand}</a>
    <nav class="nav" id="nav" aria-label="Main">
      ${Object.entries(CATEGORIES).map(([id, l]) => `<a href="shop.html?cat=${id}"${curCat(id)}>${l}</a>`).join('')}
      <a href="index.html#story">Our story</a>
    </nav>
    <div class="header-actions">
      <a class="icon-btn" id="cart-link" href="checkout.html" aria-label="Cart"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg><span class="badge" id="cart-badge" hidden>0</span></a>
      <button class="icon-btn menu-btn" id="menu-btn" aria-label="Menu" aria-expanded="false" aria-controls="nav"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
    </div>
  </div></div>`;
  $('#menu-btn').addEventListener('click', (e) => {
    const open = $('#nav').classList.toggle('open');
    e.currentTarget.setAttribute('aria-expanded', open);
  });

  const social = [['Instagram', CONFIG.instagram], ['TikTok', CONFIG.tiktok], ['Facebook', CONFIG.facebook]].filter(([, u]) => u);
  $('#site-footer').innerHTML = `<footer class="site-footer"><div class="wrap">
    <div class="cols">
      <div><p class="logo">${brand}</p><p style="color:var(--muted);line-height:1.6">${esc(categoryList())}.</p></div>
      <div><p class="h">Shop</p>${Object.entries(CATEGORIES).map(([id, l]) => `<a href="shop.html?cat=${id}">${l}</a>`).join('')}</div>
      <div><p class="h">Help</p><a href="https://wa.me/${waNumber()}" target="_blank" rel="noopener">WhatsApp us</a><a href="checkout.html">Your cart</a><span style="color:var(--muted)">Cash on delivery</span></div>
      ${social.length ? `<div><p class="h">Follow</p>${social.map(([l, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${l}</a>`).join('')}</div>` : ''}
    </div>
    <p class="legal">© ${new Date().getFullYear()} ${esc(CONFIG.brand || 'Palma')}. All rights reserved.</p>
  </div></footer>`;
  updateBadge();
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-add]');
  if (b) addToCart(b.dataset.add, 1);
});

const setText = (id, v) => { const el = document.getElementById(id); if (el && v) el.textContent = v; };

/* ---------- pages ---------- */
function initHome() {
  setText('hero-eyebrow', CONFIG.heroEyebrow);
  setText('hero-title', CONFIG.heroTitle);
  setText('hero-text', CONFIG.heroText);
  setText('story-title', CONFIG.storyTitle);
  setText('story-text', CONFIG.storyText);
  $('#wa-band').href = `https://wa.me/${waNumber()}`;

  const art = $('#hero-art');
  art.classList.toggle('has-photo', !!CONFIG.heroImage);
  if (CONFIG.heroImage) {
    const pos = { center: 'center', top: 'center top', bottom: 'center bottom', left: 'left center', right: 'right center' }[CONFIG.heroImagePosition] || 'center';
    art.innerHTML = `<img class="photo" src="${esc(CONFIG.heroImage)}" alt="" style="object-position:${pos}">`;
    // On phones the box takes the photo's own shape, so the whole photo shows.
    const img = art.querySelector('img');
    const setRatio = () => img.naturalWidth && art.style.setProperty('--ratio', `${img.naturalWidth} / ${img.naturalHeight}`);
    img.complete ? setRatio() : img.addEventListener('load', setRatio);
  } else {
    art.innerHTML = PRODUCTS.slice(0, 3).map((p, i) => visual({ ...p, photo: '' }, i === 1 ? 128 : 112, [240, 310, 270][i])).join('');
  }

  $('#cats').innerHTML = Object.entries(CATEGORIES).map(([id, label]) => {
    const p = PRODUCTS.find((x) => x.category === id) || { ...THEMES.sage, scent: '' };
    return `<a class="cat-card" href="shop.html?cat=${id}" style="background:${p.bg}"><div class="art">${visual({ ...p, photo: '' }, 96, 190)}</div><div class="row"><span>${label}</span><span>Shop →</span></div></a>`;
  }).join('');


  const featured = PRODUCTS.filter((p) => p.featured);
  $('#bestsellers').innerHTML = (featured.length ? featured : PRODUCTS).slice(0, 8).map(card).join('');
}

function initShop() {
  const lead = $('#shop-lead'); if (lead) lead.textContent = `${categoryList()} in every ${CONFIG.brand || 'Palma'} scent.`;
  const params = new URLSearchParams(location.search);
  let cat = CATEGORIES[params.get('cat')] ? params.get('cat') : Object.keys(CATEGORIES)[0];
  let scent = params.get('scent') || 'all';
  const pills = $('#pills'), row = $('#scent-row');

  // The scents that exist in a category, taken from the products' "Scent name" field.
  const scentsIn = (c) => {
    const map = new Map();
    PRODUCTS.filter((p) => (c === 'all' || p.category === c) && p.scent && p.scent.trim()).forEach((p) => {
      const id = slug(p.scent);
      if (!map.has(id)) map.set(id, { id, name: p.scent.trim(), color: p.color, count: 0 });
      map.get(id).count++;
    });
    return [...map.values()];
  };
  const setUrl = () => {
    const q = new URLSearchParams();
    if (cat !== 'all') q.set('cat', cat);
    if (cat !== 'all' && scent !== 'all') q.set('scent', scent);
    if (IN_PREVIEW) q.set('preview', '1');
    history.replaceState(null, '', 'shop.html' + (q.toString() ? '?' + q : ''));
  };

  const draw = () => {
    pills.innerHTML = Object.entries(CATEGORIES).map(([id, l]) => `<button class="pill" data-cat="${id}" aria-pressed="${id === cat}">${l}</button>`).join('');

    const scents = cat === 'all' ? [] : scentsIn(cat);
    if (!scents.some((x) => x.id === scent)) scent = 'all';
    row.hidden = scents.length === 0;
    row.innerHTML = scents.length ? `<p class="scent-label" id="scent-label">${esc(CATEGORIES[cat])} scents</p>
      <div class="pills" role="group" aria-labelledby="scent-label">
        <button class="pill" data-scent="all" aria-pressed="${scent === 'all'}">All scents</button>
        ${scents.map((x) => `<button class="pill scent-pill" data-scent="${x.id}" aria-pressed="${x.id === scent}"><span class="dot" style="background:${x.color}" aria-hidden="true"></span>${esc(x.name)}</button>`).join('')}
      </div>` : '';

    let list = cat === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.category === cat);
    if (scent !== 'all') list = list.filter((p) => p.scent && slug(p.scent) === scent);
    $('#shop-grid').innerHTML = list.length ? list.map(card).join('') : '<p class="lead">New products coming soon.</p>';
    $('#count').textContent = `${list.length} product${list.length === 1 ? '' : 's'}`;
    const chosen = scents.find((x) => x.id === scent);
    const title = cat === 'all' ? 'Shop all' : CATEGORIES[cat] + (chosen ? ' · ' + chosen.name : '');
    $('#shop-title').textContent = title;
    document.title = `${title} — ${CONFIG.brand || 'Palma'}`;
  };
  pills.onclick = (e) => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    cat = b.dataset.cat; scent = 'all'; setUrl(); draw();
  };
  row.onclick = (e) => {
    const b = e.target.closest('[data-scent]'); if (!b) return;
    scent = b.dataset.scent; setUrl(); draw();
  };
  draw();
}

function initProduct() {
  const p = findProduct(new URLSearchParams(location.search).get('id')) || PRODUCTS[0];
  if (!p) { $('#pdp').innerHTML = '<p class="lead">Product not found. <a href="shop.html">Back to shop</a></p>'; return; }
  document.title = `${p.name} — ${CONFIG.brand || 'Palma'}`;
  let qty = 1;
  const tabs = [
    ['use', 'How to use', p.howToUse],
    ['ing', 'Ingredients', p.ingredients],
    ['notes', 'Scent notes', p.notes]
  ].filter((t) => t[2]);
  const photos = [p.photo, ...p.gallery].filter(Boolean);
  $('#pdp').innerHTML = `
    <div style="flex:1 1 480px;min-width:0;display:flex;flex-direction:column;gap:12px">
      <div class="pdp-media" id="main-media" style="background:${boxBg(p)}">${visual(p, 160, 380)}</div>
      ${photos.length > 1 ? `<div class="thumbs">${photos.map((src, i) => `<button class="thumb-btn" data-src="${esc(src)}" aria-label="Photo ${i + 1}" aria-pressed="${i === 0}"><img src="${esc(src)}" alt=""></button>`).join('')}</div>` : ''}
    </div>
    <div class="pdp-info">
      <div>
        <p class="eyebrow">${TYPE_LABEL[p.category] || ''}${p.mood ? ' · ' + esc(p.mood) : ''}</p>
        <h1>${esc(p.name)}</h1>
      </div>
      <p class="pdp-price">${priceHtml(p)} ${p.volume ? `<span>· ${esc(p.volume)}</span>` : ''} ${saveBadge(p)}</p>
      ${p.includes.length ? `<div class="includes"><p class="eyebrow">What's inside</p><ul>${p.includes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${p.description ? `<p class="lead" style="white-space:pre-line">${esc(p.description)}</p>` : ''}
      ${p.inStock ? `<div class="buy">
        <div class="qty"><button id="q-minus" aria-label="Decrease quantity">−</button><span id="q" aria-live="polite">1</span><button id="q-plus" aria-label="Increase quantity">+</button></div>
        <button class="btn" id="add">Add to cart</button>
      </div>` : `<button class="btn" disabled>Sold out</button>`}
      <div class="perks"><div>Cash on delivery</div><div>No account needed</div><div>Pay when it arrives</div></div>
      ${tabs.length ? `<div class="tabs">
        <div class="tablist" role="tablist" aria-label="Product details">${tabs.map(([id, l], i) => `<button class="tab" role="tab" aria-selected="${i === 0}" aria-controls="panel">${l}</button>`).join('')}</div>
        <p class="tabpanel" id="panel" role="tabpanel">${esc(tabs[0][2])}</p>
      </div>` : ''}
    </div>`;
  $('#crumb-cat').textContent = CATEGORIES[p.category] || 'Shop';
  $('#crumb-cat').href = `shop.html?cat=${p.category}`;
  $('#crumb-name').textContent = p.name;
  if (p.inStock) {
    $('#q-minus').onclick = () => { qty = Math.max(1, qty - 1); $('#q').textContent = qty; };
    $('#q-plus').onclick = () => { qty += 1; $('#q').textContent = qty; };
    $('#add').onclick = () => addToCart(p.id, qty);
  }
  document.querySelectorAll('.tab').forEach((t, i) => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((x) => x.setAttribute('aria-selected', x === t));
    $('#panel').textContent = tabs[i][2];
  }));
  document.querySelectorAll('.thumb-btn').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('.thumb-btn').forEach((x) => x.setAttribute('aria-pressed', x === b));
    $('#main-media').innerHTML = photoTag(p, b.dataset.src, false);
  }));
  const related = PRODUCTS.filter((x) => x.id !== p.id);
  if (!related.length) $('#related-wrap').hidden = true;
  $('#related').innerHTML = related.slice(0, 4).map(card).join('');
}

function initCheckout() {
  const totals = () => {
    const sub = getCart().reduce((s, l) => s + findProduct(l.id).price * l.qty, 0);
    const over = Number(CONFIG.freeDeliveryOver) || 0;
    const del = over > 0 && sub >= over ? 0 : Number(CONFIG.deliveryFee) || 0;
    return { sub, del, total: sub + del };
  };
  const draw = () => {
    const cart = getCart();
    if (!cart.length) {
      $('#checkout').innerHTML = `<div class="empty"><p class="lead">Your cart is empty.</p><a class="btn" href="shop.html">Start shopping</a></div>`;
      return;
    }
    const t = totals();
    $('#lines').innerHTML = cart.map((l) => {
      const p = findProduct(l.id);
      return `<div class="line">
        <a class="thumb" href="${productUrl(p)}" style="background:${boxBg(p)}" aria-label="${esc(p.name)}">${visual(p, 40, 64)}</a>
        <div class="meta"><b>${esc(p.name)}</b><small>${money(p.price)}${p.volume ? ' · ' + esc(p.volume) : ''}</small></div>
        <div class="end">
          <div class="qty"><button data-q="${p.id}" data-d="-1" aria-label="Decrease ${esc(p.name)}">−</button><span>${l.qty}</span><button data-q="${p.id}" data-d="1" aria-label="Increase ${esc(p.name)}">+</button></div>
          <button class="link-btn" data-rm="${p.id}">Remove</button>
        </div>
      </div>`;
    }).join('');
    $('#totals').innerHTML = `<div><span>Subtotal</span><span>${money(t.sub)}</span></div>
      <div><span>Delivery</span><span>${t.del > 0 ? money(t.del) : 'Free'}</span></div>
      <div class="grand"><span>Total</span><span>${money(t.total)}</span></div>`;
  };

  $('#lines').addEventListener('click', (e) => {
    const q = e.target.closest('[data-q]'), rm = e.target.closest('[data-rm]');
    if (q) { const l = getCart().find((x) => x.id === q.dataset.q); setQty(l.id, l.qty + Number(q.dataset.d)); draw(); }
    if (rm) { setQty(rm.dataset.rm, 0); draw(); }
  });

  $('#order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target, btn = form.querySelector('button[type=submit]'), err = $('#order-error');
    const f = new FormData(form);
    const cart = getCart(); if (!cart.length) return;
    err.hidden = true; btn.disabled = true; btn.textContent = 'Placing your order…';
    try {
      const res = await fetch('/api/order', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          customer: { name: f.get('name'), phone: f.get('phone'), city: f.get('city'), address: f.get('address'), notes: f.get('notes') },
          items: cart, website: f.get('website')
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'We could not place your order. Please try again.');
      saveCart([]);
      const s = data.summary || { items: [] };
      const m = (n) => (n > 0 ? `${s.currency || 'EGP'} ${Number(n).toLocaleString('en-US')}` : 'Free');
      $('.page-head h1').textContent = 'Order placed';
      $('#checkout').innerHTML = `<div class="done" style="flex:1 1 100%">
        <p class="eyebrow">Order ${esc(data.order)}</p>
        <h2 style="font-size:36px">Thank you, ${esc(f.get('name'))}!</h2>
        <p class="lead">We've received your order and will call you on <b>${esc(f.get('phone'))}</b> to confirm delivery. You pay cash when it arrives.</p>
        <div class="totals" style="width:100%;max-width:460px;background:var(--white);border-radius:16px;padding:20px">
          ${s.items.map((i) => `<div><span>${i.qty} × ${esc(i.name)}</span><span>${i.total > 0 ? m(i.total) : ''}</span></div>`).join('')}
          <div><span>Delivery</span><span>${m(s.delivery)}</span></div>
          <div class="grand"><span>Total</span><span>${s.total > 0 ? m(s.total) : '—'}</span></div>
        </div>
        <a class="btn" href="shop.html">Continue shopping</a></div>`;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (x) {
      err.textContent = x.message || 'Something went wrong. Please try again.';
      err.hidden = false; btn.disabled = false; btn.textContent = 'Place order';
    }
  });
  draw();
}

const renderPage = () => {
  renderChrome();
  ({ home: initHome, shop: initShop, product: initProduct, checkout: initCheckout })[document.body.dataset.page]?.();
};

/* Live preview: when this page is shown inside the admin panel, it receives the
   unsaved changes from the editor and redraws instantly. */
if (IN_PREVIEW) {
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (e.origin !== location.origin || !d || d.type !== 'palma-preview') return;
    if (d.kind === 'settings' && d.data) { CONFIG = d.data; applyCategories(); loadData.lastProducts && (PRODUCTS = normalizeProducts(loadData.lastProducts)); }
    if (d.kind === 'products' && d.data) { loadData.lastProducts = d.data.products; PRODUCTS = normalizeProducts(d.data.products); }
    try { renderPage(); } catch (err) { console.error(err); }
  });
}

(async () => {
  await loadData();
  renderPage();
  if (IN_PREVIEW) window.parent.postMessage({ type: 'palma-preview-ready' }, location.origin);
})();
