import { Router } from 'express';
import mongoose from 'mongoose';
import Place from '../models/Place.js';
import { asyncHandler, HttpError } from '../errors.js';

const router = Router();

// Saved places need MongoDB; give a clear message if it isn't connected yet.
router.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return next(new HttpError(503, 'MongoDB connected nahi hai. Mongo start karo (README dekho) aur dubara try karo.'));
  }
  next();
});

// GET /api/places
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const places = await Place.find().sort({ createdAt: -1 }).limit(200).lean();
    res.json({ places });
  })
);

// POST /api/places
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, address, eLoc, lat, lng, note } = req.body || {};
    const latN = Number(lat);
    const lngN = Number(lng);
    if (!String(name || '').trim()) throw new HttpError(400, 'name required hai');
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) throw new HttpError(400, 'lat/lng valid numbers hone chahiye');

    const place = await Place.create({ name, address, eLoc, lat: latN, lng: lngN, note });
    res.status(201).json({ place });
  })
);

// DELETE /api/places/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'Invalid id');
    const deleted = await Place.findByIdAndDelete(req.params.id);
    if (!deleted) throw new HttpError(404, 'Place nahi mila');
    res.json({ ok: true });
  })
);

export default router;
