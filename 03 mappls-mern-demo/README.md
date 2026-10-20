# Mappls MERN Demo

A complete MongoDB + Express + React + Node demo that uses **Mappls (MapmyIndia)** for the map and search, with free fallbacks for features a free Mappls key does not include.

## Features

| Feature | Where it happens | Source |
|---|---|---|
| Interactive vector map (Mappls Web SDK v3.0) | Frontend (`MapView.jsx`) | Mappls |
| Place search with autosuggest | Frontend -> Backend | Mappls Autosuggest |
| Coordinates for a picked place | Backend | Mappls Place Details -> Mappls Geocode -> OpenStreetMap (Nominatim, Photon) |
| Address when you click the map | Backend | Mappls Reverse Geocode |
| Route (car / bike / walk) with distance, time, polyline | Backend | Mappls Routing -> legacy Mappls -> OSRM (free) |
| Nearby places | Backend | Mappls Nearby |
| Save / list / delete places | Backend | MongoDB |

A free Mappls key usually covers only the map and autosuggest. Geocoding, Place Details and Routing may be denied (`invalid_token`), in which case the backend uses the free fallbacks automatically. If Mappls enables those APIs for your key, it uses Mappls with no code change.

## Folder structure

```
mappls-mern-demo/
├── backend/            Express API + MongoDB (Mongoose)
│   ├── server.js
│   └── src/
│       ├── config.js           env + Mappls URLs
│       ├── services/mappls.js  Mappls REST calls + fallbacks
│       ├── routes/mappls.js    /api/mappls/*
│       ├── routes/places.js    /api/places (CRUD)
│       └── models/Place.js
├── frontend/           React (Vite)
│   └── src/
│       ├── api.js              calls to the backend
│       ├── mapUtils.js         Mappls SDK helpers
│       └── components/         MapView, PlaceSearch, RoutePanel, PlacesList
├── docker-compose.yml  MongoDB (optional)
└── package.json        scripts to run both together
```

## How frontend and backend connect

- In dev, Vite proxies `/api/*` to `http://localhost:5000` (`frontend/vite.config.js`).
- The backend allows CORS for `CLIENT_ORIGIN` (default `http://localhost:5173`).
- On start, the frontend calls `GET /api/config` for the Mappls map key, then loads the Mappls SDK.
- All Mappls REST calls (search, geocode, route, ...) are made by the backend, never directly by the browser.

## Setup

### 1. Get a Mappls key
1. Go to https://auth.mappls.com/console and sign in.
2. Create a project and enable the APIs you can: **Maps SDK (Web)**, **Search (Autosuggest, Geocode, Reverse Geocode, Nearby)**, **Routing**.
3. Copy your **static key**.

### 2. Env files
```bash
cp backend/.env.example backend/.env
# open backend/.env and set MAPPLS_KEY=<your static key>
```
- The Map SDK uses `MAPPLS_KEY`. REST APIs receive the same key as `access_token`.
- If the Console gave you a separate REST key, set `MAPPLS_REST_KEY`.
- `MAPPLS_CLIENT_ID` + `MAPPLS_CLIENT_SECRET` (legacy OAuth) are optional and only used as a fallback.
- `frontend/.env` is not needed in dev.

### 3. MongoDB
If MongoDB is running locally, nothing to do. Otherwise:
```bash
docker compose up -d
```
Without MongoDB the map, search and routes still work; only "Saved places" does not.

### 4. Install and run
```bash
npm run install:all
npm run dev
```
- Frontend: http://localhost:5173
- Backend: http://localhost:5000 (health check: http://localhost:5000/api/health)

To run them separately: `cd backend && npm run dev` and `cd frontend && npm run dev`.

## Backend API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Server, Mongo and key status |
| GET | `/api/diagnose` | Tests each Mappls credential/endpoint and shows the raw result (no secrets) |
| GET | `/api/config` | Map key + default center (for the frontend) |
| GET | `/api/mappls/autosuggest?q=&lat=&lng=` | Search suggestions |
| GET | `/api/mappls/place?eLoc=&name=&address=` | Adds coordinates to a search result |
| GET | `/api/mappls/geocode?address=` | Address -> coordinates |
| GET | `/api/mappls/reverse?lat=&lng=` | Coordinates -> address |
| GET | `/api/mappls/nearby?lat=&lng=&keywords=` | Nearby places |
| GET | `/api/mappls/route?origin=lat,lng&destination=lat,lng&profile=driving` | Route (profile: driving / biking / walking / trucking) |
| GET | `/api/places` | Saved places |
| POST | `/api/places` | Save a place (`name, address, eLoc, lat, lng, note`) |
| DELETE | `/api/places/:id` | Delete a place |

## Notes

- **Key security:** the Web SDK key is sent to the browser by design. In the Mappls Console restrict it to your domain / IP (`localhost` for dev). Never commit `.env`.
- **Coordinates:** Mappls Autosuggest, Geocode and Nearby usually return an `eLoc` but no latitude/longitude. The backend gets coordinates from Place Details (premium), then Mappls Geocode, then OpenStreetMap. Disable the OpenStreetMap/OSRM fallbacks with `GEOCODE_FALLBACK=off`.
- **Free plan limits:** Mappls plans have daily/hourly hit limits; a 403 can mean the limit was reached.

## Troubleshooting

- **"Mappls access denied ... invalid_token"**: open http://localhost:5000/api/diagnose to see what Mappls returns for each credential. In the Mappls Console check that the API (Search / Geocode / Routing) is enabled for your key and the key is not restricted to another domain/IP. A free key often does not include Geocode, Place Details or Routing; the app falls back to free services for those.
- **Map blank / SDK load error**: is the key correct? Is `localhost` allowed? Is Maps SDK (Web) enabled?
- **"Could not connect to the backend"**: is the backend running? Is port 5000 free?
- **"MongoDB is not connected"**: run `docker compose up -d` or start a local `mongod`.

## Production build

```bash
npm run build     # creates frontend/dist
npm start         # the backend also serves the build -> http://localhost:5000
```
If the frontend is hosted separately, set `VITE_API_BASE=https://your-backend/api` before building and put the frontend URL in the backend's `CLIENT_ORIGIN`.
