import { z } from "zod";
import type { Candle } from "../market-data/types";
import type { AccountMetrics, ClosedTrade, ExitReason, OrderRequest, PendingOrder, Position, SimulationEvent, SimulationSettings, SimulationState, TradeSide } from "./types";

const number = z.number().finite();
const price = number.positive().max(1e8);
const cash = number.min(-1e15).max(1e15);
const time = z.string().datetime({ offset: true }).refine(value => Number.isFinite(Date.parse(value)), "Fecha no válida");
const candleSchema = z.object({ time, open: price, high: price, low: price, close: price, volume: number.nonnegative().optional() }).strict().refine(value => value.low <= Math.min(value.open, value.close) && value.high >= Math.max(value.open, value.close) && value.high >= value.low, "OHLC incoherente");
const settingsSchema = z.object({
  pair: z.string().min(3).max(20), accountCurrency: z.string().regex(/^[A-Z]{3}$/),
  initialBalance: number.positive().max(1e9), leverage: number.min(1).max(500),
  contractSize: number.positive().max(1e7), quoteToAccount: number.positive().max(1e6),
  pipSize: number.positive().max(100), spreadPips: number.min(0).max(1000),
  slippagePips: number.min(0).max(1000), commissionPerLotSide: number.min(0).max(1e5),
  financingLongPerLotDay: number.min(-1e5).max(1e5), financingShortPerLotDay: number.min(-1e5).max(1e5),
  marginCallPercent: number.positive().max(1000), stopOutPercent: number.positive().max(1000),
  minLot: number.positive().max(1000), lotStep: number.positive().max(1000),
  maxLots: number.positive().max(10000), maxPositions: number.int().min(1).max(100),
}).strict().refine(value => value.stopOutPercent < value.marginCallPercent, "El stop-out debe ser menor que el margin call").refine(value => value.minLot <= value.maxLots && value.lotStep <= value.minLot, "Límites de lotaje incoherentes");
const requestSchema = z.object({ side: z.enum(["buy", "sell"]), type: z.enum(["market", "limit", "stop"]), lots: number.positive().max(10000), price: price.optional(), stopLoss: price.optional(), takeProfit: price.optional() }).strict();
const pendingSchema = requestSchema.extend({ id: z.string().min(1).max(80), action: z.enum(["open", "close"]), positionId: z.string().optional(), submittedTime: time, submittedIndex: number.int().min(0) }).strict();
const positionShape = {
  id: z.string().min(1).max(80), orderId: z.string().min(1).max(80), side: z.enum(["buy", "sell"]), lots: number.positive().max(10000),
  entryPrice: price, entryTime: time, entryIndex: number.int().min(0), stopLoss: price.optional(), takeProfit: price.optional(),
  margin: number.positive().max(1e15), entryCommission: number.nonnegative().max(1e15), financing: cash,
};
const positionSchema = z.object(positionShape).strict();
const tradeSchema = z.object({ ...positionShape, exitPrice: price, exitTime: time, exitIndex: number.int().min(0), reason: z.enum(["stop-loss", "take-profit", "manual", "stop-out", "end-of-data"]), grossPnl: cash, exitCommission: number.nonnegative().max(1e15), netPnl: cash, ambiguous: z.boolean() }).strict();
const stateSchema = z.object({
  version: z.literal(1), settings: settingsSchema, index: number.int().min(0).max(1000000), lastCandle: candleSchema.nullable(),
  balance: cash, peakEquity: number.positive().max(1e15), maxDrawdownPercent: number.nonnegative().max(1e10), nextId: number.int().positive(),
  positions: z.array(positionSchema).max(100), orders: z.array(pendingSchema).max(200), trades: z.array(tradeSchema).max(100000),
  equityCurve: z.array(z.object({ time, index: number.int().nonnegative(), balance: cash, equity: cash, drawdownPercent: number.nonnegative().max(1e10) }).strict()).max(100000),
  events: z.array(z.object({ id: z.string(), time, type: z.enum(["submitted", "filled", "cancelled", "rejected", "closed", "margin-call", "stop-out", "ambiguity"]), message: z.string().max(1000), orderId: z.string().optional(), positionId: z.string().optional() }).strict()).max(500),
}).strict();

