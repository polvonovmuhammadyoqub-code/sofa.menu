import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import LanguageProvider from './lib/LanguageProvider';
import GuestMenuSite from './pages/GuestMenuSite';
import './guest-entry.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <GuestMenuSite />
    </LanguageProvider>
  </StrictMode>
);
