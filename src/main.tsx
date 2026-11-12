import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './styles/preview.css';

/*
 * iPhone: når tastaturet lukker, kan siden blive hængende skubbet op.
 * Vi sætter den tilbage på plads, når man forlader et tekstfelt.
 */
document.addEventListener('focusout', () => {
  window.setTimeout(() => {
    const el = document.activeElement;
    const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
    if (!typing && (window.scrollY !== 0 || window.scrollX !== 0)) window.scrollTo(0, 0);
  }, 80);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
