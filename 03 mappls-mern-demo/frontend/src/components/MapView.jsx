import { useEffect, useRef, useState } from 'react';
import { addMarker, addPolyline, loadMapplsSdk, onMapEvent, removeLayer } from '../mapUtils.js';

const MAP_ID = 'mappls-map';
const COLORS = { selected: '#e11d48', origin: '#16a34a', destination: '#dc2626', saved: '#7c3aed', nearby: '#0891b2' };

export default function MapView({ config, selected, origin, destination, route, places, nearby, focus, onMapClick }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const clickRef = useRef(onMapClick);
  clickRef.current = onMapClick; // the map listener is attached only once; the latest handler is read from the ref

  const layers = useRef({ selected: null, origin: null, destination: null, route: null, saved: [], nearby: [] });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  // 1) SDK load + map init
  useEffect(() => {
    if (!config?.mapKey) return undefined;
    let cancelled = false;

    loadMapplsSdk(config.mapKey)
      .then((mappls) => {
        if (cancelled || mapRef.current) return;
        // The Mappls v3 Map constructor needs the container id (string), not the element
        const map = new mappls.Map(MAP_ID, {
          center: config.defaultCenter,
          zoom: config.defaultZoom,
          zoomControl: true,
          location: false,
        });
        mapRef.current = map;

        let started = false;
        const start = () => {
          if (started) return;
          started = true;
          try { map.resize?.(); } catch { /* ignore */ }
          setReady(true);
        };
        onMapEvent(map, 'load', start);
        setTimeout(start, 2500); // continue even if the 'load' event never fires

        onMapEvent(map, 'click', (e) => {
          const ll = e?.lngLat || e?.latlng || e?.latLng;
          if (!ll) return;
          const lat = typeof ll.lat === 'function' ? ll.lat() : ll.lat;
          const lng = typeof ll.lng === 'function' ? ll.lng() : ll.lng;
          if (Number.isFinite(lat) && Number.isFinite(lng)) clickRef.current?.({ lat, lng });
        });
      })
      .catch((e) => !cancelled && setError(e.message));

    return () => {
      cancelled = true;
      const map = mapRef.current;
      mapRef.current = null;
      layers.current = { selected: null, origin: null, destination: null, route: null, saved: [], nearby: [] };
      setReady(false);
      try {
        map?.remove?.();
      } catch {
        /* ignore */
      }
    };
  }, [config?.mapKey]);

  // 2) Layers
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    const L = layers.current;
    removeLayer(map, L.selected);
    L.selected = selected
      ? addMarker(map, { ...selected, color: COLORS.selected, title: selected.name, subtitle: selected.address })
      : null;
  }, [ready, selected]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    const L = layers.current;
    removeLayer(map, L.origin);
    L.origin = origin ? addMarker(map, { ...origin, color: COLORS.origin, title: 'Start', subtitle: origin.name }) : null;
  }, [ready, origin]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    const L = layers.current;
    removeLayer(map, L.destination);
    L.destination = destination
      ? addMarker(map, { ...destination, color: COLORS.destination, title: 'Destination', subtitle: destination.name })
      : null;
  }, [ready, destination]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    const L = layers.current;
    removeLayer(map, L.route);
    L.route = route?.path?.length ? addPolyline(map, route.path) : null;
  }, [ready, route]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    const L = layers.current;
    L.saved.forEach((m) => removeLayer(map, m));
    L.saved = places
      .map((p) => addMarker(map, { lat: p.lat, lng: p.lng, color: COLORS.saved, title: p.name, subtitle: p.address }))
      .filter(Boolean);
  }, [ready, places]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    const L = layers.current;
    L.nearby.forEach((m) => removeLayer(map, m));
    L.nearby = nearby
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => addMarker(map, { lat: p.lat, lng: p.lng, color: COLORS.nearby, title: p.name, subtitle: p.address }))
      .filter(Boolean);
  }, [ready, nearby]);

  // 3) Fly to a point
  useEffect(() => {
    if (!ready || !focus) return;
    const map = mapRef.current;
    try {
      map.setCenter({ lat: focus.lat, lng: focus.lng });
      if (focus.zoom) map.setZoom(focus.zoom);
    } catch (e) {
      console.error('focus failed', e);
    }
  }, [ready, focus]);

  if (!config?.mapKey) {
    return (
      <div className="map-message">
        <h2>Mappls credentials problem</h2>
        <p>
          Set <code>MAPPLS_KEY</code> in <code>backend/.env</code> and restart the backend.
        </p>
        {config?.authError && <p className="hint error">{config.authError}</p>}
      </div>
    );
  }

  return (
    <div className="map-wrap">
      <div id={MAP_ID} ref={elRef} className="map" />
      {error && <div className="map-error">{error}</div>}
    </div>
  );
}
