import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// StrictMode is intentionally removed here. It causes useEffect to fire twice
// in development, which produces duplicate welcome blocks. The init guard in
// App.jsx (hasInit ref) is the correct fix, but StrictMode's double-invoke
// also fires setTimeout-based restarts twice. Removing it keeps dev and prod
// behaviour identical without losing any meaningful warnings for this codebase.
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
