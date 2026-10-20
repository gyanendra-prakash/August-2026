import { Router } from 'express';
import * as mappls from '../services/mappls.js';
import { asyncHandler, HttpError } from '../errors.js';

const router = Router();

const num = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function readLatLng(q) {
  const lat = num(q.lat);
  const lng = num(q.lng);
  if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new HttpError(400, 'lat and lng must be valid numbers');
  }
  return { lat, lng };
}

// GET /api/mappls/autosuggest?q=india gate&lat=28.6&lng=77.2
router.get(
  '/autosuggest',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) throw new HttpError(400, 'q must be at least 2 characters');
    const lat = num(req.query.lat);
    const lng = num(req.query.lng);
    const center = lat !== null && lng !== null ? { lat, lng } : null;
    res.json({ results: await mappls.autosuggest(q, center) });
  })
);

// GET /api/mappls/geocode?address=...
router.get(
  '/geocode',
  asyncHandler(async (req, res) => {
    const address = String(req.query.address || '').trim();
    if (!address) throw new HttpError(400, 'address is required');
    res.json(await mappls.geocode(address));
  })
);

// GET /api/mappls/place?eLoc=..&name=..&address=..  -> adds lat/lng to an autosuggest result
router.get(
  '/place',
  asyncHandler(async (req, res) => {
    const eLoc = String(req.query.eLoc || '').trim();
    const name = String(req.query.name || '').trim();
    const address = String(req.query.address || '').trim();
    if (!eLoc && !name) throw new HttpError(400, 'eLoc or name required');
    res.json(await mappls.resolvePlace({ eLoc, name, address }));
  })
);

// GET /api/mappls/reverse?lat=..&lng=..
router.get(
  '/reverse',
  asyncHandler(async (req, res) => {
    const { lat, lng } = readLatLng(req.query);
    res.json(await mappls.reverseGeocode(lat, lng));
  })
);

// GET /api/mappls/nearby?lat=..&lng=..&keywords=coffee
router.get(
  '/nearby',
  asyncHandler(async (req, res) => {
    const { lat, lng } = readLatLng(req.query);
    const keywords = String(req.query.keywords || '').trim();
    if (!keywords) throw new HttpError(400, 'keywords is required');
    res.json({ results: await mappls.nearby(lat, lng, keywords) });
  })
);

// GET /api/mappls/route?origin=28.61,77.20&destination=28.55,77.26&profile=driving
router.get(
  '/route',
  asyncHandler(async (req, res) => {
    const { origin, destination, profile } = req.query;
    if (!origin || !destination) throw new HttpError(400, 'origin and destination are required');
    res.json(await mappls.route(origin, destination, profile || 'driving'));
  })
);

export default router;
