import polyline from '@mapbox/polyline';
import { config } from '../config.js';
import { HttpError } from '../errors.js';

const PROFILES = ['driving', 'biking', 'walking', 'trucking'];

const secrets = () => [config.mappls.key, config.mappls.restKey, config.mappls.clientId, config.mappls.clientSecret];

function redact(message) {
  return secrets().filter(Boolean).reduce((m, c) => String(m).replaceAll(c, '[redacted]'), String(message));
}

const toNum = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const hasOAuth = () => Boolean(config.mappls.clientId && config.mappls.clientSecret);
const restKey = () => config.mappls.restKey || config.mappls.key;

/* ---------------- Auth ---------------- */

let cachedToken = null;

/** Legacy OAuth (client id + secret) -> bearer token. */
async function fetchOAuthToken(forceRefresh = false) {
  const { clientId, clientSecret, urls } = config.mappls;
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;

  let res;
  try {
    res = await fetch(urls.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    throw new HttpError(502, `Could not reach the Mappls token server (${e.name})`);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.access_token) {
    const reason = typeof data?.error === 'string' ? data.error : `HTTP ${res.status}`;
    throw new HttpError(401, `Mappls OAuth token error (${redact(reason)})`);
  }
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000 };
  return cachedToken.token;
}

/** Credential for the browser Map SDK: static key first, OAuth token only if no key exists. */
export async function getAccessToken() {
  if (config.mappls.key) return { mode: 'static', token: config.mappls.key };
  if (hasOAuth()) return { mode: 'oauth', token: await fetchOAuthToken() };
  throw new HttpError(500, 'Mappls credentials are not set. Put MAPPLS_KEY in backend/.env');
}

/* ---------------- HTTP ---------------- */

/**
 * One REST attempt with a given auth mode.
 * Returns { ok, status, data, reason }.
 */
async function attempt(url, params, mode, forceRefresh = false) {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
  }
  const headers = { Accept: 'application/json' };
  if (mode === 'key') {
    // Current Mappls auth: the static key goes in `access_token`.
    // Web-type keys may be domain restricted, so identify as the allowed web origin too.
    u.searchParams.set('access_token', restKey());
    headers.Referer = `${config.mappls.referer}/`;
    headers.Origin = config.mappls.referer;
  } else {
    headers.Authorization = `Bearer ${await fetchOAuthToken(forceRefresh)}`;
  }

  let res;
  try {
    res = await fetch(u, { headers, signal: AbortSignal.timeout(15000) });
  } catch (e) {
    throw new HttpError(502, `Could not reach Mappls (${e.name})`);
  }
  if (res.status === 204) return { ok: true, status: 204, data: null };
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON body */
  }
  const reason = [data?.error, data?.error_description, data?.message, data?.responseMessage].find(
    (v) => typeof v === 'string' && v.trim()
  );
  return { ok: res.ok, status: res.status, data, reason: reason ? redact(reason) : '' };
}

/** GET a Mappls REST endpoint. Static key first (current method), legacy OAuth as fallback. */
async function getJson(url, params = {}) {
  const modes = [];
  if (restKey()) modes.push('key');
  if (hasOAuth()) modes.push('oauth');
  if (!modes.length) throw new HttpError(500, 'Mappls credentials are not set. Put MAPPLS_KEY in backend/.env');

  const failures = [];
  for (const mode of modes) {
    let r;
    try {
      r = await attempt(url, params, mode);
      if (mode === 'oauth' && (r.status === 401 || r.status === 403)) r = await attempt(url, params, mode, true);
    } catch (e) {
      failures.push(`${mode}: ${e.message}`);
      continue;
    }
    if (r.ok) return r.data;
    if (r.status !== 401 && r.status !== 403) {
      throw new HttpError(r.status === 400 || r.status === 404 ? r.status : 502, `Mappls API error (HTTP ${r.status}${r.reason ? `: ${r.reason}` : ''})`);
    }
    failures.push(`${mode}: HTTP ${r.status}${r.reason ? ` ${r.reason}` : ''}`);
  }
  throw new HttpError(
    401,
    `Mappls access denied [${failures.join(' | ')}]. Open /api/diagnose for details. Check in Mappls Console: this key must have REST/Search APIs enabled and must not be restricted to a different domain/IP.`
  );
}

