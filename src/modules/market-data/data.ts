import { seededRandom } from "@/modules/risk/calculations";
import type { Candle, MarketDataset } from "./types";

export function validateDataset(data:MarketDataset):MarketDataset {
  if(!data || typeof data!=="object" || !["simulated","imported"].includes(data.kind) || typeof data.name!=="string" || data.name.length<1 || data.name.length>150 || typeof data.source!=="string" || data.source.length<1 || data.source.length>500 || !/^[A-Z]{3}\/[A-Z]{3}$/.test(data.pair) || !Number.isInteger(data.timeframeMinutes) || data.timeframeMinutes<1 || data.timeframeMinutes>10080 || !Array.isArray(data.candles) || data.candles.length<2 || data.candles.length>5000)throw new Error("Revisa nombre, fuente, par, temporalidad y número de velas (2–5000).");
  let previous=-Infinity;
  for(const [index,candle] of data.candles.entries()) {
    const timestamp=Date.parse(candle.time);
    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(candle.time) || !Number.isFinite(timestamp) || new Date(timestamp).toISOString().replace(".000Z","Z")!==candle.time.replace(".000Z","Z") || timestamp<=previous)throw new Error(`Vela ${index+1}: fecha UTC ISO inválida, repetida o fuera de orden.`);
    if(previous!==-Infinity && (timestamp-previous)%(data.timeframeMinutes*60000)!==0)throw new Error(`Vela ${index+1}: intervalo incompatible con la temporalidad declarada.`);
    if([candle.open,candle.high,candle.low,candle.close].some(value=>typeof value!=="number"||!Number.isFinite(value)||value<=0||value>1e6) || candle.high<Math.max(candle.open,candle.close) || candle.low>Math.min(candle.open,candle.close) || candle.low>candle.high || (candle.volume!==undefined && (!Number.isFinite(candle.volume)||candle.volume<0)))throw new Error(`Vela ${index+1}: precios OHLC o volumen incoherentes.`);
    previous=timestamp;
  }
  return data;
}

export function parseCSV(text:string,metadata:Omit<MarketDataset,"candles"|"kind">):MarketDataset {
  if(new TextEncoder().encode(text).length>2*1024*1024)throw new Error("El CSV debe ocupar como máximo 2 MiB.");
  const lines=text.replace(/^\uFEFF/,"").trim().split(/\r?\n/);const header=lines.shift()?.trim();
  if(header!=="time,open,high,low,close" && header!=="time,open,high,low,close,volume")throw new Error("Cabecera requerida: time,open,high,low,close[,volume]. Usa coma de separación y punto decimal.");
  const expected=header.split(",").length;
  const candles=lines.map((line,index)=>{const fields=line.split(",").map(value=>value.trim());if(fields.length!==expected || fields.some(value=>value===""))throw new Error(`Fila ${index+2}: faltan columnas o valores.`);return {time:fields[0],open:Number(fields[1]),high:Number(fields[2]),low:Number(fields[3]),close:Number(fields[4]),...(expected===6 ? {volume:Number(fields[5])} : {})};});
  return validateDataset({...metadata,kind:"imported",candles});
}

/** Deterministic teaching fixture. Never described as historical evidence. */
export function demoDataset(pair="EUR/USD",timeframeMinutes=60):MarketDataset {
  const random=seededRandom(871);const isJPY=pair.endsWith("JPY");const initial=isJPY ? 145 : pair.startsWith("GBP") ? 1.27 : 1.08;const scale=isJPY ? .17 : .0017;
  let price=initial;const candles:Candle[]=[];
  for(let index=0;index<240;index++) {const open=price;const close=Math.max(initial*.5,open+(random()-.49)*scale+Math.sin(index/17)*scale*.1);const high=Math.max(open,close)+random()*scale*.5;const low=Math.min(open,close)-random()*scale*.5;price=close;candles.push({time:new Date(Date.UTC(2024,0,1)+index*timeframeMinutes*60000).toISOString(),open,high,low,close,volume:Math.floor(100+random()*900)});}
  return {name:`Escenario didáctico ${pair}`,pair,timeframeMinutes,source:"Serie sintética reproducible, semilla 871. Fechas de referencia ficticias; no son cotizaciones históricas.",kind:"simulated",candles};
}

export function toCSV(data:MarketDataset) {return "time,open,high,low,close\n"+data.candles.map(candle=>[candle.time,candle.open,candle.high,candle.low,candle.close].join(",")).join("\n");}
