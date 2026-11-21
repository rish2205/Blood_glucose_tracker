import { useState } from 'react'
import { api, saveSession } from './api'

export default function AuthForm({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data = await api(`/auth/${mode}`, { method: 'POST', body: form })
      saveSession(data)
      onLogin(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="narrow">
      <h1>Sweety</h1>
      <p className="muted">Track your blood glucose readings.</p>
      <form onSubmit={submit} className="card">
        <h2>{mode === 'login' ? 'Log in' : 'Create account'}</h2>
        {mode === 'register' && (
          <label>Name<input value={form.name} onChange={set('name')} autoComplete="name" /></label>
        )}
        <label>Email<input type="email" value={form.email} onChange={set('email')} autoComplete="email" /></label>
        <label>
          Password
          <input
            type="password" value={form.password} onChange={set('password')}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </label>
        {mode === 'register' && <small className="muted">At least 8 characters.</small>}
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}</button>
        <button type="button" className="link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>
          {mode === 'login' ? 'No account? Sign up' : 'Have an account? Log in'}
        </button>
      </form>
    </main>
  )
}
