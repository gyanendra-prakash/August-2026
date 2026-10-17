import PlaceSearch from './PlaceSearch.jsx';

const PROFILES = [
  ['driving', 'Car'],
  ['biking', 'Bike'],
  ['walking', 'Walk'],
];

export function formatDistance(m) {
  if (m == null) return '-';
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

export function formatDuration(s) {
  if (s == null) return '-';
  const mins = Math.round(s / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min`;
}

export default function RoutePanel({
  origin,
  destination,
  center,
  pickMode,
  setPickMode,
  profile,
  setProfile,
  onPickOrigin,
  onPickDestination,
  onRoute,
  onClear,
  route,
  busy,
}) {
  return (
    <section className="panel">
      <h3>Route</h3>

      <label>Start</label>
      <div className="row">
        <PlaceSearch placeholder="Start point search karo" center={center} value={origin?.name || ''} onPick={onPickOrigin} />
        <button
          className={`ghost ${pickMode === 'origin' ? 'active' : ''}`}
          onClick={() => setPickMode(pickMode === 'origin' ? null : 'origin')}
          title="Map pe click karke start chuno"
        >
          Map
        </button>
      </div>

      <label>Destination</label>
      <div className="row">
        <PlaceSearch
          placeholder="Destination search karo"
          center={center}
          value={destination?.name || ''}
          onPick={onPickDestination}
        />
        <button
          className={`ghost ${pickMode === 'destination' ? 'active' : ''}`}
          onClick={() => setPickMode(pickMode === 'destination' ? null : 'destination')}
          title="Map pe click karke destination chuno"
        >
          Map
        </button>
      </div>

      {pickMode && <div className="hint">Ab map pe kahin bhi click karo ({pickMode === 'origin' ? 'start' : 'destination'} set hoga).</div>}

      <div className="chips">
        {PROFILES.map(([value, label]) => (
          <button key={value} className={`chip ${profile === value ? 'on' : ''}`} onClick={() => setProfile(value)}>
            {label}
          </button>
        ))}
      </div>

      <div className="row">
        <button className="primary" disabled={!origin || !destination || busy} onClick={onRoute}>
          Get route
        </button>
        <button className="ghost" onClick={onClear}>
          Clear
        </button>
      </div>

      {route && (
        <div className="result">
          <div>
            <small>Distance</small>
            <strong>{formatDistance(route.distanceMeters)}</strong>
          </div>
          <div>
            <small>Time</small>
            <strong>{formatDuration(route.durationSeconds)}</strong>
          </div>
        </div>
      )}
    </section>
  );
}
