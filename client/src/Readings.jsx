import { useEffect, useState } from 'react'
import { api, fmtDate, SLOTS, todayStr } from './api'

const blank = () => ({ date: todayStr(), slot: 'morning', value: '' })

export default function Readings() {
  const [readings, setReadings] = useState(null) // null = loading
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState(blank)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [version, setVersion] = useState(0) // bump to reload the list
  const load = () => setVersion((v) => v + 1)

  useEffect(() => {
    api('/readings')
      .then((d) => { setReadings(d.readings); setLoadError('') })
      .catch((e) => { setLoadError(e.message); setReadings([]) })
  }, [version])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api(editingId ? `/readings/${editingId}` : '/readings', {
        method: editingId ? 'PUT' : 'POST',
        body: form,
      })
      setForm(blank())
      setEditingId(null)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(r) {
    if (!window.confirm(`Delete the ${SLOTS[r.slot]} reading of ${fmtDate(r.date)}?`)) return
    try {
      await api(`/readings/${r.id}`, { method: 'DELETE' })
      if (editingId === r.id) cancel()
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  function edit(r) {
    setEditingId(r.id)
    setForm({ date: r.date, slot: r.slot, value: String(r.value) })
    setError('')
  }

  function cancel() {
    setEditingId(null)
    setForm(blank())
    setError('')
  }

  return (
    <>
      <form onSubmit={submit} className="card">
        <h2>{editingId ? 'Edit reading' : 'Add reading'}</h2>
        <div className="row">
          <label>Date<input type="date" value={form.date} onChange={set('date')} /></label>
          <label>
            Time slot
            <select value={form.slot} onChange={set('slot')}>
              {Object.entries(SLOTS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </label>
          <label>
            Value (mg/dl)
            <input inputMode="numeric" value={form.value} onChange={set('value')} placeholder="e.g. 110" />
          </label>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="row">
          <button type="submit" disabled={busy}>{editingId ? 'Save changes' : 'Add reading'}</button>
          {editingId && <button type="button" className="link" onClick={cancel}>Cancel</button>}
        </div>
      </form>

      <section className="card">
        <h2>Your readings</h2>
        {loadError && <p className="error" role="alert">{loadError}</p>}
        {readings === null && <p className="muted">Loading…</p>}
        {readings?.length === 0 && !loadError && (
          <p className="empty">No readings yet. Add your first reading above.</p>
        )}
        {readings?.length > 0 && (
          <table>
            <thead><tr><th>Date</th><th>Slot</th><th>mg/dl</th><th /></tr></thead>
            <tbody>
              {readings.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDate(r.date)}</td>
                  <td>{SLOTS[r.slot]}</td>
                  <td>{r.value}</td>
                  <td className="actions">
                    <button className="link" onClick={() => edit(r)}>Edit</button>
                    <button className="link danger" onClick={() => remove(r)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  )
}
