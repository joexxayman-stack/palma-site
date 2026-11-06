// Live preview for the Palma admin panel.
// Shows the real website next to the editor and sends it your unsaved changes as you type.
(function () {
  const PAGES = { settings: '/index.html?preview=1', products: '/shop.html?preview=1' };
  const frames = {};   // kind -> iframe element
  const latest = {};   // kind -> latest data sent

  const toPlain = (v) => (v && typeof v.toJS === 'function' ? v.toJS() : v);

  function assetUrl(getAsset, path) {
    if (!path || typeof getAsset !== 'function') return path;
    try { const a = getAsset(path); const u = a && (a.url || a.toString()); return u && u !== '[object Object]' ? u : path; } catch { return path; }
  }

  function readData(props, kind) {
    const entry = props.entry;
    let data = entry && typeof entry.getIn === 'function' ? entry.getIn(['data']) : entry && entry.data;
    data = JSON.parse(JSON.stringify(toPlain(data) || {}));
    const ga = props.getAsset;
    if (kind === 'products') {
      (data.products || []).forEach((p) => {
        p.photo = assetUrl(ga, p.photo);
        p.gallery = (p.gallery || []).map((g) => (typeof g === 'string' ? assetUrl(ga, g) : { ...g, image: assetUrl(ga, g && g.image) }));
      });
    } else {
      data.heroImage = assetUrl(ga, data.heroImage);
    }
    return data;
  }

  function send(kind) {
    const f = frames[kind];
    if (f && f.contentWindow && latest[kind]) {
      f.contentWindow.postMessage({ type: 'palma-preview', kind, data: latest[kind] }, location.origin);
    }
  }

  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data || e.data.type !== 'palma-preview-ready') return;
    Object.keys(frames).forEach((k) => { if (frames[k] && frames[k].contentWindow === e.source) send(k); });
  });

  function makePreview(kind) {
    return function PalmaPreview(props) {
      const h = window.h || (window.React && window.React.createElement) || (window.CMS && window.CMS.h);
      try { latest[kind] = readData(props, kind); } catch (err) { console.error('Preview data error', err); }
      setTimeout(() => send(kind), 0);
      return h('div', { style: { height: '100%', minHeight: '80vh', display: 'flex', flexDirection: 'column' } },
        h('div', { style: { font: '600 13px system-ui, sans-serif', padding: '8px 4px', color: '#4A6356' } },
          'Live preview: changes show here instantly. Press Save to publish them.'),
        h('iframe', {
          src: PAGES[kind],
          title: 'Live preview of your website',
          ref: (el) => { if (el) { frames[kind] = el; el.onload = () => send(kind); } },
          style: { flex: '1 1 auto', width: '100%', minHeight: '78vh', border: '1px solid #D3DCD5', borderRadius: '12px', background: '#fff' }
        })
      );
    };
  }

  // Works out which file is being edited from its content.
  function kindOf(props) {
    const entry = props.entry;
    const data = toPlain(entry && typeof entry.getIn === 'function' ? entry.getIn(['data']) : entry && entry.data) || {};
    return Array.isArray(data.products) ? 'products' : 'settings';
  }
  const previews = { settings: makePreview('settings'), products: makePreview('products') };
  function AutoPreview(props) { return previews[kindOf(props)](props); }

  function register() {
    const CMS = window.CMS;
    if (!CMS || typeof CMS.registerPreviewTemplate !== 'function') return false;
    // Different versions look the preview up by file name or by collection name.
    ['settings', 'products', 'store', 'store/settings', 'store/products'].forEach((name) => {
      try { CMS.registerPreviewTemplate(name, AutoPreview); } catch (e) { console.warn('preview register', name, e); }
    });
    console.log('Palma live preview registered');
    return true;
  }

  if (!register()) {
    let tries = 0;
    const t = setInterval(() => { if (register() || ++tries > 100) clearInterval(t); }, 50);
  }
})();
