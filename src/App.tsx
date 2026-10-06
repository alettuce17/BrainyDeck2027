import { HashRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import CreateDeck from './pages/CreateDeck'
import DeckPage from './pages/DeckPage'
import StudyPage from './pages/StudyPage'
import SettingsPage from './pages/SettingsPage'
import AuthPage from './pages/AuthPage'

export default function App(){return <HashRouter><Routes><Route element={<Layout/>}><Route index element={<Dashboard/>}/><Route path="create" element={<CreateDeck/>}/><Route path="deck/:id" element={<DeckPage/>}/><Route path="study" element={<StudyPage/>}/><Route path="study/:id" element={<StudyPage/>}/><Route path="settings" element={<SettingsPage/>}/><Route path="auth" element={<AuthPage/>}/></Route></Routes></HashRouter>}
