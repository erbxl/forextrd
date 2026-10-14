import { z } from "zod";
import { validateDataset } from "../market-data/data";
import type { Candle, MarketDataset } from "../market-data/types";
import { accountMetrics, advanceSimulation, closePosition, createSimulation, defaultSettings, EXECUTION_ASSUMPTIONS, liquidateSimulation, submitOrder, validateSettings } from "../simulator/engine";
import type { ClosedTrade, EquityPoint, OrderRequest, SimulationState, TradeSide } from "../simulator/types";
import type { BacktestConfig, BacktestMetrics, BacktestResult, BacktestRun } from "./types";

const period = z.number().finite().int().min(2).max(2000);
const configSchema = z.object({
  strategy: z.enum(["sma-cross", "channel-breakout"]), fastPeriod: period, slowPeriod: period, channelPeriod: period,
  riskPercent: z.number().finite().min(.01).max(10), stopPips: z.number().finite().positive().max(100000),
  takeProfitR: z.number().finite().min(.1).max(20), startIndex: z.number().int().min(0), endIndex: z.number().int().min(1),
  trainPercent: z.number().finite().min(10).max(90), settings: z.unknown(),
}).strict();

export function defaultBacktestConfig(dataset: MarketDataset): BacktestConfig {
  return { strategy: "sma-cross", fastPeriod: 8, slowPeriod: 21, channelPeriod: 20, riskPercent: 1, stopPips: 25, takeProfitR: 2, startIndex: 0, endIndex: dataset.candles.length - 1, trainPercent: 70, settings: defaultSettings(dataset.pair) };
}

export function validateBacktestConfig(value: unknown, dataset: MarketDataset): BacktestConfig {
  const config = configSchema.parse(value);
  const settings = validateSettings(config.settings);
  if (settings.pair.replaceAll("/", "") !== dataset.pair.replaceAll("/", "")) throw new Error("El par de la cuenta debe coincidir con el conjunto de velas.");
  if (config.strategy === "sma-cross" && config.fastPeriod >= config.slowPeriod) throw new Error("La media rápida debe ser menor que la lenta.");
  if (config.endIndex >= dataset.candles.length || config.endIndex - config.startIndex < 3) throw new Error("Selecciona un intervalo de al menos cuatro velas dentro del conjunto de datos.");
  const length = config.endIndex - config.startIndex + 1;
  const trainLength = Math.floor(length * config.trainPercent / 100);
  if (trainLength < 2 || length - trainLength < 2) throw new Error("Entrenamiento y prueba necesitan al menos dos velas cada uno.");
  return { ...config, settings };
}

function meanClose(candles: Candle[], index: number, count: number): number {
  let total = 0;
  for (let i = index - count + 1; i <= index; i++) total += candles[i].close;
  return total / count;
}

/** Only accesses candles at or before index. Signals are formed after that candle closes. */
export function strategySignal(candles: Candle[], index: number, config: Pick<BacktestConfig, "strategy" | "fastPeriod" | "slowPeriod" | "channelPeriod">): TradeSide | null {
  if (!Number.isInteger(index) || index < 0 || index >= candles.length) throw new Error("Índice de señal no válido.");
  if (config.strategy === "sma-cross") {
    if (index < config.slowPeriod) return null;
    const before = meanClose(candles, index - 1, config.fastPeriod) - meanClose(candles, index - 1, config.slowPeriod);
    const now = meanClose(candles, index, config.fastPeriod) - meanClose(candles, index, config.slowPeriod);
    if (before <= 0 && now > 0) return "buy";
    if (before >= 0 && now < 0) return "sell";
    return null;
  }
  if (index < config.channelPeriod) return null;
  let high = -Infinity, low = Infinity;
  for (let i = index - config.channelPeriod; i < index; i++) { high = Math.max(high, candles[i].high); low = Math.min(low, candles[i].low); }
  if (candles[index].close > high) return "buy";
  if (candles[index].close < low) return "sell";
  return null;
}

function orderForRisk(state: SimulationState, side: TradeSide, candle: Candle, config: BacktestConfig, timeframeMinutes: number): OrderRequest | null {
  const s = state.settings;
  const direction = side === "buy" ? 1 : -1;
  const distance = config.stopPips * s.pipSize;
  const stopLoss = candle.close - direction * distance;
  const takeProfit = candle.close + direction * distance * config.takeProfitR;
  if (Math.min(stopLoss, takeProfit) <= 0) return null;
  const equity = accountMetrics(state, candle).equity;
  if (equity <= 0) return null;
  // Stop levels reference the signal mid close. Expected entry has half-spread and slippage;
  // the stop exit adds another slippage. Gaps and prolonged funding can exceed this budget.
  const funding = Math.max(0, side === "buy" ? s.financingLongPerLotDay : s.financingShortPerLotDay) * timeframeMinutes / 1440;
  const riskPerLot = (distance + (s.spreadPips / 2 + 2 * s.slippagePips) * s.pipSize) * s.contractSize * s.quoteToAccount + 2 * s.commissionPerLotSide + funding;
  const rawLots = equity * config.riskPercent / 100 / riskPerLot;
  const lots = Math.floor((Math.min(rawLots, s.maxLots) + 1e-12) / s.lotStep) * s.lotStep;
  if (lots < s.minLot - 1e-12) return null;
  return { type: "market", side, lots: Number(lots.toFixed(10)), stopLoss, takeProfit };
}

