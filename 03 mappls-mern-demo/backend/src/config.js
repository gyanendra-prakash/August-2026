import 'dotenv/config';

const env = (name, fallback) => process.env[name] || fallback;

export const config = {
  port: Number(process.env.PORT) || 5000,
  clientOrigin: env('CLIENT_ORIGIN', 'http://localhost:5173'),
  mongoUri: env('MONGODB_URI', 'mongodb://127.0.0.1:27017/mappls_demo'),
  mappls: {
    key: (process.env.MAPPLS_KEY || '').trim(),
    urls: {
      autosuggest: env('MAPPLS_AUTOSUGGEST_URL', 'https://search.mappls.com/search/places/autosuggest/json'),
      geocode: env('MAPPLS_GEOCODE_URL', 'https://search.mappls.com/search/address/geocode'),
      reverseGeocode: env('MAPPLS_REVERSE_GEOCODE_URL', 'https://search.mappls.com/search/address/rev-geocode'),
      nearby: env('MAPPLS_NEARBY_URL', 'https://search.mappls.com/search/places/nearby/json'),
      route: env('MAPPLS_ROUTE_URL', 'https://route.mappls.com/route/direction/route_adv'),
    },
  },
  // Default map view (New Delhi)
  defaultCenter: { lat: 28.6139, lng: 77.209 },
  defaultZoom: 11,
};
