import { runBacktest } from "./engine";
import type { BacktestConfig, BacktestResult } from "./types";
import type { MarketDataset } from "../market-data/types";

type Request = { data: MarketDataset; config: BacktestConfig };
export type BacktestWorkerResponse = { result: BacktestResult; error?: never } | { error: string; result?: never };
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<Request>) => void) | null;
  postMessage: (message: BacktestWorkerResponse) => void;
};
scope.onmessage = event => {
  try { scope.postMessage({ result: runBacktest(event.data.data, event.data.config) }); }
  catch (cause) { scope.postMessage({ error: cause instanceof Error ? cause.message : "No se pudo ejecutar el experimento." }); }
};
