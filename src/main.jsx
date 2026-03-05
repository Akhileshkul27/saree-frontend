import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { store } from './store/store'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { fontFamily: "'Poppins', sans-serif", fontSize: '14px' },
            success: { style: { background: '#F0FDF4', color: '#166534', border: '1px solid #86EFAC' } },
            error: { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5' } },
          }}
        />
      </BrowserRouter>
    </Provider>
  </StrictMode>
)
