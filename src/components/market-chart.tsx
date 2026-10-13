"use client";

import type { Candle } from "@/modules/market-data/types";

export function MarketChart({candles,levels=[],label="Velas disponibles",onSelect}:{candles:Candle[];levels?:{price:number;label:string}[];label?:string;onSelect?:(price:number)=>void}) {
  const visible=candles.slice(-70);if(!visible.length)return <p>Sin velas disponibles.</p>;
  const min=Math.min(...visible.map(candle=>candle.low),...levels.map(level=>level.price));const max=Math.max(...visible.map(candle=>candle.high),...levels.map(level=>level.price));const range=Math.max(max-min,max*.0001);const padding=range*.12;const low=min-padding,high=max+padding;
  const y=(price:number)=>260-(price-low)/(high-low)*230;const width=620/visible.length;
  return <figure className="market-chart"><svg viewBox="0 0 760 305" role="img" aria-label={label} onClick={event=>{if(!onSelect)return;const bounds=event.currentTarget.getBoundingClientRect();const clicked=(event.clientY-bounds.top)/bounds.height*305;onSelect(high-(clicked-30)/230*(high-low));}}>
    {[0,.25,.5,.75,1].map(t=><g key={t}><line x1="35" x2="665" y1={30+t*230} y2={30+t*230} stroke="var(--border)"/><text x="675" y={34+t*230} fill="var(--muted)" fontSize="10">{(high-t*(high-low)).toFixed(max>10 ? 3 : 5)}</text></g>)}
    {visible.map((candle,index)=>{const x=40+(index+.5)*width;const color=candle.close>=candle.open ? "#65d2ab" : "#ef8e85";return <g key={candle.time}><title>{candle.time} · O {candle.open.toFixed(5)} H {candle.high.toFixed(5)} L {candle.low.toFixed(5)} C {candle.close.toFixed(5)}</title><line x1={x} x2={x} y1={y(candle.high)} y2={y(candle.low)} stroke={color}/><rect x={x-width*.3} y={Math.min(y(candle.open),y(candle.close))} width={Math.max(2,width*.6)} height={Math.max(1,Math.abs(y(candle.open)-y(candle.close)))} fill={color}/></g>;})}
    {levels.map((level,index)=><g key={index}><line x1="35" x2="665" y1={y(level.price)} y2={y(level.price)} stroke="#cfb67d" strokeDasharray="5 4"/><text x="40" y={y(level.price)-5} fill="#cfb67d" fontSize="10">{level.label}</text></g>)}
    <text x="35" y="287" fill="var(--muted)" fontSize="10">{visible[0].time.slice(0,16).replace("T"," ")} UTC</text><text x="455" y="287" fill="var(--muted)" fontSize="10">{visible[visible.length-1].time.slice(0,16).replace("T"," ")} UTC</text>
  </svg><figcaption>{label}. Últimas {visible.length} velas disponibles. Pasa el cursor sobre cada vela para ver OHLC.</figcaption></figure>;
}

export function EquityChart({values,label="Evolución del capital"}:{values:number[];label?:string}) {
  if(values.length<2)return null;const min=Math.min(...values),max=Math.max(...values);const range=max-min || 1;const points=values.map((value,index)=>`${20+index/(values.length-1)*620},${160-(value-min)/range*130}`).join(" ");
  return <figure className="equity-chart"><svg viewBox="0 0 740 185" role="img" aria-label={label}><line x1="20" x2="640" y1="160" y2="160" stroke="var(--border)"/><polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="2"/><text x="650" y="35" fill="var(--muted)" fontSize="11">{max.toFixed(2)}</text><text x="650" y="160" fill="var(--muted)" fontSize="11">{min.toFixed(2)}</text></svg><figcaption>{label}</figcaption></figure>;
}
