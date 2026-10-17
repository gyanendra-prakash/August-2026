import polyline from '@mapbox/polyline';
import { config } from '../config.js';
import { HttpError } from '../errors.js';

const PROFILES = ['driving', 'biking', 'walking', 'trucking'];

function redactCredentials(message, credentials) {
  return credentials.filter(Boolean).reduce((safeMessage, credential) => safeMessage.replaceAll(credential, '[redacted]'), message);
}

const toNum = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

let cachedToken = null;

export async function getAccessToken({ forceRefresh = false } = {}) {
  const { key, clientId, clientSecret, urls } = config.mappls;

  if (clientId && clientSecret) {
    if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
      return { mode: 'oauth', token: cachedToken.token };
    }
    let res;
    try {
      res = await fetch(urls.token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
        signal: AbortSignal.timeout(15000),
      });
    } catch (e) {
      throw new HttpError(502, `Mappls token server tak request nahi pahunchi (${e.name})`);
    }
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.access_token) {
      const reason = typeof data?.error === 'string' ? data.error : `HTTP ${res.status}`;
      const safeReason = redactCredentials(reason, [clientId, clientSecret]);
      throw new HttpError(401, `Mappls OAuth token nahi mila (${safeReason}). MAPPLS_CLIENT_ID / MAPPLS_CLIENT_SECRET check karo.`);
    }
    cachedToken = { token: data.access_token, expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000 };
    return { mode: 'oauth', token: cachedToken.token };
  }

  if (key) return { mode: 'static', token: key };
  throw new HttpError(500, 'Mappls credentials set nahi hain. backend/.env mein MAPPLS_KEY ya MAPPLS_CLIENT_ID + MAPPLS_CLIENT_SECRET daalo.');
}

/** GET a Mappls REST endpoint with OAuth Bearer auth or the static-key fallback. */
async function getJson(url, params = {}, retried = false) {
  const auth = await getAccessToken({ forceRefresh: retried });
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
  }
  const headers = { Accept: 'application/json' };
  if (auth.mode === 'oauth') {
    headers.Authorization = `Bearer ${auth.token}`;
  } else {
    u.searchParams.set('access_token', auth.token);
  }

  let res;
  try {
    res = await fetch(u, { headers, signal: AbortSignal.timeout(15000) });
  } catch (e) {
    // Never include `u` here: it contains the key.
    throw new HttpError(502, `Mappls tak request nahi pahunchi (${e.name})`);
  }

  if (res.status === 204) return null;
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON body */
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      if (auth.mode === 'oauth' && !retried) return getJson(url, params, true);
      const reason = [data?.error, data?.error_description, data?.message]
        .find((value) => typeof value === 'string' && value.trim());
      const safeReason = reason
        ? redactCredentials(reason, [auth.token, config.mappls.key, config.mappls.clientId, config.mappls.clientSecret])
        : null;
      const hint = auth.mode === 'static' ? ' Client ID + Client Secret use karo.' : '';
      throw new HttpError(
        res.status,
        `Mappls ne access deny kiya${safeReason ? ` (${safeReason})` : ''}.${hint}`
      );
    }
    throw new HttpError(502, `Mappls API error (HTTP ${res.status})`);
  }
  return data;
}

function normalisePlace(s) {
  return {
    eLoc: s.eLoc || s.mapplsPin || null,
    name: s.placeName || s.name || s.poi || '',
    address: s.placeAddress || s.address || s.formattedAddress || '',
    lat: toNum(s.latitude ?? s.lat),
    lng: toNum(s.longitude ?? s.lng ?? s.lon),
    distance: toNum(s.distance),
    type: s.type || s.orderIndex || null,
  };
}

export async function autosuggest(query, center) {
  const data = await getJson(config.mappls.urls.autosuggest, {
    query,
    location: center ? `${center.lat},${center.lng}` : undefined,
  });
  return (data?.suggestedLocations || []).map(normalisePlace);
}

export async function geocode(address) {
  const data = await getJson(config.mappls.urls.geocode, { address });
  const r = Array.isArray(data?.copResults) ? data.copResults[0] : data?.copResults ?? data?.results?.[0];
  if (!r) throw new HttpError(404, 'Is address ke liye koi result nahi mila');
  const p = normalisePlace(r);
  return { ...p, address: r.formattedAddress || p.address || address };
}

export async function reverseGeocode(lat, lng) {
  const data = await getJson(config.mappls.urls.reverseGeocode, { lat, lng });
  const r = data?.results?.[0];
  if (!r) throw new HttpError(404, 'Is jagah ka address nahi mila');
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
  return (data?.suggestedLocations || []).map(normalisePlace);
}

/** Accepts "lat,lng" or a Mappls Pin (eLoc). Mappls routing wants "lng,lat". */
function toRoutePoint(input) {
  const s = String(input || '').trim();
  const m = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(s);
  if (m) {
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new HttpError(400, 'Coordinates range se bahar hain');
    return { param: `${lng},${lat}`, lat, lng };
  }
  if (/^[A-Za-z0-9]{4,10}$/.test(s)) return { param: s, lat: null, lng: null };
  throw new HttpError(400, 'origin/destination "lat,lng" ya Mappls Pin (eLoc) hona chahiye');
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

export async function route(origin, destination, profile = 'driving') {
  if (!PROFILES.includes(profile)) throw new HttpError(400, `profile in me se ek hona chahiye: ${PROFILES.join(', ')}`);
  const o = toRoutePoint(origin);
  const d = toRoutePoint(destination);

  const data = await getJson(`${config.mappls.urls.route}/${profile}/${o.param};${d.param}`, {
    geometries: 'polyline6',
    overview: 'full',
    steps: 'false',
    alternatives: 'false',
  });

  const best = data?.routes?.[0];
  if (!best) throw new HttpError(404, 'In dono points ke beech koi route nahi mila');

  const hint = o.lat !== null ? { lat: o.lat, lng: o.lng } : null;
  return {
    profile,
    distanceMeters: toNum(best.distance),
    durationSeconds: toNum(best.duration),
    path: decodeGeometry(best.geometry, hint),
  };
}