export const EXECUTION_ASSUMPTIONS = [
  "Las velas OHLC son precios medios. Compras al ask y ventas al bid; spread y conversión a la moneda de cuenta constantes.",
  "Una orden enviada al cierre de una vela se activa en la vela siguiente. Los cierres manuales también esperan a su apertura.",
  "Los stops sufren gaps y deslizamiento adverso; los límites nunca se ejecutan a un precio peor que su límite.",
  "Si una vela alcanza SL y TP, se elige el SL y se marca la ambigüedad. Una entrada intravela con ambos niveles alcanzados también toma el SL. Si la apertura ya supera el TP de una posición existente, se ejecuta allí antes de recorrer la vela.",
  "Sin ticks se supone un recorrido apertura→extremo adverso a la exposición neta→otro extremo→cierre. No reconstruye el orden real de los precios.",
  "Margen fijo por posición según el nominal de entrada; stop-out liquida primero la posición con mayor pérdida. Un gap puede dejar saldo negativo.",
  "Financiación prorrateada por tiempo UTC transcurrido, por lote y cada 24 horas; no incluye el calendario de swaps de un bróker.",
] as const;

export function defaultSettings(pair = "EUR/USD"): SimulationSettings {
  const jpy = pair.replaceAll("/", "").endsWith("JPY");
  return { pair, accountCurrency: "USD", initialBalance: 10000, leverage: 30, contractSize: 100000, quoteToAccount: jpy ? 1 / 150 : 1, pipSize: jpy ? .01 : .0001, spreadPips: 1, slippagePips: .2, commissionPerLotSide: 3.5, financingLongPerLotDay: 0, financingShortPerLotDay: 0, marginCallPercent: 100, stopOutPercent: 50, minLot: .01, lotStep: .01, maxLots: 100, maxPositions: 10 };
}

export function validateSettings(value: unknown): SimulationSettings { return settingsSchema.parse(value); }
export function createSimulation(settings: SimulationSettings, startIndex = 0): SimulationState {
  const checked = validateSettings(settings);
  if (!Number.isInteger(startIndex) || startIndex < 0 || startIndex > 1000000) throw new Error("Índice inicial no válido.");
  return { version: 1, settings: checked, index: startIndex, lastCandle: null, balance: checked.initialBalance, peakEquity: checked.initialBalance, maxDrawdownPercent: 0, nextId: 1, positions: [], orders: [], trades: [], equityCurve: [], events: [] };
}

const sign = (side: TradeSide) => side === "buy" ? 1 : -1;
const halfSpread = (s: SimulationSettings) => s.spreadPips * s.pipSize / 2;
const slippage = (s: SimulationSettings) => s.slippagePips * s.pipSize;
const quote = (s: SimulationSettings, mid: number, side: TradeSide) => mid + sign(side) * halfSpread(s);
const liquidationQuote = (s: SimulationSettings, mid: number, side: TradeSide) => mid - sign(side) * halfSpread(s);
const pnl = (s: SimulationSettings, p: Position, exit: number) => (exit - p.entryPrice) * sign(p.side) * p.lots * s.contractSize * s.quoteToAccount;
const sameNumber = (a: number, b: number) => Math.abs(a - b) <= 1e-7 * Math.max(1, Math.abs(a), Math.abs(b));

function checkCandle(candle: Candle, settings: SimulationSettings): Candle {
  const checked = candleSchema.parse(candle);
  if (checked.low <= halfSpread(settings) + slippage(settings)) throw new Error("El spread y el deslizamiento producirían un precio no positivo.");
  return checked;
}
function validLots(lots: number, settings: SimulationSettings): boolean {
  return lots >= settings.minLot - 1e-10 && lots <= settings.maxLots + 1e-10 && sameNumber(lots / settings.lotStep, Math.round(lots / settings.lotStep));
}
function validateRequest(request: OrderRequest, settings: SimulationSettings, candle?: Candle) {
  requestSchema.parse(request);
  if (!validLots(request.lots, settings)) throw new Error("El lotaje no respeta el mínimo, máximo o paso de la cuenta.");
  if (request.type !== "market" && request.price === undefined) throw new Error("Las órdenes límite y stop necesitan un precio.");
  if (request.type === "market" && request.price !== undefined) throw new Error("Una orden de mercado no acepta un precio límite.");
  if (!candle) return;
  const current = quote(settings, candle.close, request.side);
  const entry = request.type === "market" ? current : request.price!;
  if (request.type === "limit" && sign(request.side) * (entry - current) >= 0) throw new Error("Una compra límite debe estar debajo del ask; una venta límite, encima del bid.");
  if (request.type === "stop" && sign(request.side) * (entry - current) <= 0) throw new Error("Una compra stop debe estar encima del ask; una venta stop, debajo del bid.");
  if (request.stopLoss !== undefined && sign(request.side) * (entry - request.stopLoss) <= 0) throw new Error("El stop-loss debe quedar en el lado de pérdida de la entrada.");
  if (request.takeProfit !== undefined && sign(request.side) * (request.takeProfit - entry) <= 0) throw new Error("El take-profit debe quedar en el lado de beneficio de la entrada.");
}

