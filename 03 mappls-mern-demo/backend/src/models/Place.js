import mongoose from 'mongoose';

const placeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    address: { type: String, trim: true, maxlength: 400, default: '' },
    eLoc: { type: String, trim: true, maxlength: 20, default: null }, // Mappls Pin
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
    note: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Place', placeSchema);
