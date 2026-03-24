import './Start.css'

export default function Start({ onStart }) {
  return (
    <div className="start" data-name="start">
      <div className="start__bg" />
      <div className="start__ellipse-wrap">
        <div className="start__ellipse" aria-hidden />
      </div>
      <button type="button" className="start__btn" onClick={onStart}>
        START
      </button>
    </div>
  )
}
