// Chhote helpers jo Mappls Web SDK (global `mappls`) ko wrap karte hain.

let sdkPromise = null;

export const getMappls = () => window.mappls || window.Mappls;

/** Mappls Web SDK (v3.0) script ek hi baar load karta hai. */
export function loadMapplsSdk(key) {
  if (getMappls()) return Promise.resolve(getMappls());
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://sdk.mappls.com/map/sdk/web?v=3.0&access_token=${encodeURIComponent(key)}`;
    s.async = true;
    s.onload = () => (getMappls() ? resolve(getMappls()) : reject(new Error('SDK load hua par `mappls` global nahi mila')));
    s.onerror = () => reject(new Error('Mappls SDK load nahi hua. Key aur domain whitelist check karo.'));
    document.head.appendChild(s);
  }).catch((e) => {
    sdkPromise = null; // retry allowed
    throw e;
  });
  return sdkPromise;
}

/** Map events: SDK versions mein `on` ya `addListener` hota hai. */
export function onMapEvent(map, name, handler) {
  if (typeof map.addListener === 'function') return map.addListener(name, handler);
  if (typeof map.on === 'function') return map.on(name, handler);
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
      icon: pinIcon(color),
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
