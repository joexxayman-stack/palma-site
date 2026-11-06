/* =========================================================
   PALMA website engine.
   You don't need to edit this file: products and store settings
   are managed from the admin panel at  /admin
   (they are saved in data/products.json and data/settings.json).
   ========================================================= */

const CATEGORIES = { shower: 'Shower gels', shampoo: 'Shampoos', hand: 'Hand washes' };
const TYPE_LABEL = { shower: 'Shower gel', shampoo: 'Shampoo', hand: 'Hand wash' };
const THEMES = {
  sea:   { color: '#8DB7C7', bg: '#E3ECEE' },
  amber: { color: '#C98A52', bg: '#F1E7DC' },
  sage:  { color: '#A8BF9E', bg: '#E6ECE1' },
  rose:  { color: '#D9A0A0', bg: '#F4E6E4' },
  sand:  { color: '#D8C3A0', bg: '#F3EDE2' },
  lilac: { color: '#B5A7CF', bg: '#ECE8F3' }
};

let CONFIG = {};
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
  return (list || []).filter((p) => p && p.name).map((p) => {
    let id = slug(p.name); seen[id] = (seen[id] || 0) + 1; if (seen[id] > 1) id += '-' + seen[id];
    const t = theme(p.theme);
    return { ...p, id, color: t.color, bg: t.bg, price: Number(p.price) || 0, inStock: p.inStock !== false, gallery: (p.gallery || []).map((g) => (typeof g === 'string' ? g : g && g.image)).filter(Boolean) };
  });
}

