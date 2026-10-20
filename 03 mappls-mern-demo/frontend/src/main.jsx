import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// StrictMode is intentionally not used: in dev, effects run twice
// and the Mappls map would be initialised twice in the same div.
createRoot(document.getElementById('root')).render(<App />);