export function validateSimulationState(input: unknown): SimulationState {
  const state = stateSchema.parse(input) as SimulationState;
  const s = state.settings;
  if (state.positions.length > s.maxPositions) throw new Error("La sesión excede el límite de posiciones.");
  if (state.lastCandle) checkCandle(state.lastCandle, s);
  const ids = [...state.positions.map(p => p.id), ...state.trades.map(p => p.id), ...state.orders.map(o => o.id), ...state.events.map(e => e.id)];
  if (new Set(ids).size !== ids.length || ids.some(id => !/^(position|order|event)-\d+$/.test(id) || Number(id.split("-")[1]) >= state.nextId)) throw new Error("Identificadores de sesión incoherentes.");
  for (const p of [...state.positions, ...state.trades]) {
    if (!validLots(p.lots, s) || p.entryIndex > state.index || (state.lastCandle && Date.parse(p.entryTime) > Date.parse(state.lastCandle.time))) throw new Error("Posición incoherente con la sesión.");
    if (!sameNumber(p.margin, p.entryPrice * p.lots * s.contractSize * s.quoteToAccount / s.leverage) || !sameNumber(p.entryCommission, p.lots * s.commissionPerLotSide)) throw new Error("Margen o comisión alterados.");
  }
  for (const order of state.orders) {
    const { id: _id, action, positionId, submittedTime, submittedIndex, ...request } = order;
    void _id;
    validateRequest(request, s);
    if (submittedIndex > state.index || (state.lastCandle && Date.parse(submittedTime) > Date.parse(state.lastCandle.time))) throw new Error("Orden enviada desde el futuro.");
    if (action === "close") {
      const p = state.positions.find(p => p.id === positionId);
      if (!p || request.type !== "market" || request.side === p.side || request.lots !== p.lots || request.stopLoss !== undefined || request.takeProfit !== undefined) throw new Error("Cierre pendiente incoherente.");
    } else if (positionId !== undefined) throw new Error("Una apertura no puede referenciar una posición.");
  }
  const closes = state.orders.filter(order => order.action === "close").map(order => order.positionId);
  if (new Set(closes).size !== closes.length) throw new Error("Cierres duplicados.");
  for (const trade of state.trades) {
    if (trade.exitIndex < trade.entryIndex || trade.exitIndex > state.index || Date.parse(trade.exitTime) < Date.parse(trade.entryTime) || (state.lastCandle && Date.parse(trade.exitTime) > Date.parse(state.lastCandle.time))) throw new Error("Fechas de operación incoherentes.");
    if (!sameNumber(trade.grossPnl, pnl(s, trade, trade.exitPrice)) || !sameNumber(trade.exitCommission, trade.lots * s.commissionPerLotSide) || !sameNumber(trade.netPnl, trade.grossPnl - trade.entryCommission - trade.exitCommission - trade.financing)) throw new Error("Resultado de operación alterado.");
  }
  const expectedBalance = s.initialBalance + state.trades.reduce((sum, p) => sum + p.netPnl, 0) - state.positions.reduce((sum, p) => sum + p.entryCommission + p.financing, 0);
  if (!sameNumber(state.balance, expectedBalance)) throw new Error("El saldo no coincide con las operaciones.");
  if (state.peakEquity < s.initialBalance) throw new Error("Máximo de equity incoherente.");
  for (let i = 0; i < state.equityCurve.length; i++) {
    const point = state.equityCurve[i];
    if (point.index > state.index || (state.lastCandle && Date.parse(point.time) > Date.parse(state.lastCandle.time)) || (i && (point.index <= state.equityCurve[i - 1].index || Date.parse(point.time) <= Date.parse(state.equityCurve[i - 1].time)))) throw new Error("Curva de equity fuera de orden.");
    if (point.equity > state.peakEquity + 1e-6 || point.drawdownPercent > state.maxDrawdownPercent + 1e-6) throw new Error("Drawdown incoherente.");
  }
  if (!state.lastCandle && (state.positions.length || state.orders.length || state.trades.length || state.equityCurve.length || state.events.length)) throw new Error("La sesión no tiene una vela de referencia.");
  return state;
}

