import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import CustomerPortal from './pages/CustomerPortal'

const isPortal = window.location.pathname.startsWith('/portal')

if (isPortal) {
  createRoot(document.getElementById('root')).render(<CustomerPortal />)
} else {
  createRoot(document.getElementById('root')).render(<App />)
}
