import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { requestPersistence } from './storage';
import './styles.css';

declare const __PWA__: boolean;

createRoot(document.getElementById('root')!).render(<App />);

// Ask the browser to keep Piggy's data even when the device is low on space.
requestPersistence();

// Offline support. Only in the installable build (the claude.ai preview can't run service workers).
if (typeof __PWA__ !== 'undefined' && __PWA__ && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => { /* offline support unavailable */ });
  });
}