function metricsAt(state: SimulationState, mid: number): AccountMetrics {
  const unrealizedPnl = state.positions.reduce((sum, p) => sum + pnl(state.settings, p, liquidationQuote(state.settings, mid, p.side)), 0);
  const usedMargin = state.positions.reduce((sum, p) => sum + p.margin, 0);
  const equity = state.balance + unrealizedPnl;
  const marginLevelPercent = usedMargin > 0 ? equity / usedMargin * 100 : null;
  return { balance: state.balance, equity, unrealizedPnl, usedMargin, freeMargin: equity - usedMargin, marginLevelPercent, marginCall: marginLevelPercent !== null && marginLevelPercent <= state.settings.marginCallPercent, drawdownPercent: Math.max(0, (state.peakEquity - equity) / state.peakEquity * 100), totalReturnPercent: (equity / state.settings.initialBalance - 1) * 100 };
}
export function accountMetrics(state: SimulationState, candle: Candle): AccountMetrics { checkCandle(candle, state.settings); return metricsAt(state, candle.close); }
function mark(state: SimulationState, mid: number) {
  const m = metricsAt(state, mid);
  if (!Number.isFinite(m.equity) || Math.abs(m.equity) > 1e15) throw new Error("La cuenta excede el rango numérico permitido.");
  state.peakEquity = Math.max(state.peakEquity, m.equity);
  state.maxDrawdownPercent = Math.max(state.maxDrawdownPercent, Math.max(0, (state.peakEquity - m.equity) / state.peakEquity * 100));
}
function event(state: SimulationState, time: string, type: SimulationEvent["type"], message: string, extra: Partial<Pick<SimulationEvent, "orderId" | "positionId">> = {}) {
  state.events.push({ id: `event-${state.nextId++}`, time, type, message, ...extra });
  if (state.events.length > 500) state.events.splice(0, state.events.length - 500);
}
function prepare(state: SimulationState, candle: Candle) {
  checkCandle(candle, state.settings);
  if (state.lastCandle && (state.lastCandle.time !== candle.time || ["open", "high", "low", "close"].some(key => state.lastCandle![key as "open"] !== candle[key as "open"]))) throw new Error("Usa la vela actual de la sesión para enviar órdenes.");
  state.lastCandle = { ...candle };
  if (!state.equityCurve.length) recordCurve(state, candle);
}
function cloneState(input: SimulationState): SimulationState {
  return { ...input, settings: { ...input.settings }, lastCandle: input.lastCandle ? { ...input.lastCandle } : null, positions: input.positions.map(p => ({ ...p })), orders: input.orders.map(o => ({ ...o })), trades: [...input.trades], equityCurve: [...input.equityCurve], events: [...input.events] };
}
function recordCurve(state: SimulationState, candle: Candle) {
  mark(state, candle.close);
  const m = metricsAt(state, candle.close);
  const point = { time: candle.time, index: state.index, balance: state.balance, equity: m.equity, drawdownPercent: m.drawdownPercent };
  if (state.equityCurve.at(-1)?.index === state.index) state.equityCurve[state.equityCurve.length - 1] = point;
  else state.equityCurve.push(point);
}

