export function PurchasingPowerChart({ full = false }: { full?: boolean }) {
  const values = Array.from({ length: 6 }, (_, year) => 1000 / 1.05 ** year);
  const coordinates = values.map((value, index) => `${34 + index * 54},${46 + (1000 - value) * 0.5}`).join(" ");
  return <figure className={`purchasing-chart ${full ? "chart-full" : ""}`}>
    <figcaption><span className="chart-mini-title">EL VALOR DETRÁS DEL DINERO</span><span className="chart-badge">EJEMPLO DIDÁCTICO</span></figcaption>
    <svg viewBox="0 0 355 225" role="img" aria-labelledby={full ? "power-chart-full" : "power-chart-title"}>
      <title id={full ? "power-chart-full" : "power-chart-title"}>Con inflación hipotética constante del 5% anual, 1.000 euros sin remunerar conservan 783,53 euros de poder adquisitivo inicial a los cinco años.</title>
      <defs><linearGradient id={full ? "area-full" : "area-hero"} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#4ad8b4" stopOpacity="0.18"/><stop offset="100%" stopColor="#4ad8b4" stopOpacity="0"/></linearGradient></defs>
      {[46, 85, 124, 163, 190].map(y => <line key={y} x1="34" x2="306" y1={y} y2={y} className="chart-grid"/>)}
      {[34,88,142,196,250,304].map((x, index) => <g key={x}><line x1={x} x2={x} y1="28" y2="190" className="chart-grid"/><text x={x} y="210" textAnchor="middle" className="chart-axis">{index === 0 ? "Hoy" : `${index} a`}</text></g>)}
      <path d={`M34,190 L${coordinates.replaceAll(" ", " L")} L304,190 Z`} fill={`url(#${full ? "area-full" : "area-hero"})`}/>
      <line x1="34" x2="304" y1="46" y2="46" className="chart-nominal"/>
      <polyline points={coordinates} fill="none" stroke="#4ad8b4" strokeWidth="2.5" strokeLinejoin="round"/>
      <circle cx="304" cy={46 + (1000 - values[5]) * 0.5} r="4" fill="#4ad8b4"/>
      <text x="35" y="31" className="chart-label">1.000 €</text><text x="266" y="143" className="chart-value">783,53 €</text>
    </svg>
    <div className="chart-legend"><span><i className="legend-line nominal"/>Valor nominal</span><span><i className="legend-line"/>Poder adquisitivo</span></div>
    {full && <p className="muted small">Supuesto: inflación constante del 5% anual, sin intereses. Valor real = 1.000 / 1,05ⁿ. No representa datos históricos ni una previsión.</p>}
  </figure>;
}
