const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const SLOTS = {
  morning: 'Morning (fasting)',
  after_breakfast: 'After breakfast',
  after_lunch: 'After lunch',
  after_dinner: 'After dinner',
}

export const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 'YYYY-MM-DD' -> '15 Oct 2026' (UTC, so the day never shifts with time zone)
export const fmtDate = (s, withYear = true) =>
  new Date(`${s}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', ...(withYear && { year: 'numeric' }), timeZone: 'UTC',
  })

export const getToken = () => localStorage.getItem('token')
export const saveSession = ({ token, user }) => {
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
}
export const clearSession = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

// Throws Error(message) with the server's message so the UI can show it as is.
export async function api(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers: {
        ...(body && { 'Content-Type': 'application/json' }),
        ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
      },
      body: body && JSON.stringify(body),
    })
  } catch {
    throw new Error('Cannot reach the server. Please check your connection and try again.')
  }
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/login')) window.dispatchEvent(new Event('auth-expired'))
    throw new Error(data.error || 'Something went wrong. Please try again.')
  }
  return data
}