export function submitOrder(input: SimulationState, request: OrderRequest, currentCandle: Candle): SimulationState {
  const state = cloneState(input);
  prepare(state, currentCandle);
  validateRequest(request, state.settings, currentCandle);
  if (state.orders.length >= 200) throw new Error("Límite de órdenes pendientes alcanzado.");
  if (metricsAt(state, currentCandle.close).equity <= 0) throw new Error("La cuenta no tiene equity para nuevas operaciones.");
  const order: PendingOrder = { ...request, id: `order-${state.nextId++}`, action: "open", submittedTime: currentCandle.time, submittedIndex: state.index };
  state.orders.push(order);
  event(state, currentCandle.time, "submitted", "Orden pendiente: se activará desde la apertura de la siguiente vela.", { orderId: order.id });
  return state;
}
export function closePosition(input: SimulationState, positionId: string, currentCandle: Candle): SimulationState {
  const state = cloneState(input);
  prepare(state, currentCandle);
  const p = state.positions.find(p => p.id === positionId);
  if (!p) throw new Error("La posición no existe o ya está cerrada.");
  if (state.orders.some(order => order.positionId === positionId)) throw new Error("Esta posición ya tiene un cierre pendiente.");
  if (state.orders.length >= 200) throw new Error("Límite de órdenes pendientes alcanzado.");
  const order: PendingOrder = { id: `order-${state.nextId++}`, side: p.side === "buy" ? "sell" : "buy", type: "market", lots: p.lots, action: "close", positionId, submittedTime: currentCandle.time, submittedIndex: state.index };
  state.orders.push(order);
  event(state, currentCandle.time, "submitted", "Cierre solicitado para la apertura de la siguiente vela.", { orderId: order.id, positionId });
  return state;
}
export function cancelOrder(input: SimulationState, orderId: string): SimulationState {
  const state = cloneState(input);
  const order = state.orders.find(order => order.id === orderId);
  if (!order) throw new Error("La orden ya no está pendiente.");
  state.orders = state.orders.filter(order => order.id !== orderId);
  event(state, state.lastCandle?.time ?? order.submittedTime, "cancelled", "Orden cancelada.", { orderId });
  return state;
}

function settle(state: SimulationState, p: Position, exitPrice: number, candle: Candle, reason: ExitReason, ambiguous = false) {
  if (!(exitPrice > 0) || !Number.isFinite(exitPrice)) throw new Error("Precio de salida no válido.");
  const grossPnl = pnl(state.settings, p, exitPrice);
  const exitCommission = state.settings.commissionPerLotSide * p.lots;
  const trade: ClosedTrade = { ...p, exitPrice, exitTime: candle.time, exitIndex: state.index, reason, grossPnl, exitCommission, netPnl: grossPnl - p.entryCommission - exitCommission - p.financing, ambiguous };
  state.balance += grossPnl - exitCommission;
  state.trades.push(trade);
  state.positions = state.positions.filter(position => position.id !== p.id);
  for (const order of state.orders.filter(order => order.positionId === p.id)) event(state, candle.time, "cancelled", "Cierre pendiente cancelado: la posición ya ha salido.", { orderId: order.id, positionId: p.id });
  state.orders = state.orders.filter(order => order.positionId !== p.id);
  event(state, candle.time, "closed", `Posición cerrada: ${reason}.`, { positionId: p.id, orderId: p.orderId });
}
function stopOut(state: SimulationState, mid: number, candle: Candle) {
  let m = metricsAt(state, mid);
  if (m.marginCall && !state.events.some(e => e.type === "margin-call" && e.time === candle.time)) event(state, candle.time, "margin-call", "Equity por debajo del nivel de margin call.");
  while (state.positions.length && m.marginLevelPercent !== null && m.marginLevelPercent <= state.settings.stopOutPercent + 1e-8) {
    const worst = [...state.positions].sort((a, b) => pnl(state.settings, a, liquidationQuote(state.settings, mid, a.side)) - pnl(state.settings, b, liquidationQuote(state.settings, mid, b.side)))[0];
    event(state, candle.time, "stop-out", "Liquidación por margen insuficiente, con costes y posible pérdida superior al saldo.", { positionId: worst.id });
    settle(state, worst, liquidationQuote(state.settings, mid, worst.side) - sign(worst.side) * slippage(state.settings), candle, "stop-out");
    m = metricsAt(state, mid);
  }
  if (m.equity <= 0 && state.orders.length) {
    for (const order of state.orders) event(state, candle.time, "cancelled", "Orden cancelada porque la cuenta no dispone de equity.", { orderId: order.id });
    state.orders = [];
  }
  mark(state, mid);
}
function bothHit(state: SimulationState, p: Position, candle: Candle) {
  if (p.stopLoss === undefined || p.takeProfit === undefined) return false;
  const lo = liquidationQuote(state.settings, candle.low, p.side), hi = liquidationQuote(state.settings, candle.high, p.side);
  return p.side === "buy" ? lo <= p.stopLoss && hi >= p.takeProfit : hi >= p.stopLoss && lo <= p.takeProfit;
}
function ambiguity(state: SimulationState, p: Position, candle: Candle) {
  if (!state.events.some(e => e.type === "ambiguity" && e.time === candle.time && e.positionId === p.id)) event(state, candle.time, "ambiguity", "La vela contiene SL y TP: se aplica el stop-loss como supuesto conservador; no se conoce el orden de los ticks.", { positionId: p.id });
}
function fill(state: SimulationState, order: PendingOrder, mid: number, candle: Candle, intrabar: boolean) {
  state.orders = state.orders.filter(p => p.id !== order.id);
  const s = state.settings;
  if (order.action === "close") {
    const p = state.positions.find(p => p.id === order.positionId);
    if (p) settle(state, p, liquidationQuote(s, mid, p.side) - sign(p.side) * slippage(s), candle, "manual");
    return;
  }
  let entryPrice = quote(s, mid, order.side) + sign(order.side) * slippage(s);
  if (order.type === "limit") entryPrice = order.side === "buy" ? Math.min(order.price!, entryPrice) : Math.max(order.price!, entryPrice);
  const margin = entryPrice * order.lots * s.contractSize * s.quoteToAccount / s.leverage;
  const commission = s.commissionPerLotSide * order.lots;
  const initialPnl = (liquidationQuote(s, mid, order.side) - entryPrice) * sign(order.side) * order.lots * s.contractSize * s.quoteToAccount;
  const before = metricsAt(state, mid);
  if (state.positions.length >= s.maxPositions || before.freeMargin + initialPnl - commission < margin - 1e-8 || before.marginCall || entryPrice <= 0) {
    event(state, candle.time, "rejected", "Orden rechazada al ejecutarse: margen libre insuficiente, margin call o límite de posiciones.", { orderId: order.id });
    return;
  }
  const p: Position = { id: `position-${state.nextId++}`, orderId: order.id, side: order.side, lots: order.lots, entryPrice, entryTime: candle.time, entryIndex: state.index, stopLoss: order.stopLoss, takeProfit: order.takeProfit, margin, entryCommission: commission, financing: 0 };
  state.balance -= commission;
  state.positions.push(p);
  event(state, candle.time, "filled", intrabar ? "Orden ejecutada dentro de la vela según el recorrido OHLC supuesto." : "Orden ejecutada en la apertura.", { orderId: order.id, positionId: p.id });
  if (bothHit(state, p, candle)) {
    ambiguity(state, p, candle);
    if (intrabar) settle(state, p, p.stopLoss! - sign(p.side) * slippage(s), candle, "stop-loss", true);
  }
  mark(state, mid);
}

