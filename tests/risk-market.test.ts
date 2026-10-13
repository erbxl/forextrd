import { describe,expect,it } from "vitest";
import { breakEven, drawdown, expectancy, margin, monteCarlo, pipDistance, pipValue, positionSize, recovery, rewardRisk, tradingCosts } from "../src/modules/risk/calculations";
import { demoDataset, parseCSV, toCSV, validateDataset } from "../src/modules/market-data/data";

describe("cálculos financieros con unidades de referencia",()=>{
  it("mide pips, valor de pip y conversión de JPY a cuenta",()=>{expect(pipDistance(1.08,1.085,.0001)).toBeCloseTo(50,8);expect(pipDistance(145,144.5,.01)).toBe(-50);expect(pipValue(100000,.01,1/150)).toBeCloseTo(6.66666667);});
  it("dimensiona hacia abajo incluyendo costes",()=>{const size=positionSize(10000,1,25,10,7,.01);expect(size.rawLots).toBeCloseTo(100/257);expect(size.lots).toBeCloseTo(.38);expect(size.riskUsed).toBeCloseTo(97.66);expect(positionSize(10,.1,50,10,7,.01).lots).toBe(0);});
  it("distingue margen, beneficio/riesgo y dirección",()=>{expect(margin(30000,30)).toBe(1000);expect(rewardRisk(1.08,1.0775,1.085,"buy").ratio).toBeCloseTo(2);expect(rewardRisk(1.08,1.0825,1.075,"sell").ratio).toBeCloseTo(2);expect(()=>rewardRisk(1.08,1.0825,1.085,"buy")).toThrow();});
  it("calcula drawdown y recuperación asimétricos",()=>{expect(drawdown(10000,8000)).toBe(20);expect(recovery(20)).toBe(25);expect(recovery(50)).toBe(100);expect(recovery(100)).toBeNull();expect(()=>drawdown(0,0)).toThrow();expect(()=>drawdown(100,110)).toThrow();});
  it("calcula esperanza, equilibrio y costes ida y vuelta",()=>{expect(expectancy(40,2,1,.1)).toBeCloseTo(.1);expect(breakEven(2,1,.1)).toBeCloseTo(36.66666667);expect(tradingCosts(1,.2,1,.35,.2,2)).toBeCloseTo(2.5);expect(tradingCosts(1,0,1,0,-.2,2)).toBeCloseTo(.6);});
  it("rechaza división por cero y valores no finitos",()=>{expect(()=>pipDistance(1,2,0)).toThrow();expect(()=>margin(Infinity,30)).toThrow();expect(()=>positionSize(10000,101,25,10)).toThrow();expect(()=>pipValue(100,.0001,0)).toThrow();expect(()=>tradingCosts(1,0,1,0,0,.5)).toThrow();});
  it("Monte Carlo es reproducible, conserva la muestra y nunca crea capital negativo",()=>{const sample=[-1,2,-1,1.5];const a=monteCarlo(sample,10000,1,100,100,42);expect(monteCarlo(sample,10000,1,100,100,42)).toEqual(a);expect(a.p05).toBeLessThanOrEqual(a.median);expect(a.median).toBeLessThanOrEqual(a.p95);expect(sample).toEqual([-1,2,-1,1.5]);const ruin=monteCarlo([-1,-1],100,100,10,5,1);expect(ruin.median).toBe(0);expect(ruin.depletedPercent).toBe(100);expect(ruin.drawdown95).toBe(100);});
  it("no acepta simulaciones con parámetros ilimitados o vacíos",()=>{expect(()=>monteCarlo([],100,1)).toThrow();expect(()=>monteCarlo([1,2],100,1,100000)).toThrow();expect(()=>monteCarlo([1,NaN],100,1)).toThrow();});
});

describe("datos de mercado explícitos y verificables",()=>{
  const metadata={name:"fixture.csv",pair:"EUR/USD",timeframeMinutes:60,source:"Fixture simulado para pruebas"};
  const valid="time,open,high,low,close\n2024-01-01T00:00:00Z,1.1,1.2,1.0,1.15\n2024-01-01T01:00:00Z,1.15,1.18,1.1,1.12";
  it("importa un CSV estricto y etiqueta la fuente declarada",()=>{const data=parseCSV(valid,metadata);expect(data.kind).toBe("imported");expect(data.source).toBe(metadata.source);expect(data.candles[0]).toMatchObject({open:1.1,high:1.2,low:1,close:1.15});expect(parseCSV(toCSV(data),metadata).candles).toEqual(data.candles);});
  it.each([valid.replace("1.2","1.01"),valid.replace("01:00:00Z","00:00:00Z"),valid.replace("01:00:00Z","01:05:00Z"),valid.replace("1.15","NaN"),valid.replace("2024-01-01T00:00:00Z","2024-02-30T00:00:00Z"),valid.replace("1.1,1.2",",1.2")])("rechaza datos incoherentes sin rellenar huecos",csv=>{expect(()=>parseCSV(csv,metadata)).toThrow();});
  it("requiere UTC y cabecera explícita",()=>{expect(()=>parseCSV(valid.replaceAll("Z",""),metadata)).toThrow();expect(()=>parseCSV(valid.replace("time,","timestamp,"),metadata)).toThrow();expect(()=>parseCSV(valid,{...metadata,source:""})).toThrow();});
  it("genera escenarios simulados reproducibles para cada par y escala",()=>{for(const pair of ["EUR/USD","GBP/USD","USD/JPY"])for(const minutes of [1,60,1440]){const data=demoDataset(pair,minutes);expect(data).toEqual(demoDataset(pair,minutes));expect(data.kind).toBe("simulated");expect(validateDataset(data)).toBe(data);}});
});
