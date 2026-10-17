import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { config } from './src/config.js';
import { errorMiddleware } from './src/errors.js';
import { getAccessToken } from './src/services/mappls.js';
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

// Frontend yahin se Mappls access token + default view leta hai.
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
app.use(errorMiddleware);

async function connectDb() {
  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected');
  } catch (e) {
    console.warn(`MongoDB connect nahi hua (${e.message}). 10s mein dubara try karenge; maps wale features chalte rahenge.`);
    setTimeout(connectDb, 10000);
  }
}

app.listen(config.port, () => {
  console.log(`Backend running on http://localhost:${config.port}`);
  getAccessToken()
    .then(({ mode }) => console.log(`Mappls auth OK (${mode})`))
    .catch((e) => console.warn(`Mappls auth problem: ${e.message}`));
  connectDb();
});
