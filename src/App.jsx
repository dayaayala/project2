import { useState } from 'react'
import Start from './Start'
import Location from './Location'
import UVDisplay from './UVDisplay'
import { fetchUVByLocation } from './uvApi'
import './App.css'

function App() {
  const [page, setPage] = useState('start')
  const [uvData, setUvData] = useState(null)

  if (page === 'uv' && uvData) {
    return (
      <UVDisplay
        locationName={uvData.locationName}
        uvIndex={uvData.uvIndex}
        uvWeek={uvData.uvWeek}
        temperature={uvData.temperature}
        date={uvData.date}
        time={uvData.time}
        onChangeLocation={async (newLocation) => {
          const data = await fetchUVByLocation(newLocation)
          if (!data?.error) setUvData(data)
          return data
        }}
      />
    )
  }

  return (
    <div className="app-transition">
      <div
        className={`app-page app-page--start${page === 'start' ? ' is-visible' : ' is-hidden'}`}
      >
        <Start onStart={() => setPage('location')} />
      </div>
      <div
        className={`app-page app-page--location${page === 'location' ? ' is-visible' : ' is-hidden'}`}
      >
        <Location
          onSubmit={(data) => {
            setUvData(data)
            setPage('uv')
          }}
        />
      </div>
    </div>
  )
}

export default App
