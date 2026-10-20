const BASE = import.meta.env.VITE_API_BASE || '/api';

async function request(path, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new Error('Could not connect to the backend. Is it running?');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const qs = (obj) =>
  new URLSearchParams(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();

const pt = (p) => `${p.lat},${p.lng}`;

export const api = {
  config: () => request('/config'),

  // Mappls (backend proxy)
  autosuggest: async (q, center, signal) =>
    (await request(`/mappls/autosuggest?${qs({ q, lat: center?.lat, lng: center?.lng })}`, { signal })).results,
  place: (item) => request(`/mappls/place?${qs({ eLoc: item.eLoc, name: item.name, address: item.address })}`),
  geocode: (address) => request(`/mappls/geocode?${qs({ address })}`),
  reverse: (lat, lng) => request(`/mappls/reverse?${qs({ lat, lng })}`),
  nearby: async (lat, lng, keywords) => (await request(`/mappls/nearby?${qs({ lat, lng, keywords })}`)).results,
  route: (origin, destination, profile) =>
    request(`/mappls/route?${qs({ origin: pt(origin), destination: pt(destination), profile })}`),

  // Saved places (MongoDB)
  listPlaces: async () => (await request('/places')).places,
  savePlace: async (place) => (await request('/places', { method: 'POST', body: place })).place,
  deletePlace: (id) => request(`/places/${id}`, { method: 'DELETE' }),
};
