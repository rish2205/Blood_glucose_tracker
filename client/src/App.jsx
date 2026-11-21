import { useEffect, useState } from 'react'
import { clearSession, getToken } from './api'
import AuthForm from './AuthForm'
import Readings from './Readings'
import Reports from './Reports'
import './App.css'

const savedUser = () => {
  try {
    return getToken() ? JSON.parse(localStorage.getItem('user')) : null
  } catch {
    return null
  }
}

export default function App() {
  const [user, setUser] = useState(savedUser)
  const [tab, setTab] = useState('readings')

  const logout = () => {
    clearSession()
    setUser(null)
  }

  // api.js fires this when the server says the token is missing or expired
  useEffect(() => {
    window.addEventListener('auth-expired', logout)
    return () => window.removeEventListener('auth-expired', logout)
  }, [])

  if (!user) return <AuthForm onLogin={setUser} />

  return (
    <main>
      <header className="top">
        <h1>Sweety</h1>
        <span>
          {user.name} <button className="link" onClick={logout}>Log out</button>
        </span>
      </header>
      <nav className="tabs">
        <button className={tab === 'readings' ? 'on' : ''} onClick={() => setTab('readings')}>Readings</button>
        <button className={tab === 'reports' ? 'on' : ''} onClick={() => setTab('reports')}>Reports</button>
      </nav>
      {tab === 'readings' ? <Readings /> : <Reports />}
    </main>
  )
}
