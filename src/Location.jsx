import { useState } from 'react'
import './Location.css'

export default function Location({ onSubmit }) {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const name = value.trim()
    if (!name || !onSubmit) return
    setError('')
    setLoading(true)
    try {
      const { fetchUVByLocation } = await import('./uvApi')
      const data = await fetchUVByLocation(name)
      if (data.error) {
        setError(data.error)
        return
      }
      onSubmit(data)
    } catch (err) {
      setError('Could not load UV data. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="location" data-name="location page">
      <div className="location__bg" />
      <h1 className="location__title">WHERE ARE YOU?</h1>
      <form className="location__form" onSubmit={handleSubmit}>
        <label className="location__field" data-name="location button">
          <input
            type="text"
            className="location__input"
            placeholder="LOCATION"
            aria-label="Enter your location"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={loading}
            autoFocus
          />
        </label>
        {error && <p className="location__error" role="alert">{error}</p>}
      </form>
    </div>
  )
}
