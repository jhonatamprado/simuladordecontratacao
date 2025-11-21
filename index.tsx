import React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from './src/App';

const root = ReactDOM.createRoot(
  document.querySelector('app-root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// AI Studio always uses an `index.tsx` file for all project types.