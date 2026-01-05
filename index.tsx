
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// FactorySync: Dependencias actualizadas para GitHub Sync
console.log("FactorySync V25: Ready");

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
} else {
  console.error("Failed to find the root element");
}