/** Used by /api/diagnose: probes every credential/endpoint combination and reports plain results (no secrets). */
export async function diagnose() {
  const probe = { query: 'india gate', location: '28.6129,77.2295' };
  const { urls } = config.mappls;
  const out = { configured: { MAPPLS_KEY: Boolean(config.mappls.key), MAPPLS_REST_KEY: Boolean(config.mappls.restKey), oauth: hasOAuth(), referer: config.mappls.referer } };
  const run = async (name, fn) => {
    try {
      const r = await fn();
      out[name] = { ok: r.ok, status: r.status, message: r.reason || (r.ok ? 'works' : '') };
    } catch (e) {
      out[name] = { ok: false, status: 0, message: redact(e.message) };
    }
  };

  if (hasOAuth()) {
    try {
      const res = await fetch(urls.token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: config.mappls.clientId, client_secret: config.mappls.clientSecret }),
        signal: AbortSignal.timeout(15000),
      });
      const d = await res.json().catch(() => ({}));
      out.oauth_token = { ok: res.ok && Boolean(d.access_token), status: res.status, token_type: d.token_type, scope: d.scope, expires_in: d.expires_in, message: redact(d.error_description || d.error || '') };
    } catch (e) {
      out.oauth_token = { ok: false, message: redact(e.message) };
    }
  }
  if (restKey()) {
    await run('search.mappls.com + key(access_token)', () => attempt(urls.autosuggest, probe, 'key'));
    await run('atlas.mappls.com + key(access_token)', () => attempt(urls.autosuggestLegacy, probe, 'key'));
  }
  if (hasOAuth()) {
    await run('search.mappls.com + oauth bearer', () => attempt(urls.autosuggest, probe, 'oauth'));
    await run('atlas.mappls.com + oauth bearer', () => attempt(urls.autosuggestLegacy, probe, 'oauth'));
  }
  if (restKey()) {
    // legacy "key in path" style
    try {
      const r = await fetch(`https://apis.mappls.com/advancedmaps/v1/${encodeURIComponent(restKey())}/rev_geocode?lat=28.6129&lng=77.2295`, { signal: AbortSignal.timeout(15000) });
      out['legacy key-in-path rev_geocode'] = { ok: r.ok, status: r.status, message: r.ok ? 'works' : redact((await r.text()).slice(0, 150)) };
    } catch (e) {
      out['legacy key-in-path rev_geocode'] = { ok: false, message: redact(e.message) };
    }
  }
  return out;
}

function normalisePlace(s) {
  return {
    eLoc: s.eLoc || s.mapplsPin || null,
    name: s.placeName || s.name || s.poi || '',
    address: s.placeAddress || s.address || s.formattedAddress || '',
    lat: toNum(s.latitude ?? s.lat ?? s.entry_lat),
    lng: toNum(s.longitude ?? s.lng ?? s.lon ?? s.entry_lon),
    distance: toNum(s.distance),
    type: s.type || s.orderIndex || null,
  };
}

export async function autosuggest(query, center) {
  const params = { query, location: center ? `${center.lat},${center.lng}` : undefined };
  let data;
  try {
    data = await getJson(config.mappls.urls.autosuggest, params);
  } catch (e) {
    if (e.status !== 401) throw e;
    // Older Atlas search endpoint (some projects only have this one enabled)
    data = await getJson(config.mappls.urls.autosuggestLegacy, params);
  }
  return (data?.suggestedLocations || []).map(normalisePlace);
}

export async function geocode(address) {
  const data = await getJson(config.mappls.urls.geocode, { address, itemCount: 1 });
  const r = Array.isArray(data?.copResults) ? data.copResults[0] : data?.copResults ?? data?.results?.[0];
  if (!r) throw new HttpError(404, 'No result found for this address');
  const p = normalisePlace(r);
  return { ...p, address: r.formattedAddress || p.address || address };
}

export async function reverseGeocode(lat, lng) {
  const data = await getJson(config.mappls.urls.reverseGeocode, { lat, lng });
  const r = data?.results?.[0];
  if (!r) throw new HttpError(404, 'No address found for this location');
  const parts = [r.locality, r.subDistrict || r.district, r.state].filter(Boolean);
  return {
    address: r.formatted_address || r.formattedAddress || parts.join(', '),
    area: r.locality || r.subLocality || r.village || r.city || '',
    district: r.district || '',
    state: r.state || '',
    pincode: r.pincode || '',
    lat,
    lng,
  };
}

export async function nearby(lat, lng, keywords) {
  const data = await getJson(config.mappls.urls.nearby, {
    keywords,
    refLocation: `${lat},${lng}`,
    radius: 2000,
    sortBy: 'dist:asc',
  });
  const items = (data?.suggestedLocations || []).map(normalisePlace);
  // Nearby usually has no coordinates; try Place Details for the first few so they can be pinned.
  await Promise.all(
    items.slice(0, 8).map(async (it) => {
      if (it.lat !== null && it.lng !== null) return;
      if (!it.eLoc) return;
      try {
        const c = await placeDetails(it.eLoc);
        if (c) Object.assign(it, c);
      } catch {
        /* coordinates are optional here */
      }
    })
  );
  return items;
}

