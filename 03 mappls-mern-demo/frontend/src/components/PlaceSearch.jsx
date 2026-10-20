import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

/** Search box backed by Mappls Autosuggest (called through our backend). */
export default function PlaceSearch({ placeholder, center, onPick, value = '' }) {
  const [q, setQ] = useState(value);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const lastPicked = useRef(value);

  // Keep the input in sync when the parent changes the value (e.g. origin set by a map click)
  useEffect(() => {
    lastPicked.current = value;
    setQ(value);
  }, [value]);

  useEffect(() => {
    const text = q.trim();
    if (text === lastPicked.current || text.length < 3) {
      if (text.length < 3) setItems([]);
      return undefined;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        setItems(await api.autosuggest(text, center, ctrl.signal));
        setOpen(true);
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const pick = (item) => {
    lastPicked.current = item.name;
    setQ(item.name);
    setOpen(false);
    onPick(item);
  };

  return (
    <div className="search">
      <input
        value={q}
        placeholder={placeholder}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => items.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {loading && <span className="spinner" aria-label="loading" />}
      {error && <div className="hint error">{error}</div>}
      {open && items.length > 0 && (
        <ul className="suggestions">
          {items.map((it, i) => (
            <li key={`${it.eLoc || it.name}-${i}`} onMouseDown={() => pick(it)}>
              <strong>{it.name}</strong>
              <small>{it.address}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
