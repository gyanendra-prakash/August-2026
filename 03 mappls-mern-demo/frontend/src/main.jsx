import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// StrictMode intentionally nahi lagaya: dev mein effects do baar chalte hain
// aur Mappls map ek hi div mein do baar initialise ho jata.
createRoot(document.getElementById('root')).render(<App />);