function orderTriggered(state: SimulationState, o: PendingOrder, mid: number) {
  if (o.type === "market") return true;
  const difference = sign(o.side) * (quote(state.settings, mid, o.side) - o.price!);
  return o.type === "limit" ? difference <= 1e-12 : difference >= -1e-12;
}
function riskAtPrice(state: SimulationState, mid: number, candle: Candle, atOpen: boolean) {
  for (const p of [...state.positions]) {
    const current = liquidationQuote(state.settings, mid, p.side);
    const stop = p.stopLoss !== undefined && sign(p.side) * (current - p.stopLoss) <= 1e-12;
    const target = p.takeProfit !== undefined && sign(p.side) * (current - p.takeProfit) >= -1e-12;
    const ambiguous = bothHit(state, p, candle);
    if (ambiguous) ambiguity(state, p, candle);
    if (stop) settle(state, p, current - sign(p.side) * slippage(state.settings), candle, "stop-loss", ambiguous);
    else if (target && (atOpen || !ambiguous)) {
      const exit = p.side === "buy" ? Math.max(p.takeProfit!, current - slippage(state.settings)) : Math.min(p.takeProfit!, current + slippage(state.settings));
      settle(state, p, exit, candle, "take-profit");
    }
  }
  stopOut(state, mid, candle);
}

