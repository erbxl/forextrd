import { z } from "zod";
import { validateDataset } from "@/modules/market-data/data";
import type { MarketDataset } from "@/modules/market-data/types";
import { validateSimulationState } from "@/modules/simulator/engine";
import type { SimulationState } from "@/modules/simulator/types";
import { getDatabase } from "@/modules/storage/db";
import type { JsonValue, ReservedRecord } from "@/modules/storage/types";

export type TradingMode = "simulator" | "replay";
export type ChartLevel = { id: string; price: number; label: string };
export type TradingSession = { schema: 1; kind: "simulator-session" | "replay-session"; name: string; data: MarketDataset; state: SimulationState; levels: ChartLevel[] };
export type SavedTradingSession = TradingSession & { id: string; createdAt: string; updatedAt: string };
const envelope = z.object({
  schema: z.literal(1), kind: z.enum(["simulator-session", "replay-session"]), name: z.string().trim().min(1).max(100),
  data: z.unknown(), state: z.unknown(), levels: z.array(z.object({ id: z.string().min(1).max(100), price: z.number().finite().positive().max(1e6), label: z.string().trim().min(1).max(60) }).strict()).max(30),
}).strict();

export function validateTradingSession(value: unknown, mode: TradingMode): TradingSession {
  const parsed = envelope.safeParse(value);
  if (!parsed.success || parsed.data.kind !== `${mode}-session`) throw new Error("La sesión guardada tiene un formato incompatible. Conserva una copia JSON antes de revisar sus datos.");
  const data = validateDataset(parsed.data.data as MarketDataset);
  const state = validateSimulationState(parsed.data.state);
  if (!Number.isInteger(state.index) || state.index < 0 || state.index >= data.candles.length || state.settings.pair.replace("/", "") !== data.pair.replace("/", "")) throw new Error("El cursor, el par y la serie de la sesión no coinciden.");
  const current = data.candles[state.index];
  if (state.lastCandle && ["time", "open", "high", "low", "close"].some(key => state.lastCandle![key as keyof typeof current] !== current[key as keyof typeof current])) throw new Error("La última vela guardada no coincide con la serie.");
  const validIndex = (index: number, time: string) => Number.isInteger(index) && index >= 0 && index <= state.index && data.candles[index].time === time;
  if (state.positions.some(position => !validIndex(position.entryIndex, position.entryTime)) || state.orders.some(order => !validIndex(order.submittedIndex, order.submittedTime)) || state.trades.some(trade => !validIndex(trade.entryIndex, trade.entryTime) || !validIndex(trade.exitIndex, trade.exitTime)) || state.equityCurve.some(point => !validIndex(point.index, point.time)) || state.events.some(event => event.time > current.time)) throw new Error("La sesión contiene registros fuera del período revelado.");
  if (new Set(parsed.data.levels.map(level => level.id)).size !== parsed.data.levels.length) throw new Error("Hay marcas de gráfico repetidas en esta sesión.");
  return { ...parsed.data, data, state };
}

export async function saveTradingSession(session: TradingSession, mode: TradingMode, id?: string): Promise<string> {
  const value = validateTradingSession(session, mode);
  const table = mode === "replay" ? getDatabase().replaySessions : getDatabase().demoTrades;
  const existing = id ? await table.get(id) : undefined;
  if (id && !existing) throw new Error("La sesión ya no existe. Guarda una copia con otro nombre.");
  const now = new Date().toISOString();
  const savedId = id ?? crypto.randomUUID();
  await table.put({ id: savedId, createdAt: existing?.createdAt ?? now, updatedAt: now, metadata: JSON.parse(JSON.stringify(value)) as Record<string, JsonValue> });
  return savedId;
}

export function sessionFromRecord(record: ReservedRecord, mode: TradingMode): SavedTradingSession {
  return { ...validateTradingSession(record.metadata, mode), id: record.id, createdAt: record.createdAt, updatedAt: record.updatedAt };
}

export async function listTradingSessions(mode: TradingMode): Promise<{ sessions: SavedTradingSession[]; invalid: number }> {
  const table = mode === "replay" ? getDatabase().replaySessions : getDatabase().demoTrades;
  const records = await table.toArray(); const sessions: SavedTradingSession[] = []; let invalid = 0;
  for (const record of records) {
    if (record.metadata.kind !== `${mode}-session`) continue;
    try { sessions.push(sessionFromRecord(record, mode)); } catch { invalid++; }
  }
  return { sessions: sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), invalid };
}
