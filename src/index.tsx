// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import AppUpdateProvider from './features/app-update/AppUpdateProvider';
import PhoneTestPreview from './components/PhoneTestPreview';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <PhoneTestPreview>
      <AppUpdateProvider><App /></AppUpdateProvider>
    </PhoneTestPreview>
  </React.StrictMode>
);
