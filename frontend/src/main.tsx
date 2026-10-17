import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { initNativeShell } from './native'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// No-op in a browser; wires the hardware back button, status bar and splash
// inside the AweFit Android shell.
void initNativeShell()
