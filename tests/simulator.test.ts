import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { accountMetrics, advanceSimulation, cancelOrder, closePosition, createSimulation, defaultSettings, liquidateSimulation, submitOrder, validateSimulationState } from "../src/modules/simulator/engine";
import type { Candle } from "../src/modules/market-data/types";
import { defaultBacktestConfig, runBacktest, strategySignal } from "../src/modules/backtesting/engine";
import { demoDataset } from "../src/modules/market-data/data";
import { validateTradingSession } from "../src/modules/trading-sessions/service";
import { AcademyDatabase } from "../src/modules/storage/db";
import { exportBackup, parseBackup, restoreBackup } from "../src/modules/storage/backup";
import type { JsonValue } from "../src/modules/storage/types";

const bar = (day: number, open = 1.1, high = open, low = open, close = open): Candle => ({ time: new Date(Date.UTC(2024, 0, day)).toISOString(), open, high, low, close });
const settings = { ...defaultSettings(), spreadPips: 2, slippagePips: 1, commissionPerLotSide: 3 };

describe("ejecución de práctica con precios y costes verificables", () => {
  it.each(["buy", "sell"] as const)("%s espera a la apertura siguiente y contabiliza ambos lados", side => {
    const original = createSimulation(settings);
    let state = submitOrder(original, { side, type: "market", lots: .1 }, bar(1));
    expect(original.orders).toHaveLength(0);
    expect(state.positions).toHaveLength(0);
    state = advanceSimulation(state, bar(2));
    expect(state.positions[0].entryPrice).toBeCloseTo(side === "buy" ? 1.1002 : 1.0998, 8);
    expect(state.balance).toBeCloseTo(9999.7, 8);
    expect(accountMetrics(state, bar(2)).unrealizedPnl).toBeCloseTo(-3, 8);
    const position = state.positions[0];
    state = closePosition(state, position.id, bar(2));
    expect(state.positions).toHaveLength(1);
    state = advanceSimulation(state, bar(3, 1.101));
    const trade = state.trades[0];
    expect(trade.grossPnl).toBeCloseTo(side === "buy" ? 6 : -14, 8);
    expect(trade.netPnl).toBeCloseTo(side === "buy" ? 5.4 : -14.6, 8);
    expect(state.balance).toBeCloseTo(10000 + trade.netPnl, 8);
    expect(validateSimulationState(state)).toEqual(state);
  });
  it("respeta el límite ante un gap favorable y permite cancelar pendientes", () => {
    let state = submitOrder(createSimulation(settings), { side: "buy", type: "limit", lots: .1, price: 1.099 }, bar(1));
    expect(cancelOrder(state, state.orders[0].id).orders).toHaveLength(0);
    state = advanceSimulation(state, bar(2, 1.098));
    expect(state.positions[0].entryPrice).toBeCloseTo(1.0982, 8);
    expect(state.positions[0].entryPrice).toBeLessThanOrEqual(1.099);
  });
  it("un stop de entrada se ejecuta peor que el umbral ante un gap", () => {
    let state = submitOrder(createSimulation(settings), { side: "buy", type: "stop", lots: .1, price: 1.101 }, bar(1));
    state = advanceSimulation(state, bar(2, 1.103));
    expect(state.positions[0].entryPrice).toBeCloseTo(1.1032, 8);
  });
  it("marca la ambigüedad SL/TP y usa el stop", () => {
    let state = submitOrder(createSimulation(settings), { side: "buy", type: "market", lots: .1, stopLoss: 1.099, takeProfit: 1.102 }, bar(1));
    state = advanceSimulation(state, bar(2, 1.1, 1.103, 1.098, 1.101));
    expect(state.trades[0]).toMatchObject({ reason: "stop-loss", ambiguous: true });
    expect(state.trades[0].exitPrice).toBeCloseTo(1.0989, 8);
  });
  it("un gap traspasa el stop sin prometer su precio", () => {
    let state = submitOrder(createSimulation(settings), { side: "buy", type: "market", lots: .1, stopLoss: 1.099 }, bar(1));
    state = advanceSimulation(state, bar(2));
    state = advanceSimulation(state, bar(3, 1.095));
    expect(state.trades[0].exitPrice).toBeCloseTo(1.0948, 8);
    expect(state.trades[0].netPnl).toBeCloseTo(-54.6, 8);
  });
  it("rechaza margen insuficiente al ejecutar, sin crear una posición", () => {
    let state = submitOrder(createSimulation({ ...settings, initialBalance: 100 }), { side: "buy", type: "market", lots: 1 }, bar(1));
    state = advanceSimulation(state, bar(2));
    expect(state.positions).toHaveLength(0);
    expect(state.events.some(event => event.type === "rejected")).toBe(true);
    expect(state.balance).toBe(100);
  });
  it("liquida por margen dentro de la vela antes del extremo adverso", () => {
    const config = { ...settings, initialBalance: 1000, leverage: 100, spreadPips: 0, slippagePips: 0, commissionPerLotSide: 0 };
    let state = submitOrder(createSimulation(config), { side: "buy", type: "market", lots: .5 }, bar(1));
    state = advanceSimulation(state, bar(2, 1.1, 1.1, 1.08, 1.09));
    expect(state.trades[0].reason).toBe("stop-out");
    expect(state.trades[0].exitPrice).toBeCloseTo(1.0855, 8);
    expect(state.balance).toBeCloseTo(275, 6);
  });
  it("prorratea financiación y conserva abonos sin descontar costes dos veces", () => {
    let state = submitOrder(createSimulation({ ...settings, financingLongPerLotDay: -20 }), { side: "buy", type: "market", lots: .1 }, bar(1));
    state = advanceSimulation(state, bar(2));
    state = advanceSimulation(state, bar(4));
    expect(state.positions[0].financing).toBe(-4);
    state = liquidateSimulation(state, bar(4));
    expect(state.trades[0].netPnl).toBeCloseTo(-.6, 8);
    expect(validateSimulationState(state)).toEqual(state);
  });
  it("rechaza velas atrasadas, tamaños inválidos y saldos manipulados", () => {
    let state = submitOrder(createSimulation(settings), { side: "buy", type: "market", lots: .1 }, bar(1));
    expect(() => submitOrder(state, { side: "buy", type: "market", lots: .015 }, bar(1))).toThrow(/lotaje/);
    expect(() => advanceSimulation(state, bar(1))).toThrow(/posterior/);
    state = advanceSimulation(state, bar(2));
    expect(() => validateSimulationState({ ...state, balance: state.balance + 1 })).toThrow(/saldo/);
  });
});