/** Accepts "lat,lng" or a Mappls Pin (eLoc). Mappls routing wants "lng,lat". */
function toRoutePoint(input) {
  const s = String(input || '').trim();
  const m = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(s);
  if (m) {
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new HttpError(400, 'Coordinates are out of range');
    return { param: `${lng},${lat}`, lat, lng };
  }
  if (/^[A-Za-z0-9]{4,10}$/.test(s)) return { param: s, lat: null, lng: null };
  throw new HttpError(400, 'origin/destination must be "lat,lng" or a Mappls Pin (eLoc)');
}

const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

/** Decode route geometry to [{lat,lng}]. Handles polyline6, polyline5 and GeoJSON. */
function decodeGeometry(geometry, hint) {
  if (geometry && typeof geometry === 'object' && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
  }
  if (typeof geometry !== 'string' || !geometry) return [];

  let coords = polyline.decode(geometry, 6);
  if (hint && coords.length) {
    // If the API ignored `geometries=polyline6`, precision-5 decoded at 6 lands near (0,0).
    const alt = polyline.decode(geometry, 5);
    if (alt.length && dist2(alt[0], [hint.lat, hint.lng]) < dist2(coords[0], [hint.lat, hint.lng])) coords = alt;
  }
  return coords.map(([lat, lng]) => ({ lat, lng }));
}

async function fetchJsonPlain(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'mappls-mern-demo/1.0' }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Legacy Mappls routing: static key inside the URL path (works on some free keys). */
async function legacyKeyRoute(profile, o, d) {
  const key = restKey();
  if (!key) throw new Error('no key');
  const url = `https://apis.mappls.com/advancedmaps/v1/${encodeURIComponent(key)}/route_adv/${profile}/${o.param};${d.param}?geometries=polyline6&overview=full&steps=false`;
  return fetchJsonPlain(url);
}

/** Free OpenStreetMap routing (OSRM). Needs real coordinates. */
async function osrmRoute(profile, o, d) {
  const base = {
    driving: 'https://router.project-osrm.org/route/v1/driving',
    biking: 'https://routing.openstreetmap.de/routed-bike/route/v1/driving',
    walking: 'https://routing.openstreetmap.de/routed-foot/route/v1/driving',
    trucking: 'https://router.project-osrm.org/route/v1/driving',
  }[profile];
  const data = await fetchJsonPlain(`${base}/${o.lng},${o.lat};${d.lng},${d.lat}?overview=full&geometries=geojson`);
  const best = data?.routes?.[0];
  if (!best) throw new Error('no route');
  return {
    profile,
    distanceMeters: toNum(best.distance),
    durationSeconds: toNum(best.duration),
    path: best.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
    source: 'osrm',
  };
}

export async function route(origin, destination, profile = 'driving') {
  if (!PROFILES.includes(profile)) throw new HttpError(400, `profile must be one of: ${PROFILES.join(', ')}`);
  const o = toRoutePoint(origin);
  const d = toRoutePoint(destination);
  const hint = o.lat !== null ? { lat: o.lat, lng: o.lng } : null;
  const notes = [];

  const fromMappls = (data, source) => {
    const best = data?.routes?.[0];
    if (!best) return null;
    return {
      profile,
      distanceMeters: toNum(best.distance),
      durationSeconds: toNum(best.duration),
      path: decodeGeometry(best.geometry, hint),
      source,
    };
  };

  // 1) Mappls route API (access_token / OAuth)
  try {
    const data = await getJson(`${config.mappls.urls.route}/${profile}/${o.param};${d.param}`, {
      geometries: 'polyline6',
      overview: 'full',
      steps: 'false',
      alternatives: 'false',
    });
    const r = fromMappls(data, 'mappls');
    if (r) return r;
    throw new HttpError(404, 'No route found between these two points');
  } catch (e) {
    if (e.status !== 401 && e.status !== 403) throw e;
    notes.push('mappls route: access denied');
  }

  // 2) Legacy Mappls (key in URL path)
  try {
    const r = fromMappls(await legacyKeyRoute(profile, o, d), 'mappls-legacy');
    if (r?.path?.length) return r;
  } catch (e) {
    notes.push(`mappls legacy route: ${e.message}`);
  }

  // 3) Free OSRM fallback
  if (config.geocodeFallback && o.lat !== null && d.lat !== null) {
    try {
      return await osrmRoute(profile, o, d);
    } catch (e) {
      notes.push(`osrm: ${e.cause?.code || e.message}`);
    }
  }
  throw new HttpError(502, `No route found. ${notes.join('; ')}. The Mappls Routing API is not enabled for your key.`);
}
