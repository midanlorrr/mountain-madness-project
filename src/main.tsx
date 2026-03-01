import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Fix for MediaPipe/Emscripten "Module.arguments" error in Vite/React
if (typeof window !== 'undefined') {
  (window as any).arguments = (window as any).arguments || [];
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
