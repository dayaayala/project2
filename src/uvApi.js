/**
 * Geocode a place name and fetch UV index + current weather via Open-Meteo (no API key).
 */

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

const US_STATE_BY_ABBR = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
}

function normalizeLocationQuery(input) {
  const s = String(input ?? '').trim()
  if (!s) return ''
  // Keep letters/numbers/common separators; collapse whitespace.
  return s
    .replace(/[^\p{L}\p{N}\s,'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseCityStateAbbr(query) {
  // Accept "City, ST" or "City ST" (2-letter US abbreviation)
  const m = query.match(/^(.+?)(?:,\s*|\s+)([A-Za-z]{2})$/)
  if (!m) return null
  const city = m[1].trim()
  const abbr = m[2].toUpperCase()
  if (!city) return null
  const state = US_STATE_BY_ABBR[abbr]
  if (!state) return null
  return { city, abbr, state }
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).toLowerCase()
}

function formatDate(date) {
  const formatted = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase().replace(/,/g, ', ')
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
  return { formatted, dayName }
}

function pickCurrentUvFromHourly(forecastData) {
  const hourly = forecastData?.hourly
  const times = hourly?.time
  const values = hourly?.uv_index
  if (!Array.isArray(times) || !Array.isArray(values) || times.length === 0) return null

  // Open-Meteo current_weather.time is in the requested timezone (timezone=auto).
  const nowIsoHour = forecastData?.current_weather?.time
  if (typeof nowIsoHour !== 'string' || !nowIsoHour) return null

  const idx = times.indexOf(nowIsoHour)
  if (idx === -1) return null

  const v = Number(values[idx])
  return Number.isFinite(v) ? v : null
}

export async function fetchUVByLocation(placeName) {
  const raw = String(placeName ?? '').trim()
  const name = normalizeLocationQuery(placeName)
  if (!name) {
    return { error: 'Please enter a location.' }
  }

  async function geocode(query, count = 5) {
    const res = await fetch(
      `${GEOCODE_URL}?name=${encodeURIComponent(query)}&count=${count}&language=en&format=json`
    )
    if (!res.ok) {
      // Surface rate limits / server errors more accurately than "no location found".
      const status = res.status
      if (status === 429) return { error: 'Too many requests. Please try again in a moment.' }
      return { error: 'Could not look up that location. Please try again.' }
    }
    const data = await res.json()
    return { results: data?.results || [] }
  }

  const cityState = parseCityStateAbbr(name)
  let results = []

  if (cityState) {
    const res = await geocode(cityState.city, 20)
    if (res.error) return res
    const wanted = cityState.state.toLowerCase()
    results =
      (res.results || []).filter(
        (r) =>
          String(r?.country_code || '').toUpperCase() === 'US' &&
          String(r?.admin1 || '').toLowerCase() === wanted
      ) || []

    // If filtering is too strict (some entries may omit admin1), fall back to best city match.
    if (results.length === 0) results = res.results || []
  } else {
    const first = await geocode(name)
    if (first.error) return first
    results = first.results
  }

  // Retry with a simpler query if the first attempt returns nothing (e.g. "Paris!!!", "Seattle,WA").
  if (results.length === 0) {
    const simplified = name.replace(/[,']/g, ' ').replace(/\s+/g, ' ').trim()
    if (simplified && simplified !== name) {
      const second = await geocode(simplified)
      if (second.error) return second
      results = second.results
    }
  }

  if (results.length === 0) {
    return { error: `No location found for "${raw || name}". Try "City, ST" (example: "Portland, OR").` }
  }

  const { latitude, longitude, name: locName, admin1, country_code } = results[0]
  const displayName = [locName, admin1].filter(Boolean).join(', ') || locName

  const forecastRes = await fetch(
    `${FORECAST_URL}?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=uv_index&daily=uv_index_max,temperature_2m_max&forecast_days=7&timezone=auto&temperature_unit=fahrenheit`
  )
  const forecastData = await forecastRes.json()

  if (forecastData.error) {
    return { error: forecastData.reason || 'Could not load UV data.' }
  }

  const current = forecastData.current_weather || {}
  const daily = forecastData.daily || {}
  const temp = current.temperature
  const currentUv = pickCurrentUvFromHourly(forecastData)
  const fallbackDailyMax = (daily.uv_index_max && daily.uv_index_max[0]) ?? 0
  const uvIndex = currentUv ?? fallbackDailyMax ?? 0
  const week = Array.isArray(daily.time) && Array.isArray(daily.uv_index_max)
    ? daily.time.map((isoDate, i) => ({
      isoDate,
      uvIndex: daily.uv_index_max[i] ?? 0,
      temperature: daily.temperature_2m_max?.[i] ?? null,
    }))
    : []
  const now = new Date()
  const date = formatDate(now)
  const time = formatTime(now)

  return {
    locationName: displayName,
    uvIndex: Math.round(uvIndex * 10) / 10,
    uvWeek: week,
    temperature: temp,
    date,
    time,
  }
}