type Trigger = { at: number; kind: "risk" | "margin" | "order"; order?: PendingOrder; priority: number };
/** Traverse one assumed monotone segment, executing each trigger before looking further ahead. */
function traverse(state: SimulationState, from: number, to: number, candle: Candle) {
  let cursor = from;
  const direction = Math.sign(to - from);
  if (!direction) return;
  for (let iteration = 0; iteration < 1000; iteration++) {
    const candidates: Trigger[] = [];
    const add = (at: number, kind: Trigger["kind"], priority: number, order?: PendingOrder) => {
      if (direction * (at - cursor) > 1e-12 && direction * (to - at) >= -1e-12) candidates.push({ at, kind, order, priority });
    };
    for (const p of state.positions) {
      if (p.stopLoss !== undefined) add(p.stopLoss + sign(p.side) * halfSpread(state.settings), "risk", 0);
      if (p.takeProfit !== undefined && !bothHit(state, p, candle)) add(p.takeProfit + sign(p.side) * halfSpread(state.settings), "risk", 3);
    }
    for (const order of state.orders) {
      if (order.type === "market" || order.submittedIndex >= state.index) continue;
      const level = order.price! - sign(order.side) * halfSpread(state.settings);
      const triggerDirection = order.type === "stop" ? sign(order.side) : -sign(order.side);
      if (direction === triggerDirection) add(level, "order", 2, order);
    }
    const slope = state.positions.reduce((sum, p) => sum + sign(p.side) * p.lots * state.settings.contractSize * state.settings.quoteToAccount, 0);
    if (slope * direction < 0) {
      const m = metricsAt(state, cursor);
      const threshold = cursor + (m.usedMargin * state.settings.stopOutPercent / 100 - m.equity) / slope;
      add(threshold, "margin", 1);
      const callThreshold = cursor + (m.usedMargin * state.settings.marginCallPercent / 100 - m.equity) / slope;
      add(callThreshold, "margin", 1);
    }
    candidates.sort((a, b) => direction * (a.at - b.at) || a.priority - b.priority);
    const next = candidates[0];
    if (!next) { mark(state, to); riskAtPrice(state, to, candle, false); return; }
    cursor = next.at;
    mark(state, cursor);
    riskAtPrice(state, cursor, candle, false);
    // Several orders can share a trigger; process them in submission order.
    for (const order of [...state.orders]) if (order.submittedIndex < state.index && order.type !== "market" && orderTriggered(state, order, cursor)) fill(state, order, cursor, candle, true);
    riskAtPrice(state, cursor, candle, false);
  }
  throw new Error("Demasiados eventos en una vela; reduce las órdenes pendientes.");
}

export function advanceSimulation(input: SimulationState, nextCandle: Candle): SimulationState {
  const state = cloneState(input);
  const candle = checkCandle(nextCandle, state.settings);
  if (state.lastCandle && Date.parse(candle.time) <= Date.parse(state.lastCandle.time)) throw new Error("La próxima vela debe ser posterior a la actual.");
  if (state.index >= 1000000) throw new Error("Límite de velas de sesión alcanzado.");
  if (state.lastCandle) {
    const days = (Date.parse(candle.time) - Date.parse(state.lastCandle.time)) / 86400000;
    for (const p of state.positions) {
      const cost = p.lots * days * (p.side === "buy" ? state.settings.financingLongPerLotDay : state.settings.financingShortPerLotDay);
      p.financing += cost;
      state.balance -= cost;
    }
  }
  state.index++;
  state.lastCandle = { ...candle };
  mark(state, candle.open);
  // Existing protective orders take precedence at a gap, followed by margin controls.
  riskAtPrice(state, candle.open, candle, true);
  const atOpen = [...state.orders].filter(order => order.submittedIndex < state.index && orderTriggered(state, order, candle.open)).sort((a, b) => Number(b.action === "close") - Number(a.action === "close"));
  for (const order of atOpen) {
    if (!state.orders.some(o => o.id === order.id)) continue;
    fill(state, order, candle.open, candle, false);
    riskAtPrice(state, candle.open, candle, true);
  }
  const netLots = state.positions.reduce((sum, p) => sum + sign(p.side) * p.lots, 0);
  const path = netLots >= 0 ? [candle.open, candle.low, candle.high, candle.close] : [candle.open, candle.high, candle.low, candle.close];
  for (let i = 1; i < path.length; i++) traverse(state, path[i - 1], path[i], candle);
  recordCurve(state, candle);
  return state;
}

/** Explicit terminal valuation for a backtest, not a user market order. */
export function liquidateSimulation(input: SimulationState, currentCandle: Candle): SimulationState {
  const state = cloneState(input);
  prepare(state, currentCandle);
  for (const order of state.orders) event(state, currentCandle.time, "cancelled", "Orden cancelada al finalizar la muestra.", { orderId: order.id });
  state.orders = [];
  for (const p of [...state.positions]) settle(state, p, liquidationQuote(state.settings, currentCandle.close, p.side) - sign(p.side) * slippage(state.settings), currentCandle, "end-of-data");
  recordCurve(state, currentCandle);
  return state;
}
