// Small helpers that wrap the Mappls Web SDK (global `mappls`).

let sdkPromise = null;

export const getMappls = () => window.mappls || window.Mappls;

const SDK_URLS = (key) => {
  const k = encodeURIComponent(key);
  return [
    // Current official loader
    `https://sdk.mappls.com/map/sdk/web?v=3.0&access_token=${k}&layer=vector`,
    // Legacy loader (fallback)
    `https://apis.mappls.com/advancedmaps/api/${k}/map_sdk?v=3.0&layer=vector`,
  ];
};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      s.remove();
      reject(new Error('script load failed'));
    };
    document.head.appendChild(s);
  });
}

// Even after the SDK script loads, `mappls.Map` can take a moment to become available
function waitForSdk(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      const m = getMappls();
      if (m && typeof m.Map === 'function') return resolve(m);
      if (Date.now() - started > timeoutMs) return reject(new Error('SDK loaded but `mappls.Map` was not found'));
      setTimeout(tick, 100);
    };
    tick();
  });
}

/** Loads the Mappls Web SDK (v3.0) script once. */
export function loadMapplsSdk(key) {
  const existing = getMappls();
  if (existing && typeof existing.Map === 'function') return Promise.resolve(existing);
  if (sdkPromise) return sdkPromise;

  sdkPromise = (async () => {
    let lastError = null;
    for (const url of SDK_URLS(key)) {
      try {
        await loadScript(url);
        return await waitForSdk();
      } catch (e) {
        lastError = e;
      }
    }
    throw new Error(
      `Mappls SDK failed to load (${lastError?.message}). Check the static key, Maps SDK (Web) access and allowed domain (localhost) in the Mappls Console.`
    );
  })().catch((e) => {
    sdkPromise = null; // retry allowed
    throw e;
  });
  return sdkPromise;
}

/** Map events: depending on the SDK version the method is `on` or `addListener`. */
export function onMapEvent(map, name, handler) {
  if (typeof map.on === 'function') return map.on(name, handler);
  if (typeof map.addListener === 'function') return map.addListener(name, handler);
}

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function pinIcon(color) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">` +
    `<path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 15 25 15 25s15-13.8 15-25C30 6.7 23.3 0 15 0z" fill="${color}"/>` +
    `<circle cx="15" cy="15" r="6" fill="#fff"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function addMarker(map, { lat, lng, color = '#e11d48', title = '', subtitle = '' }) {
  const mappls = getMappls();
  try {
    return new mappls.Marker({
      map,
      position: { lat, lng },
      icon_url: pinIcon(color),
      width: 30,
      height: 40,
      fitbounds: false,
      popupHtml: `<strong>${esc(title)}</strong>${subtitle ? `<br/><small>${esc(subtitle)}</small>` : ''}`,
    });
  } catch (e) {
    console.error('Marker add failed', e);
    return null;
  }
}

export function addPolyline(map, path, color = '#2563eb') {
  const mappls = getMappls();
  try {
    return new mappls.Polyline({
      map,
      path,
      strokeColor: color,
      strokeOpacity: 0.9,
      strokeWidth: 6,
      fitbounds: true,
    });
  } catch (e) {
    console.error('Polyline add failed', e);
    return null;
  }
}

export function removeLayer(map, layer) {
  if (!layer) return;
  try {
    if (typeof layer.remove === 'function') layer.remove();
    else getMappls().remove({ map, layer });
  } catch (e) {
    try {
      getMappls().remove({ map, layer });
    } catch {
      /* ignore */
    }
  }
}
