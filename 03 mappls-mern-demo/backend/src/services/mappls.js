import polyline from '@mapbox/polyline';
import { config } from '../config.js';
import { HttpError } from '../errors.js';

const PROFILES = ['driving', 'biking', 'walking', 'trucking'];

const toNum = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function requireKey() {
  if (!config.mappls.key) {
    throw new HttpError(500, 'MAPPLS_KEY set nahi hai. backend/.env mein apni Mappls static key daalo.');
  }
}

/** GET a Mappls REST endpoint with the static key as `access_token`. */
async function getJson(url, params = {}) {
  requireKey();
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
  }
  u.searchParams.set('access_token', config.mappls.key);

  let res;
  try {
    res = await fetch(u, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
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
      throw new HttpError(
        res.status,
        'Mappls ne access deny kiya. Key sahi hai? Console mein ye API enable hai? IP/domain whitelist check karo.'
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
