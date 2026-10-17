# Mappls MERN Demo

MongoDB + Express + React + Node ka ek complete demo jo **Mappls (MapmyIndia)** ko end-to-end use karta hai.

## Kya kya hai

| Feature | Kahan hota hai |
|---|---|
| Interactive vector map (Mappls Web SDK v3.0) | Frontend (`MapView.jsx`) |
| Place search with autosuggest | Frontend -> Backend -> Mappls Autosuggest |
| Map pe click karke address (reverse geocode) | Frontend -> Backend -> Mappls Reverse Geocode |
| Address se coordinates (geocode) | Backend -> Mappls Geocode |
| Route (car / bike / walk) + distance + time + polyline | Backend -> Mappls Routing |
| Nearby places (coffee, ATM, hospital ...) | Backend -> Mappls Nearby |
| Places save / list / delete | Backend -> MongoDB |

## Folder structure

```
mappls-mern-demo/
├── backend/            Express API + MongoDB (Mongoose)
│   ├── server.js
│   └── src/
│       ├── config.js           env + Mappls URLs
│       ├── services/mappls.js  Mappls REST calls
│       ├── routes/mappls.js    /api/mappls/*
│       ├── routes/places.js    /api/places (CRUD)
│       └── models/Place.js
├── frontend/           React (Vite)
│   └── src/
│       ├── api.js              backend ko calls
│       ├── mapUtils.js         Mappls SDK helpers
│       └── components/         MapView, PlaceSearch, RoutePanel, PlacesList
├── docker-compose.yml  MongoDB ke liye (optional)
└── package.json        dono ko ek saath chalane ke scripts
```

## Frontend aur Backend kaise connected hain

- Dev mein Vite `/api/*` requests ko `http://localhost:5000` (backend) pe **proxy** karta hai (`frontend/vite.config.js`).
- Backend mein CORS `CLIENT_ORIGIN` (default `http://localhost:5173`) ke liye khula hai.
- Frontend start hote hi `GET /api/config` se Mappls map key leta hai, phir Mappls SDK load karta hai.
- Mappls ke saare REST calls (search, geocode, route ...) **backend se** hote hain, browser seedha Mappls REST ko call nahi karta.

## Setup

### 1. Mappls key lo
1. https://auth.mappls.com/console pe account banao / login karo.
2. Ek project banao aur ye APIs enable karo: **Maps SDK (Web)**, **Search (Autosuggest, Geocode, Reverse Geocode, Nearby)**, **Routing**.
3. Apni **static key** copy karo.

### 2. Env files
```bash
cp backend/.env.example backend/.env
# backend/.env kholo aur MAPPLS_KEY=... daalo
```
`your_mappls_static_key_here` ko apni asli Static Key se replace karo; example value sirf placeholder hai.
(`frontend/.env` dev mein zaroori nahi.)

### 3. MongoDB
Local MongoDB chal raha ho to kuch nahi karna. Nahi to:
```bash
docker compose up -d
```
Mongo ke bina bhi map, search aur route chalte hain; sirf "Saved places" kaam nahi karega.

### 4. Install aur run
```bash
npm run install:all
npm run dev
```
- Frontend: http://localhost:5173
- Backend: http://localhost:5000 (health check: http://localhost:5000/api/health)

Alag-alag chalane ho to: `cd backend && npm run dev` aur `cd frontend && npm run dev`.

## Backend API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Server, Mongo aur key status |
| GET | `/api/config` | Map key + default center (frontend ke liye) |
| GET | `/api/mappls/autosuggest?q=&lat=&lng=` | Search suggestions |
| GET | `/api/mappls/geocode?address=` | Address -> coordinates |
| GET | `/api/mappls/reverse?lat=&lng=` | Coordinates -> address |
| GET | `/api/mappls/nearby?lat=&lng=&keywords=` | Nearby places |
| GET | `/api/mappls/route?origin=lat,lng&destination=lat,lng&profile=driving` | Route (profile: driving / biking / walking / trucking) |
| GET | `/api/places` | Saved places |
| POST | `/api/places` | Place save (`name, address, eLoc, lat, lng, note`) |
| DELETE | `/api/places/:id` | Place delete |

## Dhyan dene wali baatein

- **Key ki security:** Web SDK ki static key browser mein jaati hi hai (Mappls ka design). Console mein key ko apne **domain / IP se whitelist** karo (`localhost` dev ke liye). `.env` ko git mein commit mat karna.
- **Endpoint URLs:** Web SDK script, Autosuggest aur Reverse Geocode ke URLs Mappls docs se confirm kiye gaye hain. **Geocode, Nearby aur Route ke URLs maine live test nahi kiye** (mere paas Mappls key nahi thi). Agar inme `401/404` aaye to Mappls Console/Docs se sahi URL dekhkar `backend/.env` mein `MAPPLS_GEOCODE_URL`, `MAPPLS_NEARBY_URL`, `MAPPLS_ROUTE_URL` override kar do; code badalne ki zaroorat nahi.
- **Free plan limits:** Mappls ke plans mein daily/hourly hit limits hoti hain; 403 aaye to limit check karo.
- **Troubleshooting**
  - "Mappls key missing" -> `backend/.env` mein apni asli `MAPPLS_KEY` set karke backend restart karo. `/api/health` ka `mapplsKeyConfigured: true` sirf non-empty key batata hai, key valid hone ki guarantee nahi.
  - Search boxes mein "Mappls ne access deny kiya (`invalid_token`)" -> `backend/.env` mein copied sample/demo value ki jagah Mappls Console ki valid Static/REST API key daalo; confirm karo ki backend isi folder ki `.env` load karta hai, phir backend restart karo. Key ko chat, logs, ya screenshots mein share mat karo.
  - Search boxes mein access denied aur Route panel ke **Start/Destination** fields -> ye Autosuggest API call hai, route request nahi. Console mein Search/Autosuggest access bhi enable hona chahiye. Route permission alag se **Get route** dabane par use hoti hai.
  - Map blank / SDK load error -> key sahi hai? domain whitelist hai? Maps SDK enable hai?
  - "Backend se connect nahi hua" -> backend chal raha hai? port 5000 free hai?
  - "MongoDB connected nahi hai" -> `docker compose up -d` ya local mongod start karo.

## Production build

```bash
npm run build                      # frontend/dist banta hai
```
Frontend alag host pe ho to build se pehle `VITE_API_BASE=https://your-backend/api` set karo aur backend ke `CLIENT_ORIGIN` mein frontend ka URL daalo.