async function loadData() {
  const get = (u) => fetch(u, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  const [settings, products] = await Promise.all([get('data/settings.json'), get('data/products.json')]);
  CONFIG = settings || {};
  PRODUCTS = normalizeProducts(products.products);
}

function visual(p, w = 104, h = 220) {
  if (p.photo) return `<img class="photo" src="${esc(p.photo)}" alt="${esc(p.name)}" loading="lazy">`;
  return `<div class="bottle" style="--c:${p.color};--w:${w}px;--h:${h}px" aria-hidden="true"><span class="cap"></span><span class="body"><span class="label"><b>${esc((CONFIG.brand || 'palma').toLowerCase())}</b>${w >= 100 && p.scent ? esc(p.scent) : ''}</span></span></div>`;
}

function card(p) {
  return `<article class="card">
    <a class="media" href="${productUrl(p)}" style="background:${p.bg}" aria-label="${esc(p.name)}">${visual(p)}</a>
    <div class="info">
      <div><p class="type">${TYPE_LABEL[p.category] || ''}</p><h3><a href="${productUrl(p)}">${esc(p.name)}</a></h3>${p.volume ? `<p class="size">${esc(p.volume)}</p>` : ''}</div>
      <p class="price">${money(p.price)}</p>
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
  const cur = (p) => (page === p ? ' aria-current="page"' : '');
  const top = Number(CONFIG.freeDeliveryOver) > 0 ? `Free delivery on orders over ${money(CONFIG.freeDeliveryOver)}` : (CONFIG.topBarText || '');
  $('#site-header').innerHTML = `
  ${top ? `<div class="topbar">${esc(top)}</div>` : ''}
  <div class="site-header"><div class="wrap">
    <a class="logo" href="index.html">${brand}</a>
    <nav class="nav" id="nav" aria-label="Main">
      <a href="shop.html"${cur('shop')}>Shop all</a>
      <a href="shop.html?cat=shower">Shower gels</a>
      <a href="shop.html?cat=shampoo">Shampoos</a>
      <a href="shop.html?cat=hand">Hand washes</a>
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
      <div><p class="logo">${brand}</p><p style="color:var(--muted);line-height:1.6">Shower gels, shampoos and hand washes.</p></div>
      <div><p class="h">Shop</p><a href="shop.html?cat=shower">Shower gels</a><a href="shop.html?cat=shampoo">Shampoos</a><a href="shop.html?cat=hand">Hand washes</a></div>
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
  if (CONFIG.heroImage) {
    art.classList.add('has-photo');
    art.innerHTML = `<img class="photo" src="${esc(CONFIG.heroImage)}" alt="">`;
  } else {
    art.innerHTML = PRODUCTS.slice(0, 3).map((p, i) => visual({ ...p, photo: '' }, i === 1 ? 128 : 112, [240, 310, 270][i])).join('');
  }

  $('#cats').innerHTML = Object.entries(CATEGORIES).map(([id, label]) => {
    const p = PRODUCTS.find((x) => x.category === id) || { ...THEMES.sage, scent: '' };
    return `<a class="cat-card" href="shop.html?cat=${id}" style="background:${p.bg}"><div class="art">${visual({ ...p, photo: '' }, 96, 190)}</div><div class="row"><span>${label}</span><span>Shop →</span></div></a>`;
  }).join('');

  const scents = (CONFIG.scents || []).filter((s) => s && s.name);
  if (!scents.length) $('#scents').hidden = true;
  $('#scent-grid').innerHTML = scents.map((s) => {
    const t = theme(s.theme);
    const p = PRODUCTS.find((x) => (x.scent || '').toLowerCase() === s.name.toLowerCase());
    return `<div class="scent" style="background:${t.color}">
      ${s.mood ? `<p class="eyebrow">${esc(s.mood)}</p>` : ''}
      <h3>${esc(s.name)}</h3>
      ${s.text ? `<p>${esc(s.text)}</p>` : ''}
      <a class="btn" href="${p ? productUrl(p) : 'shop.html'}">Shop ${esc(s.name)}</a>
    </div>`;
  }).join('');

  const featured = PRODUCTS.filter((p) => p.featured);
  $('#bestsellers').innerHTML = (featured.length ? featured : PRODUCTS).slice(0, 8).map(card).join('');
}

function initShop() {
  const params = new URLSearchParams(location.search);
  let cat = CATEGORIES[params.get('cat')] ? params.get('cat') : 'all';
  const pills = $('#pills');
  const draw = () => {
    pills.innerHTML = [['all', 'All'], ...Object.entries(CATEGORIES)].map(([id, l]) => `<button class="pill" data-cat="${id}" aria-pressed="${id === cat}">${l}</button>`).join('');
    const list = cat === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.category === cat);
    $('#shop-grid').innerHTML = list.length ? list.map(card).join('') : '<p class="lead">New products coming soon.</p>';
    $('#count').textContent = `${list.length} product${list.length === 1 ? '' : 's'}`;
    $('#shop-title').textContent = cat === 'all' ? 'Shop all' : CATEGORIES[cat];
    document.title = `${cat === 'all' ? 'Shop all' : CATEGORIES[cat]} — ${CONFIG.brand || 'Palma'}`;
  };
  pills.onclick = (e) => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    cat = b.dataset.cat;
    history.replaceState(null, '', cat === 'all' ? 'shop.html' : `shop.html?cat=${cat}`);
    draw();
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
      <div class="pdp-media" id="main-media" style="background:${p.bg}">${visual(p, 160, 380)}</div>
      ${photos.length > 1 ? `<div class="thumbs">${photos.map((src, i) => `<button class="thumb-btn" data-src="${esc(src)}" aria-label="Photo ${i + 1}" aria-pressed="${i === 0}"><img src="${esc(src)}" alt=""></button>`).join('')}</div>` : ''}
    </div>
    <div class="pdp-info">
      <div>
        <p class="eyebrow">${TYPE_LABEL[p.category] || ''}${p.mood ? ' · ' + esc(p.mood) : ''}</p>
        <h1>${esc(p.name)}</h1>
      </div>
      <p class="pdp-price">${money(p.price)} ${p.volume ? `<span>· ${esc(p.volume)}</span>` : ''}</p>
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
    $('#main-media').innerHTML = `<img class="photo" src="${b.dataset.src}" alt="${esc(p.name)}">`;
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
        <a class="thumb" href="${productUrl(p)}" style="background:${p.bg}" aria-label="${esc(p.name)}">${visual(p, 40, 64)}</a>
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
const IN_PREVIEW = new URLSearchParams(location.search).has('preview') && window.parent !== window;
if (IN_PREVIEW) {
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (e.origin !== location.origin || !d || d.type !== 'palma-preview') return;
    if (d.kind === 'settings' && d.data) CONFIG = d.data;
    if (d.kind === 'products' && d.data) PRODUCTS = normalizeProducts(d.data.products);
    try { renderPage(); } catch (err) { console.error(err); }
  });
}

(async () => {
  await loadData();
  renderPage();
  if (IN_PREVIEW) window.parent.postMessage({ type: 'palma-preview-ready' }, location.origin);
})();
