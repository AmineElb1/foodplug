export default function Halal({ size = 72, className = '' }) {
  return (
    <svg className={`halal ${className}`} width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Halal">
      <circle cx="50" cy="50" r="48" fill="#2b0b0a" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="#e3b322" strokeWidth="2" />
      <text x="50" y="54" textAnchor="middle" fontSize="34" fontWeight="700" fill="#e3b322"
        fontFamily="'Noto Naskh Arabic','Geeza Pro','Segoe UI',Tahoma,serif">حلال</text>
      <text x="50" y="75" textAnchor="middle" fontSize="13" letterSpacing="2.5" fill="#fff"
        fontFamily="Anton,sans-serif">HALAL</text>
    </svg>
  )
}
