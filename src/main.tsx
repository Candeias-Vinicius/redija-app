import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { GoogleAuthProvider } from './core/auth/GoogleAuthContext';
import { requestStoragePersistence } from './core/storage/db';
import './index.css';

// Solicita persistência de armazenamento local ao navegador (blindagem contra falta de disco)
requestStoragePersistence().catch(() => {});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleAuthProvider>
      <App />
    </GoogleAuthProvider>
  </React.StrictMode>
);
