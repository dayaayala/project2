import { useMemo, useState } from 'react'
import './UVDisplay.css'

function UnionIcon() {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 11H0V10H16V11ZM16 6H0V5H16V6ZM16 1H0V0H16V1Z" fill="black" />
    </svg>
  )
}

function formatWeekLabel(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatFullDateFromIso(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`)
  const formatted = d
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase()
    .replace(/,/g, ', ')
  const dayName = d.toLocaleDateString('en-US', { weekday: 'long' })
  return { formatted, dayName }
}

export default function UVDisplay({
  locationName,
  uvIndex = 0,
  uvWeek = [],
  temperature,
  date,
  time,
  onChangeLocation,
}) {
  const base = import.meta.env.BASE_URL
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  // null means "show current UV now". Selecting a day switches to that day's max UV.
  const [selectedIso, setSelectedIso] = useState(null)
  const [isEditingLocation, setIsEditingLocation] = useState(false)
  const [locationDraft, setLocationDraft] = useState(locationName || '')
  const [locationError, setLocationError] = useState('')
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false)

  const selected = useMemo(() => {
    if (!selectedIso) return null
    if (!Array.isArray(uvWeek) || uvWeek.length === 0) return null
    return uvWeek.find((d) => d.isoDate === selectedIso) ?? null
  }, [selectedIso, uvWeek])

  const effectiveUvIndex = selected?.uvIndex ?? uvIndex
  const uvRaw = Number(effectiveUvIndex)
  const uvDisplay = Number.isFinite(uvRaw) ? Math.round(uvRaw) : 0
  const uvMeter = uvDisplay
  // Clamp to 0–11 for the meter scale
  const uvClamped = Math.min(11, Math.max(0, uvMeter))
  const meterSteps = 11

  const isToday = !selected || selected?.isoDate === uvWeek?.[0]?.isoDate
  const effectiveTemperature = isToday ? temperature : selected?.temperature ?? temperature
  const tempNum = Number(effectiveTemperature)
  let tempRangeClass = 'uv-display__gradient--warm'
  if (!Number.isFinite(tempNum)) {
    tempRangeClass = 'uv-display__gradient--warm'
  } else if (tempNum <= 50) {
    tempRangeClass = 'uv-display__gradient--cold'
  } else if (tempNum <= 75) {
    tempRangeClass = 'uv-display__gradient--warm'
  } else {
    tempRangeClass = 'uv-display__gradient--hot'
  }

  const effectiveDate = selected?.isoDate ? formatFullDateFromIso(selected.isoDate) : date

  async function submitLocationChange(e) {
    e.preventDefault()
    setLocationError('')
    const next = locationDraft.trim()
    if (!next) return
    setIsUpdatingLocation(true)
    try {
      // Parent passes this; returns {error?} on failure.
      const result = await (typeof onChangeLocation === 'function' ? onChangeLocation(next) : null)
      if (result?.error) {
        setLocationError(result.error)
        return
      }
      setIsEditingLocation(false)
    } finally {
      setIsUpdatingLocation(false)
    }
  }

  return (
    <div className="uv-display" data-name="COLD">
      <div className="uv-display__bg" />
      <button
        type="button"
        className="uv-display__menu"
        aria-label="Open week calendar"
        onClick={() => setIsPickerOpen(true)}
      >
        <UnionIcon />
      </button>

      <p className="uv-display__day">{effectiveDate?.dayName ?? 'Monday'}</p>
      <p className="uv-display__temp">{effectiveTemperature != null ? `${Math.round(effectiveTemperature)}°` : '--°'}</p>
      <p className="uv-display__date">{effectiveDate?.formatted ?? '—'}</p>
      <p className="uv-display__time">{time ?? '—'}</p>

      <div className="uv-display__hero">
        <div className={`uv-display__hero-shape ${tempRangeClass}`} aria-hidden />
        <p className={`uv-display__uv-value${uvDisplay === 6 ? ' uv-display__uv-value--6' : ''}${uvDisplay === 8 ? ' uv-display__uv-value--8' : ''}`}>{uvDisplay}</p>
      </div>

      <div className="uv-display__meter" data-name="meter">
        <div className="uv-display__meter-line" />
        <div className="uv-display__meter-dots">
          {Array.from({ length: meterSteps + 1 }, (_, i) => (
            <div
              key={i}
              className={`uv-display__meter-dot${
                i < uvClamped ? ' uv-display__meter-dot--active' : ''
              }`}
            />
          ))}
        </div>
        <p className="uv-display__meter-label uv-display__meter-label--low">LOW</p>
        <p className="uv-display__meter-label uv-display__meter-label--high">EXTREME</p>
      </div>

      {!isEditingLocation ? (
        <button
          type="button"
          className="uv-display__location"
          onClick={() => {
            setLocationDraft(locationName || '')
            setLocationError('')
            setIsEditingLocation(true)
          }}
          aria-label="Edit location"
        >
          {locationName || 'Enter location'}
        </button>
      ) : (
        <form className="uv-display__location-form" onSubmit={submitLocationChange}>
          <label className="uv-display__location-field">
            <input
              className="uv-display__location-input"
              type="text"
              value={locationDraft}
              onChange={(e) => setLocationDraft(e.target.value)}
              placeholder="LOCATION"
              disabled={isUpdatingLocation}
              aria-label="Enter a new location"
              autoFocus
            />
          </label>
          <div className="uv-display__location-actions">
            <button
              type="submit"
              className="uv-display__location-save"
              disabled={isUpdatingLocation}
            >
              {isUpdatingLocation ? 'Loading…' : 'Update'}
            </button>
            <button
              type="button"
              className="uv-display__location-cancel"
              onClick={() => {
                setIsEditingLocation(false)
                setLocationError('')
              }}
              disabled={isUpdatingLocation}
            >
              Cancel
            </button>
          </div>
          {locationError && (
            <p className="uv-display__location-error" role="alert">
              {locationError}
            </p>
          )}
        </form>
      )}

      <div className="uv-display__bottom">
        <div className={`uv-display__bottom-shape ${tempRangeClass}`} aria-hidden />
      </div>

      {isPickerOpen && (
        <div className="uv-display__overlay" role="dialog" aria-modal="true" aria-label="Pick a day">
          <button
            type="button"
            className="uv-display__overlay-backdrop"
            aria-label="Close"
            onClick={() => setIsPickerOpen(false)}
          />
          <div className="uv-display__picker">
            <div className="uv-display__picker-header">
              <p className="uv-display__picker-title">THIS WEEK</p>
              <button
                type="button"
                className="uv-display__picker-close"
                onClick={() => setIsPickerOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="uv-display__picker-grid">
              {(uvWeek || []).map((d) => {
                const active = d.isoDate === (selectedIso ?? uvWeek?.[0]?.isoDate)
                return (
                  <button
                    key={d.isoDate}
                    type="button"
                    className={`uv-display__picker-day${active ? ' is-active' : ''}`}
                    onClick={() => {
                      setSelectedIso(d.isoDate)
                      setIsPickerOpen(false)
                    }}
                  >
                    <span className="uv-display__picker-day-label">{formatWeekLabel(d.isoDate)}</span>
                    <span className="uv-display__picker-day-uv">UV {Math.round(Number(d.uvIndex) || 0)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