describe("backtesting causal y sesiones recuperables", () => {
  it.each(["sma-cross", "channel-breakout"] as const)("%s no usa velas futuras para su señal", strategy => {
    const data = demoDataset(); const config = { ...defaultBacktestConfig(data), strategy };
    for (let index = 25; index < 70; index++) {
      expect(strategySignal(data.candles, index, config)).toBe(strategySignal(data.candles.slice(0, index + 1), index, config));
    }
  });
  it("reproduce resultados y reconcilia neto, costes y separación temporal", () => {
    const data = demoDataset(); const config = defaultBacktestConfig(data);
    const result = runBacktest(data, config);
    expect(runBacktest(data, config)).toEqual(result);
    expect(result.trades.length).toBeGreaterThan(0);
    for (const run of [result, result.train, result.test]) {
      expect(run.metrics.finalBalance).toBeCloseTo(config.settings.initialBalance + run.trades.reduce((sum, t) => sum + t.netPnl, 0), 7);
      expect(run.trades.every(t => t.entryIndex > run.startIndex && t.exitIndex <= run.endIndex)).toBe(true);
      expect(run.equityCurve.at(-1)!.equity).toBeCloseTo(run.metrics.finalBalance, 7);
    }
    expect(result.train.endIndex).toBeLessThan(result.test.startIndex);
    const changed = structuredClone(data);
    changed.candles = changed.candles.map((c, i) => i < result.splitIndex ? c : { ...c, open: c.open * 1.2, high: c.high * 1.2, low: c.low * 1.2, close: c.close * 1.2 });
    expect(runBacktest(changed, config).train).toEqual(result.train);
  });
  it("guarda el cursor real y rechaza registros de velas no reveladas", () => {
    const data = demoDataset(); let state = createSimulation(defaultSettings());
    state = submitOrder(state, { side: "buy", type: "market", lots: .1 }, data.candles[0]);
    state = advanceSimulation(state, data.candles[1]);
    const session = { schema: 1, kind: "replay-session", name: "Ensayo", data, state, levels: [] };
    expect(validateTradingSession(JSON.parse(JSON.stringify(session)), "replay").state).toEqual(state);
    state.positions[0].entryTime = data.candles[2].time;
    expect(() => validateTradingSession(session, "replay")).toThrow();
  });
  it("restaura una sesión con posición abierta y un backtest completos en otra base", async () => {
    const source = new AcademyDatabase(`trading-source-${crypto.randomUUID()}`);
    const target = new AcademyDatabase(`trading-target-${crypto.randomUUID()}`);
    try {
      const data = demoDataset();
      let state = submitOrder(createSimulation(defaultSettings()), { side: "buy", type: "market", lots: .1 }, data.candles[0]);
      state = advanceSimulation(state, data.candles[1]);
      const session = { schema: 1, kind: "replay-session", name: "Copia de práctica", data, state, levels: [{ id: "support", label: "Soporte", price: 1.07 }] };
      const result = runBacktest(data, defaultBacktestConfig(data));
      const now = new Date().toISOString();
      const metadata = (value: unknown) => JSON.parse(JSON.stringify(value)) as Record<string, JsonValue>;
      await source.replaySessions.put({ id: "replay", createdAt: now, updatedAt: now, metadata: metadata(session) });
      await source.backtestResults.put({ id: "experiment", createdAt: now, updatedAt: now, metadata: metadata({ schema: 1, kind: "backtest-experiment", name: "Experimento", data, config: result.config, result }) });
      await restoreBackup(parseBackup(JSON.stringify(await exportBackup(source))), target);
      const recovered = validateTradingSession((await target.replaySessions.get("replay"))!.metadata, "replay");
      expect(recovered.state).toEqual(state);
      expect(advanceSimulation(recovered.state, data.candles[2])).toEqual(advanceSimulation(state, data.candles[2]));
      expect((await target.backtestResults.get("experiment"))!.metadata.result).toEqual(JSON.parse(JSON.stringify(result)));
    } finally { await source.delete(); await target.delete(); }
  });
});
