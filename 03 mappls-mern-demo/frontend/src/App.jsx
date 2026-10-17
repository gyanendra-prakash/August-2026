import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import MapView from './components/MapView.jsx';
import PlaceSearch from './components/PlaceSearch.jsx';
import RoutePanel from './components/RoutePanel.jsx';
import PlacesList from './components/PlacesList.jsx';

const NEARBY_OPTIONS = ['coffee', 'restaurant', 'ATM', 'petrol pump', 'hospital'];

const coordsLabel = (p) => `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;

export default function App() {
  const [config, setConfig] = useState(null);
  const [fatal, setFatal] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [selected, setSelected] = useState(null);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [route, setRoute] = useState(null);
  const [profile, setProfile] = useState('driving');
  const [pickMode, setPickMode] = useState(null);
  const [focus, setFocus] = useState(null);

  const [places, setPlaces] = useState([]);
  const [placesError, setPlacesError] = useState('');
  const [nearby, setNearby] = useState([]);
  const [nearbyKeyword, setNearbyKeyword] = useState(NEARBY_OPTIONS[0]);

  const loadPlaces = useCallback(async () => {
    try {
      setPlaces(await api.listPlaces());
      setPlacesError('');
    } catch (e) {
      setPlaces([]);
      setPlacesError(e.message);
    }
  }, []);

  useEffect(() => {
    api.config().then(setConfig).catch((e) => setFatal(e.message));
    loadPlaces();
  }, [loadPlaces]);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      return await fn();
    } catch (e) {
      setError(e.message);
      return undefined;
    } finally {
      setBusy(false);
    }
  };

  const flyTo = (p, zoom = 15) => setFocus({ lat: p.lat, lng: p.lng, zoom, t: Date.now() });

  // Autosuggest item ke paas lat/lng na ho to geocode se nikalte hain
  const resolveItem = async (item) => {
    if (item.lat != null && item.lng != null) return item;
    const g = await api.geocode(`${item.name} ${item.address || ''}`.trim());
    if (g.lat == null || g.lng == null) throw new Error('Is place ke coordinates nahi mile');
    return { ...item, lat: g.lat, lng: g.lng, eLoc: item.eLoc || g.eLoc };
  };

  const pickSelected = (item) =>
    run(async () => {
      const p = await resolveItem(item);
      setSelected(p);
      flyTo(p);
    });

  const clearRoute = () => setRoute(null);

  const pickOrigin = (item) =>
    run(async () => {
      const p = await resolveItem(item);
      setOrigin(p);
      clearRoute();
      flyTo(p, 13);
    });

  const pickDestination = (item) =>
    run(async () => {
      const p = await resolveItem(item);
      setDestination(p);
      clearRoute();
      flyTo(p, 13);
    });

  // Map click: pick mode ho to origin/destination, warna reverse geocode se address dikhao
  const handleMapClick = async ({ lat, lng }) => {
    await run(async () => {
      let name = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      let address = '';
      try {
        const r = await api.reverse(lat, lng);
        address = r.address;
        name = r.area || r.address || name;
      } catch {
        /* reverse geocode fail ho to coordinates se kaam chalao */
      }
      const p = { name, address, lat, lng, eLoc: null };
      if (pickMode === 'origin') {
        setOrigin(p);
        clearRoute();
        setPickMode(null);
      } else if (pickMode === 'destination') {
        setDestination(p);
        clearRoute();
        setPickMode(null);
      } else {
        setSelected(p);
      }
    });
  };

  const getRoute = () =>
    run(async () => {
      setRoute(await api.route(origin, destination, profile));
    });

  const clearAll = () => {
    setOrigin(null);
    setDestination(null);
    setRoute(null);
    setPickMode(null);
  };

  const savePlace = () =>
    run(async () => {
      await api.savePlace({
        name: selected.name,
        address: selected.address,
        eLoc: selected.eLoc,
        lat: selected.lat,
        lng: selected.lng,
      });
      await loadPlaces();
    });

  const deletePlace = (id) =>
    run(async () => {
      await api.deletePlace(id);
      await loadPlaces();
    });

  const findNearby = () =>
    run(async () => {
      setNearby(await api.nearby(selected.lat, selected.lng, nearbyKeyword));
    });

  const selectSaved = (p) => {
    setSelected({ name: p.name, address: p.address, eLoc: p.eLoc, lat: p.lat, lng: p.lng });
    flyTo(p);
  };

  const center = config?.defaultCenter;

  if (fatal) {
    return (
      <div className="map-message">
        <h2>Backend se connect nahi hua</h2>
        <p>{fatal}</p>
        <p>
          <code>cd backend &amp;&amp; npm run dev</code> chalao, phir page refresh karo.
        </p>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <header>
          <h1>Mappls MERN Demo</h1>
          <p>React + Express + MongoDB + Mappls</p>
        </header>

        {error && (
          <div className="banner error" onClick={() => setError('')}>
            {error}
          </div>
        )}

        <section className="panel">
          <h3>Search place</h3>
          <PlaceSearch placeholder="e.g. India Gate, Connaught Place" center={center} onPick={pickSelected} />
        </section>

        {selected && (
          <section className="panel">
            <h3>{selected.name}</h3>
            <p className="muted">{selected.address || coordsLabel(selected)}</p>
            {selected.eLoc && (
              <p className="muted">
                Mappls Pin: <code>{selected.eLoc}</code>
              </p>
            )}
            <div className="row wrap">
              <button className="primary" onClick={savePlace} disabled={busy}>
                Save
              </button>
              <button className="ghost" onClick={() => { setOrigin(selected); clearRoute(); }}>
                Set as start
              </button>
              <button className="ghost" onClick={() => { setDestination(selected); clearRoute(); }}>
                Set as destination
              </button>
            </div>
            <label>Nearby</label>
            <div className="row">
              <select value={nearbyKeyword} onChange={(e) => setNearbyKeyword(e.target.value)}>
                {NEARBY_OPTIONS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
              <button className="ghost" onClick={findNearby} disabled={busy}>
                Find
              </button>
              {nearby.length > 0 && (
                <button className="ghost" onClick={() => setNearby([])}>
                  Hide
                </button>
              )}
            </div>
            {nearby.length > 0 && (
              <ul className="list compact">
                {nearby.slice(0, 8).map((n, i) => (
                  <li key={`${n.eLoc || n.name}-${i}`}>
                    <button className="link" onClick={() => n.lat != null && (setSelected(n), flyTo(n))}>
                      <strong>{n.name}</strong>
                      <small>
                        {n.address}
                        {n.distance != null ? ` · ${Math.round(n.distance)} m` : ''}
                      </small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <RoutePanel
          origin={origin}
          destination={destination}
          center={center}
          pickMode={pickMode}
          setPickMode={setPickMode}
          profile={profile}
          setProfile={(p) => {
            setProfile(p);
            clearRoute();
          }}
          onPickOrigin={pickOrigin}
          onPickDestination={pickDestination}
          onRoute={getRoute}
          onClear={clearAll}
          route={route}
          busy={busy}
        />

        <PlacesList places={places} error={placesError} onSelect={selectSaved} onDelete={deletePlace} />

        <footer className="legend">
          <span><i style={{ background: '#e11d48' }} /> Selected</span>
          <span><i style={{ background: '#16a34a' }} /> Start</span>
          <span><i style={{ background: '#dc2626' }} /> Destination</span>
          <span><i style={{ background: '#7c3aed' }} /> Saved</span>
          <span><i style={{ background: '#0891b2' }} /> Nearby</span>
        </footer>
      </aside>

      <main className={`stage ${pickMode ? 'picking' : ''}`}>
        <MapView
          config={config}
          selected={selected}
          origin={origin}
          destination={destination}
          route={route}
          places={places}
          nearby={nearby}
          focus={focus}
          onMapClick={handleMapClick}
        />
      </main>
    </div>
  );
}
