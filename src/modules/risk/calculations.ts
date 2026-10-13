/** Educational FX arithmetic. All exchange rates are supplied, never live quotes. */
export function finite(value:number,label:string,min=0,max=1e12) { if(!Number.isFinite(value) || value<min || value>max) throw new Error(`${label}: introduce un número entre ${min} y ${max}.`); return value; }
export function positive(value:number,label:string) { finite(value,label); if(value===0) throw new Error(`${label} debe ser mayor que cero.`); return value; }
export function pipDistance(entry:number,exit:number,pipSize:number) { return (positive(exit,"Precio final")-positive(entry,"Precio inicial"))/positive(pipSize,"Tamaño del pip"); }
export function pipValue(units:number,pipSize:number,quoteToAccount:number) { return finite(units,"Unidades")*positive(pipSize,"Tamaño del pip")*positive(quoteToAccount,"Conversión a cuenta"); }
export function positionSize(capital:number,riskPercent:number,stopPips:number,pipPerLot:number,costPerLot=0,lotStep=.01) {
  const riskCash=positive(capital,"Capital")*finite(riskPercent,"Riesgo (%)",0,100)/100;
  const lossPerLot=positive(stopPips,"Distancia al stop")*positive(pipPerLot,"Valor del pip por lote")+finite(costPerLot,"Costes por lote");
  positive(lotStep,"Paso de lote");
  const rawLots=riskCash/lossPerLot;
  const lots=Math.floor((rawLots+Number.EPSILON)*1/lotStep)*lotStep;
  return {riskCash,rawLots,lots,riskUsed:lots*lossPerLot};
}
export function margin(notional:number,leverage:number) {return finite(notional,"Nominal en divisa de cuenta")/positive(leverage,"Apalancamiento");}
export function rewardRisk(entry:number,stop:number,target:number,direction:"buy"|"sell") {
  [entry,stop,target].forEach(value=>positive(value,"Precio"));
  const sign=direction==="buy" ? 1 : -1;const risk=(entry-stop)*sign;const reward=(target-entry)*sign;
  if(risk<=0 || reward<=0) throw new Error("El stop y el objetivo deben estar a lados opuestos de la entrada, según la dirección.");
  return {risk,reward,ratio:reward/risk};
}
export function drawdown(peak:number,equity:number) {positive(peak,"Máximo");finite(equity,"Equity",-1e12,peak);return (peak-equity)/peak*100;}
export function recovery(lossPercent:number) {finite(lossPercent,"Pérdida (%)",0,100);return lossPercent===100 ? null : lossPercent/(100-lossPercent)*100;}
export function expectancy(winRate:number,win:number,loss:number,cost:number) {return finite(winRate,"Acierto (%)",0,100)/100*finite(win,"Ganancia media")-(1-winRate/100)*finite(loss,"Pérdida media")-finite(cost,"Coste medio");}
export function breakEven(win:number,loss:number,cost:number) {positive(win,"Ganancia");positive(loss,"Pérdida");finite(cost,"Coste");return (loss+cost)/(win+loss)*100;}
export function tradingCosts(spread:number,slippagePerSide:number,pipCash:number,commissionPerSide:number,overnight:number,nights:number) {
  [spread,slippagePerSide,pipCash,commissionPerSide,nights].forEach(value=>finite(value,"Coste o cantidad"));finite(overnight,"Financiación por noche",-1e6,1e6);
  if(!Number.isInteger(nights))throw new Error("Las noches deben ser enteras.");
  return (spread+2*slippagePerSide)*pipCash+2*commissionPerSide+overnight*nights;
}

export function seededRandom(seed:number) {let state=seed>>>0;return ()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};}
export function monteCarlo(returnsR:number[],capital:number,riskPercent:number,trades=100,simulations=300,seed=42) {
  positive(capital,"Capital");finite(riskPercent,"Riesgo (%)",.01,100);
  if(returnsR.length<2 || returnsR.length>1000 || returnsR.some(value=>!Number.isFinite(value)||Math.abs(value)>100))throw new Error("Introduce entre 2 y 1000 resultados netos en R, entre -100 y 100.");
  if(!Number.isInteger(trades)||trades<1||trades>1000||!Number.isInteger(simulations)||simulations<1||simulations>2000||!Number.isInteger(seed))throw new Error("Número de operaciones, simulaciones o semilla no válido.");
  const random=seededRandom(seed);const finals:number[]=[];const drawdowns:number[]=[];const paths:number[][]=[];let depleted=0;
  for(let simulation=0;simulation<simulations;simulation++) {
    let equity=capital,peak=capital,maxDD=0;const path=[capital];
    for(let trade=0;trade<trades;trade++) {const result=returnsR[Math.floor(random()*returnsR.length)];equity=Math.max(0,equity*(1+riskPercent/100*result));peak=Math.max(peak,equity);maxDD=Math.max(maxDD,(peak-equity)/peak*100);if(simulation<8)path.push(equity);}
    if(!Number.isFinite(equity))throw new Error("La simulación excede el rango numérico. Reduce riesgo, operaciones o magnitud de los resultados.");
    if(equity===0)depleted++;finals.push(equity);drawdowns.push(maxDD);if(simulation<8)paths.push(path);
  }
  finals.sort((a,b)=>a-b);drawdowns.sort((a,b)=>a-b);
  const q=(values:number[],fraction:number)=>values[Math.floor((values.length-1)*fraction)];
  return {p05:q(finals,.05),median:q(finals,.5),p95:q(finals,.95),drawdown95:q(drawdowns,.95),depletedPercent:depleted/simulations*100,paths};
}
