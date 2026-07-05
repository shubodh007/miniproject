import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { initSecurity } from './utils/security';
import { ToastProvider } from './components/ToastProvider';

// Initialize the cryptological keys and pre-warm storage caches immediately on boot
initSecurity().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrowserRouter>
    </StrictMode>,
  );
}).catch((err) => {
  console.error('Critical: Security initialization failed, rendering app fallback', err);
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrowserRouter>
    </StrictMode>,
  );
});
