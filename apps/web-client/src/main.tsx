import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './ui/window-styles.css';
import { App } from './App.js';
import { installDeterminismProbe } from './sim/determinismProbe.js';

installDeterminismProbe();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
