import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { config } from './src/config.js';
import { errorMiddleware } from './src/errors.js';
import { getAccessToken, diagnose } from './src/services/mappls.js';
import mapplsRoutes from './src/routes/mappls.js';
import placesRoutes from './src/routes/places.js';

const app = express();

app.use(cors({ origin: config.clientOrigin.split(',').map((s) => s.trim()) }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => {
  const { key, clientId, clientSecret } = config.mappls;
  const mapplsAuth = clientId && clientSecret ? 'oauth' : key ? 'static-key' : 'not-configured';
  res.json({
    ok: true,
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    mapplsAuth,
  });
});

// Tests each Mappls credential separately and shows the raw result (no secrets).
app.get('/api/diagnose', async (req, res) => res.json(await diagnose()));

// The frontend gets the Mappls map key and the default view from here.
app.get('/api/config', async (req, res) => {
  try {
    const { token } = await getAccessToken();
    res.json({
      mapKey: token,
      authError: '',
      defaultCenter: config.defaultCenter,
      defaultZoom: config.defaultZoom,
    });
  } catch (e) {
    res.json({
      mapKey: '',
      authError: e.message,
      defaultCenter: config.defaultCenter,
      defaultZoom: config.defaultZoom,
    });
  }
});

app.use('/api/mappls', mapplsRoutes);
app.use('/api/places', placesRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found' }));

// Production: after `npm run build`, frontend/dist is served by this same server.
const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../frontend/dist');
if (fs.existsSync(path.join(distDir, 'index.html'))) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.use(errorMiddleware);

async function connectDb() {
  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected');
  } catch (e) {
    console.warn(`MongoDB connection failed (${e.message}). Retrying in 10s; map features keep working.`);
    setTimeout(connectDb, 10000);
  }
}

const server = app.listen(config.port, () => {
  console.log(`Backend running on http://localhost:${config.port}`);
  getAccessToken()
    .then(({ mode }) => console.log(`Mappls credentials found (${mode})`))
    .catch((e) => console.warn(`Mappls auth problem: ${e.message}`));
  connectDb();
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is already in use. Stop the other backend or change PORT in backend/.env.`);
  } else {
    console.error('Server error:', e);
  }
  process.exit(1);
});
