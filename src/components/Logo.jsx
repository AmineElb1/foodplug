export default function Logo({ inverted = false }) {
  return (
    <div className={`logo ${inverted ? 'logo--inv' : ''}`}>
      <span>FOOD PLUG</span>
    </div>
  )
}
