// Receives an order from the checkout page and sends it to the store owner's WhatsApp
// (via the free CallMeBot service). Runs on Cloudflare Pages Functions.
// Needs one secret in Cloudflare:  CALLMEBOT_APIKEY

const CATEGORY = { shower: 'Shower gel', shampoo: 'Shampoo', hand: 'Hand wash' };

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const slug = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'product';

function withIds(list) {
  const seen = {};
  return (list || []).filter((p) => p && p.name).map((p) => {
    let id = slug(p.name); seen[id] = (seen[id] || 0) + 1; if (seen[id] > 1) id += '-' + seen[id];
    return { ...p, id, price: Number(p.price) || 0, inStock: p.inStock !== false };
  });
}

async function readJson(env, origin, path) {
  const r = await env.ASSETS.fetch(new Request(origin + path));
  if (!r.ok) throw new Error('Could not read ' + path);
  return r.json();
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid request.' }, 400); }

  // Spam trap: real customers never fill this hidden field.
  if (body.website) return json({ ok: true, order: 'P-0' });

  const c = body.customer || {};
  const customer = {
    name: clean(c.name, 80),
    phone: clean(c.phone, 20),
    city: clean(c.city, 80),
    address: clean(c.address, 400),
    notes: clean(c.notes, 300)
  };
  if (!customer.name || !customer.city || !customer.address || !/^[0-9+ ]{8,20}$/.test(customer.phone)) {
    return json({ ok: false, error: 'Please fill in your name, a valid phone number, city and address.' }, 400);
  }

  const origin = new URL(request.url).origin;
  let settings, products;
  try {
    [settings, products] = await Promise.all([readJson(env, origin, '/data/settings.json'), readJson(env, origin, '/data/products.json')]);
  } catch {
    return json({ ok: false, error: 'The store is temporarily unavailable. Please try again.' }, 500);
  }
  const catalog = withIds(products.products);
  const currency = settings.currency || 'EGP';
  const money = (n) => (n > 0 ? `${currency} ${Number(n).toLocaleString('en-US')}` : 'price on confirmation');

  // Rebuild the order from the real catalogue (never trust prices sent by the browser).
  const lines = [];
  for (const item of (Array.isArray(body.items) ? body.items : []).slice(0, 40)) {
    const p = catalog.find((x) => x.id === String(item.id));
    const qty = Math.min(99, Math.max(1, parseInt(item.qty, 10) || 0));
    if (p && p.inStock && qty) lines.push({ p, qty });
  }
  if (!lines.length) return json({ ok: false, error: 'Your cart is empty or the products are no longer available.' }, 400);

  const sub = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
  const over = Number(settings.freeDeliveryOver) || 0;
  const delivery = over > 0 && sub >= over ? 0 : Number(settings.deliveryFee) || 0;
  const total = sub + delivery;

  const now = new Date();
  const order = 'P-' + now.toISOString().slice(2, 10).replace(/-/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);

  const msg = [
    `🛍 NEW ORDER ${order} — ${settings.brand || 'Palma'}`,
    '',
    `Name: ${customer.name}`,
    `Phone: ${customer.phone}`,
    `City: ${customer.city}`,
    `Address: ${customer.address}`,
    customer.notes ? `Notes: ${customer.notes}` : null,
    '',
    'Items:',
    ...lines.map((l) => `• ${l.qty} × ${l.p.name}${l.p.volume ? ' (' + l.p.volume + ')' : ''} — ${money(l.p.price * l.qty)}`),
    '',
    `Subtotal: ${money(sub)}`,
    `Delivery: ${delivery > 0 ? money(delivery) : 'Free'}`,
    `TOTAL: ${money(total)}`,
    'Payment: Cash on delivery'
  ].filter((x) => x !== null).join('\n');

  const phone = String(settings.whatsapp || '').replace(/\D/g, '');
  if (!env.CALLMEBOT_APIKEY || !phone) {
    return json({ ok: false, error: 'Online ordering is not set up yet. Please contact us.' }, 500);
  }

  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent('+' + phone)}&apikey=${encodeURIComponent(env.CALLMEBOT_APIKEY)}&text=${encodeURIComponent(msg)}`;
    const r = await fetch(url);
    const text = await r.text();
    if (!r.ok || /error|invalid|not activated/i.test(text.slice(0, 500))) throw new Error(text.slice(0, 200));
  } catch (e) {
    console.log('Order send failed', order, String(e));
    return json({ ok: false, error: 'We could not place your order right now. Please try again in a minute.' }, 502);
  }

  return json({
    ok: true,
    order,
    summary: { items: lines.map((l) => ({ name: l.p.name, qty: l.qty, total: l.p.price * l.qty })), subtotal: sub, delivery, total, currency }
  });
}

export const onRequest = () => json({ ok: false, error: 'Method not allowed' }, 405);
