export type Candle = { time:string; open:number; high:number; low:number; close:number; volume?:number };
export type MarketDataset = { name:string; pair:string; timeframeMinutes:number; source:string; kind:"simulated"|"imported"; candles:Candle[] };
