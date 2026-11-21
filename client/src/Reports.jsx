import { useEffect, useState } from 'react'
import { api, fmtDate, SLOTS, todayStr } from './api'

const range = (r) => (r.from === r.to ? fmtDate(r.from) : `${fmtDate(r.from, false)} – ${fmtDate(r.to)}`)

function Stats({ title, report, children }) {
  return (
    <section className="card">
      <h2>{title} <span className="muted">{range(report)}</span></h2>
      {report.count === 0 ? (
        <p className="empty">No readings for this period.</p>
      ) : (
        <>
          <dl className="stats">
            <div><dt>Highest</dt><dd>{report.highest}</dd></div>
            <div><dt>Lowest</dt><dd>{report.lowest}</dd></div>
            <div><dt>Average</dt><dd>{report.average.toFixed(1)}</dd></div>
            <div><dt>Readings</dt><dd>{report.count}</dd></div>
          </dl>
          {children}
        </>
      )}
    </section>
  )
}

export default function Reports() {
  const [date, setDate] = useState(todayStr)
  const [result, setResult] = useState({}) // { date, data } or { date, error }

  useEffect(() => {
    let current = true // ignore a slow response if the date changed meanwhile
    api(`/reports?date=${encodeURIComponent(date)}`)
      .then((data) => current && setResult({ date, data }))
      .catch((e) => current && setResult({ date, error: e.message }))
    return () => { current = false }
  }, [date])

  const fresh = result.date === date
  const data = fresh ? result.data : null
  const error = fresh ? result.error : ''

  return (
    <>
      <div className="card">
        <label>Report date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <p className="muted">Values are in mg/dl.</p>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {!data && !error && <p className="muted">Loading…</p>}
      {data && (
        <>
          <Stats title="Daily" report={data.daily}>
            <table>
              <thead><tr><th>Slot</th><th>mg/dl</th></tr></thead>
              <tbody>
                {data.daily.readings.map((r) => (
                  <tr key={r.id}><td>{SLOTS[r.slot]}</td><td>{r.value}</td></tr>
                ))}
              </tbody>
            </table>
          </Stats>
          <Stats title="Month to date" report={data.monthToDate} />
          <Stats title="Previous month" report={data.previousMonth} />
        </>
      )}
    </>
  )
}
