"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { accountMoney, exportRows, marketPrice, utcLabel } from "@/components/trading-format";
import type { ClosedTrade, SimulationSettings } from "@/modules/simulator/types";
import { downloadText } from "@/lib/download";

export const exitLabels = { "stop-loss": "Stop loss", "take-profit": "Take profit", manual: "Cierre manual", "stop-out": "Cierre por margen", "end-of-data": "Fin de datos" } as const;

export function tradesCSV(trades: ClosedTrade[], settings: SimulationSettings) {
  return exportRows(
    ["par", "entrada_utc", "salida_utc", "direccion", "lotes", "unidades", "entrada", "salida", "stop", "objetivo", "bruto_usd", "comision_usd", "financiacion_usd", "neto_usd", "motivo", "ambiguedad_ohlc"],
    trades.map(trade => [settings.pair, trade.entryTime, trade.exitTime, trade.side, trade.lots, trade.lots * settings.contractSize, trade.entryPrice, trade.exitPrice, trade.stopLoss, trade.takeProfit, trade.grossPnl, trade.entryCommission + trade.exitCommission, trade.financing, trade.netPnl, exitLabels[trade.reason], trade.ambiguous ? "sí" : "no"]),
  );
}

export function TradeHistory({ trades, settings, onJournal }: {
  trades: ClosedTrade[];
  settings: SimulationSettings;
  onJournal?: (trade: ClosedTrade) => void;
}) {
  return <section className="panel tool-panel"><div className="panel-heading"><h2>Operaciones cerradas</h2>
    <Button disabled={!trades.length} variant="secondary" onClick={() => downloadText(tradesCSV(trades, settings), "operaciones-practica.csv", "text/csv")}><Download size={15} />Exportar CSV</Button>
  </div>{!trades.length ? <p className="muted">Todavía no hay operaciones cerradas. Las órdenes enviadas se evalúan al avanzar la siguiente vela.</p> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Fechas UTC</th><th>Dirección / tamaño</th><th>Entrada → salida</th><th>Comisión / financiación</th><th>Neto USD</th><th>Salida</th>{onJournal && <th>Diario</th>}</tr></thead>
    <tbody>{[...trades].reverse().map(trade => <tr key={trade.id}><td>{utcLabel(trade.entryTime)}<small>{utcLabel(trade.exitTime)}</small></td><td>{trade.side === "buy" ? "Compra" : "Venta"}<small>{trade.lots} lotes · {accountMoney(trade.lots * settings.contractSize)} unidades</small></td><td>{marketPrice(trade.entryPrice, settings.pair)} → {marketPrice(trade.exitPrice, settings.pair)}</td><td>{accountMoney(trade.entryCommission + trade.exitCommission)} / {accountMoney(trade.financing)}</td><td className={trade.netPnl >= 0 ? "accent" : "warm"}>{accountMoney(trade.netPnl)}</td><td>{exitLabels[trade.reason]}{trade.ambiguous && <small>SL y TP en la vela: prioridad al stop</small>}</td>{onJournal && <td><Button variant="ghost" disabled={!trade.stopLoss || !trade.takeProfit} onClick={() => onJournal(trade)}>Enviar al diario</Button>{(!trade.stopLoss || !trade.takeProfit) && <small>Requiere stop y objetivo iniciales</small>}</td>}</tr>)}</tbody>
  </table></div>}<p className="tool-explanation">El precio de ejecución ya incorpora spread y deslizamiento. El neto descuenta además comisiones y financiación; no vuelvas a sumar el spread como coste separado.</p></section>;
}
