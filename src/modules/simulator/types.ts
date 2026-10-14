import type { Candle } from "../market-data/types";

/** OHLC prices are mid prices. All cash values use accountCurrency. */
export type SimulationSettings = {
  pair: string;
  accountCurrency: string;
  initialBalance: number;
  leverage: number;
  contractSize: number;
  quoteToAccount: number;
  pipSize: number;
  spreadPips: number;
  slippagePips: number;
  commissionPerLotSide: number;
  /** Positive numbers are costs, negative numbers are credits; prorated per 24h. */
  financingLongPerLotDay: number;
  financingShortPerLotDay: number;
  marginCallPercent: number;
  stopOutPercent: number;
  minLot: number;
  lotStep: number;
  maxLots: number;
  maxPositions: number;
};
export type TradeSide = "buy" | "sell";
export type OrderType = "market" | "limit" | "stop";
export type OrderRequest = {
  side: TradeSide;
  type: OrderType;
  lots: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
};
export type PendingOrder = OrderRequest & {
  id: string;
  action: "open" | "close";
  positionId?: string;
  submittedTime: string;
  submittedIndex: number;
};
export type Position = {
  id: string;
  orderId: string;
  side: TradeSide;
  lots: number;
  entryPrice: number;
  entryTime: string;
  entryIndex: number;
  stopLoss?: number;
  takeProfit?: number;
  margin: number;
  entryCommission: number;
  financing: number;
};
export type ExitReason = "stop-loss" | "take-profit" | "manual" | "stop-out" | "end-of-data";
export type ClosedTrade = Position & {
  exitPrice: number;
  exitTime: string;
  exitIndex: number;
  reason: ExitReason;
  grossPnl: number;
  exitCommission: number;
  netPnl: number;
  /** Both SL and TP were inside the OHLC range; the stop was chosen. */
  ambiguous: boolean;
};
export type EquityPoint = { time: string; index: number; balance: number; equity: number; drawdownPercent: number };
export type SimulationEvent = {
  id: string;
  time: string;
  type: "submitted" | "filled" | "cancelled" | "rejected" | "closed" | "margin-call" | "stop-out" | "ambiguity";
  message: string;
  orderId?: string;
  positionId?: string;
};
export type AccountMetrics = {
  balance: number;
  equity: number;
  unrealizedPnl: number;
  usedMargin: number;
  freeMargin: number;
  marginLevelPercent: number | null;
  marginCall: boolean;
  drawdownPercent: number;
  totalReturnPercent: number;
};
export type SimulationState = {
  version: 1;
  settings: SimulationSettings;
  index: number;
  lastCandle: Candle | null;
  balance: number;
  peakEquity: number;
  maxDrawdownPercent: number;
  nextId: number;
  positions: Position[];
  orders: PendingOrder[];
  trades: ClosedTrade[];
  equityCurve: EquityPoint[];
  events: SimulationEvent[];
};