export function calculateBacktestMetrics(trades: ClosedTrade[], equityCurve: EquityPoint[], initialBalance: number, maxDrawdownPercent: number): BacktestMetrics {
  const wins = trades.filter(trade => trade.netPnl > 0);
  const losses = trades.filter(trade => trade.netPnl < 0);
  const grossProfit = wins.reduce((sum, t) => sum + t.netPnl, 0);
  const grossLoss = -losses.reduce((sum, t) => sum + t.netPnl, 0);
  const netPnl = trades.reduce((sum, t) => sum + t.netPnl, 0);
  const returns: number[] = [];
  let sharpe: number | null = null;
  let valid = true;
  for (let i = 1; i < equityCurve.length; i++) {
    if (equityCurve[i - 1].equity <= 0 || equityCurve[i].equity <= 0) { valid = false; break; }
    returns.push(equityCurve[i].equity / equityCurve[i - 1].equity - 1);
  }
  if (valid && returns.length >= 2) {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1);
    const elapsed = Date.parse(equityCurve.at(-1)!.time) - Date.parse(equityCurve[0].time);
    const periodsPerYear = 365 * 86400000 / (elapsed / returns.length);
    if (variance > 1e-24 && periodsPerYear > 0) sharpe = mean / Math.sqrt(variance) * Math.sqrt(periodsPerYear);
  }
  return {
    totalTrades: trades.length, wins: wins.length, losses: losses.length,
    winRatePercent: trades.length ? wins.length / trades.length * 100 : 0,
    netPnl, expectancy: trades.length ? netPnl / trades.length : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : null, grossProfit, grossLoss,
    maxDrawdownPercent, totalReturnPercent: netPnl / initialBalance * 100, finalBalance: initialBalance + netPnl,
    sharpe, commission: trades.reduce((sum, t) => sum + t.entryCommission + t.exitCommission, 0),
    financing: trades.reduce((sum, t) => sum + t.financing, 0),
  };
}

function runRange(dataset: MarketDataset, config: BacktestConfig, startIndex: number, endIndex: number): BacktestRun {
  let state = createSimulation(config.settings, startIndex);
  state.lastCandle = { ...dataset.candles[startIndex] };
  state.equityCurve = [{ time: state.lastCandle.time, index: startIndex, balance: state.balance, equity: state.balance, drawdownPercent: 0 }];
  let rejectedOrders = 0;
  for (let index = startIndex; index <= endIndex; index++) {
    const candle = dataset.candles[index];
    if (index > startIndex) {
      const nextId = state.nextId;
      state = advanceSimulation(state, candle);
      rejectedOrders += state.events.filter(e => Number(e.id.split("-")[1]) >= nextId && e.type === "rejected").length;
    }
    if (index === endIndex) break;
    const side = strategySignal(dataset.candles, index, config);
    if (!side || state.orders.length || state.positions.some(p => p.side === side)) continue;
    const order = orderForRisk(state, side, candle, config, dataset.timeframeMinutes);
    if (!order) continue;
    for (const p of [...state.positions]) state = closePosition(state, p.id, candle);
    state = submitOrder(state, order, candle);
  }
  state = liquidateSimulation(state, dataset.candles[endIndex]);
  return { startIndex, endIndex, trades: state.trades, equityCurve: state.equityCurve, metrics: calculateBacktestMetrics(state.trades, state.equityCurve, config.settings.initialBalance, state.maxDrawdownPercent), rejectedOrders };
}

export function runBacktest(data: MarketDataset, value: BacktestConfig): BacktestResult {
  const dataset = validateDataset(data);
  const config = validateBacktestConfig(value, dataset);
  const length = config.endIndex - config.startIndex + 1;
  const splitIndex = config.startIndex + Math.floor(length * config.trainPercent / 100);
  const total = runRange(dataset, config, config.startIndex, config.endIndex);
  const train = runRange(dataset, config, config.startIndex, splitIndex - 1);
  const test = runRange(dataset, config, splitIndex, config.endIndex);
  return {
    ...total, version: 1, datasetName: dataset.name, config, splitIndex, train, test,
    assumptions: [
      ...EXECUTION_ASSUMPTIONS,
      "Cruce SMA: señal al cruzar las medias de cierres. Canal: cierre fuera del máximo/mínimo de las N velas anteriores, excluyendo la actual. Ejecución en la apertura siguiente.",
      "Una posición a la vez. Una señal contraria solicita cierre y nueva entrada para la apertura siguiente. Los parámetros permanecen fijos: no existe optimización automática.",
      "El riesgo dimensiona hacia abajo por paso de lote e incluye medio spread, deslizamiento de entrada/salida, ambas comisiones y una vela de financiación. Gaps y financiación adicional pueden superar el presupuesto.",
      "El SL y el TP se fijan respecto al cierre medio de la vela de señal. El múltiplo R describe distancia bruta y no garantiza ese resultado neto.",
      "Total, entrenamiento y prueba son tres cuentas independientes con el mismo capital inicial. La prueba usa solamente datos anteriores para calentar indicadores y no hereda posiciones ni saldo del entrenamiento.",
      "Al acabar cada intervalo se cancela lo pendiente y se liquida al último cierre con spread, deslizamiento y comisión. La liquidación de frontera no constituye una señal de estrategia.",
      "Expectativa en moneda de cuenta; profit factor sobre resultados netos; Sharpe de retornos simples entre cierres, desviación muestral, tasa libre de riesgo cero y anualización de 365 días por espaciado observado. No es comparable sin igualar estas convenciones.",
      "Drawdown incluye extremos del recorrido OHLC supuesto. No equivale a un drawdown calculado exclusivamente con cierres de la curva exportada.",
    ],
  };
}
