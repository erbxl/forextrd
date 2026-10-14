import type { ClosedTrade, EquityPoint, SimulationSettings } from "../simulator/types";

export type StrategyId = "sma-cross" | "channel-breakout";
export type BacktestConfig = {
  strategy: StrategyId;
  fastPeriod: number;
  slowPeriod: number;
  channelPeriod: number;
  riskPercent: number;
  stopPips: number;
  takeProfitR: number;
  startIndex: number;
  endIndex: number;
  trainPercent: number;
  settings: SimulationSettings;
};
export type BacktestMetrics = {
  totalTrades: number;
  wins: number;
  losses: number;
  winRatePercent: number;
  netPnl: number;
  expectancy: number;
  /** Null means no losing trades; inspect grossProfit to distinguish no trades. */
  profitFactor: number | null;
  grossProfit: number;
  grossLoss: number;
  maxDrawdownPercent: number;
  totalReturnPercent: number;
  finalBalance: number;
  /** Sample standard deviation, zero risk-free rate, annualised by observed spacing (365 days). */
  sharpe: number | null;
  commission: number;
  financing: number;
};
export type BacktestRun = {
  startIndex: number;
  endIndex: number;
  trades: ClosedTrade[];
  equityCurve: EquityPoint[];
  metrics: BacktestMetrics;
  rejectedOrders: number;
};
export type BacktestResult = BacktestRun & {
  version: 1;
  datasetName: string;
  config: BacktestConfig;
  splitIndex: number;
  train: BacktestRun;
  test: BacktestRun;
  assumptions: string[];
};
