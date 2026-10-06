import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { DeckProvider } from './contexts/DeckContext'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AuthProvider><DeckProvider><App/></DeckProvider></AuthProvider></React.StrictMode>)
