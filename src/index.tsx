// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import PhoneTestPreview from './components/PhoneTestPreview';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <PhoneTestPreview>
      <App />
    </PhoneTestPreview>
  </React.StrictMode>
);
