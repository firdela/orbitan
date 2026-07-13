import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

// PWA service worker registration is handled by <PWAUpdateListener />
// inside the React component tree, so it has access to the toast system.