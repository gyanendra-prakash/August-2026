export default function PlacesList({ places, error, onSelect, onDelete }) {
  return (
    <section className="panel">
      <h3>Saved places (MongoDB)</h3>
      {error && <div className="hint error">{error}</div>}
      {!error && places.length === 0 && <div className="hint">Abhi koi place save nahi hui. Search karke "Save" dabao.</div>}
      <ul className="list">
        {places.map((p) => (
          <li key={p._id}>
            <button className="link" onClick={() => onSelect(p)}>
              <strong>{p.name}</strong>
              <small>{p.address}</small>
            </button>
            <button className="ghost danger" onClick={() => onDelete(p._id)} aria-label={`Delete ${p.name}`}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
