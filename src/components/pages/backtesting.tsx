"use client";

import { useEffect, useRef, useState } from "react";
import { liveQuery } from "dexie";
import { SectionHeading } from "@/components/section-heading";
import { StorageStatus, useLearning } from "@/components/learning-provider";
import { MarketDataPanel } from "@/components/market-data-panel";
import { EquityChart } from "@/components/market-chart";
import { SimulationSettingsFields } from "@/components/simulation-settings";
import { TradeHistory } from "@/components/trade-history";
import { accountMoney, errorMessage, utcLabel } from "@/components/trading-format";
import { Button } from "@/components/ui/button";
import { downloadText } from "@/lib/download";
import { demoDataset, validateDataset } from "@/modules/market-data/data";
import type { MarketDataset } from "@/modules/market-data/types";
import { defaultBacktestConfig, validateBacktestConfig } from "@/modules/backtesting/engine";
import type { BacktestConfig, BacktestResult } from "@/modules/backtesting/types";
import type { BacktestWorkerResponse } from "@/modules/backtesting/worker";
import { getDatabase } from "@/modules/storage/db";
import type { JsonValue, ReservedRecord } from "@/modules/storage/types";

const initial = demoDataset();
export default function BacktestingPage() {
  const { progress } = useLearning();
  const [data, setData] = useState<MarketDataset>(initial);
  const [config, setConfig] = useState<BacktestConfig>(() => defaultBacktestConfig(initial));
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [saved, setSaved] = useState<ReservedRecord[]>([]);
  const [name, setName] = useState("Mi experimento");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const worker = useRef<Worker | null>(null);
  useEffect(() => () => worker.current?.terminate(), []);
  const available = Boolean(progress);
  useEffect(() => {
    if (!available) return;
    const subscription = liveQuery(() => getDatabase().backtestResults.toArray()).subscribe({
      next: rows => setSaved(rows.filter(row => row.metadata.kind === "backtest-experiment").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))),
      error: () => setError("No se han podido leer los experimentos guardados."),
    });
    return () => subscription.unsubscribe();
  }, [available]);
  function change(value: Partial<BacktestConfig>) { setConfig(previous => ({ ...previous, ...value })); setResult(null); setNotice(""); }
  function run(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice(""); setResult(null);
    try {
      const validated = validateBacktestConfig(config, data);
      worker.current?.terminate();
      const task = new Worker(new URL("../../modules/backtesting/worker.ts", import.meta.url));
      worker.current = task;
      const finish = () => { task.terminate(); worker.current = null; setBusy(false); };
      task.onmessage = (message: MessageEvent<BacktestWorkerResponse>) => {
        if (message.data.result) setResult(message.data.result);
        else setError(message.data.error);
        finish();
      };
      task.onerror = () => { setError("No se pudo ejecutar el cálculo en segundo plano. Recarga e inténtalo de nuevo."); finish(); };
      task.postMessage({ data, config: validated });
    } catch (cause) { worker.current?.terminate(); worker.current = null; setBusy(false); setError(errorMessage(cause, "No se pudo ejecutar el experimento.")); }
  }
  async function save() {
    if (!result) return;
    setError(""); setNotice("");
    try {
      if (!name.trim()) throw new Error("Pon un nombre al experimento.");
      const now = new Date().toISOString();
      await getDatabase().backtestResults.add({ id: crypto.randomUUID(), createdAt: now, updatedAt: now, metadata: JSON.parse(JSON.stringify({ schema: 1, kind: "backtest-experiment", name: name.trim(), data, config: result.config, result })) as Record<string, JsonValue> });
      setNotice("Experimento guardado en este navegador y disponible en tus copias de seguridad.");
    } catch (cause) { setError(errorMessage(cause, "No se pudo guardar.")); }
  }
  function load(row: ReservedRecord) {
    setError(""); setNotice("");
    try {
      if (row.metadata.schema !== 1 || typeof row.metadata.name !== "string") throw new Error("Formato de experimento incompatible.");
      const restored = validateDataset(row.metadata.data as unknown as MarketDataset);
      const settings = validateBacktestConfig(row.metadata.config, restored);
      setData(restored); setConfig(settings); setName(row.metadata.name); setResult(null);
      setNotice("Datos y parámetros recuperados. Ejecuta el experimento para recalcular sus resultados.");
    } catch (cause) { setError(errorMessage(cause, "No se pudo abrir el experimento.")); }
  }
  if (!progress) return <StorageStatus />;
  const numberField = (key: "fastPeriod" | "slowPeriod" | "channelPeriod" | "riskPercent" | "stopPips" | "takeProfitR" | "trainPercent", label: string, min: number, max: number, step: number | "any" = 1) => <label key={key}>{label}<input required disabled={busy} type="number" min={min} max={max} step={step} value={Number.isFinite(config[key]) ? config[key] : ""} onChange={event => change({ [key]: event.target.value === "" ? NaN : Number(event.target.value) })} /></label>;
  return <div className="page-enter"><SectionHeading eyebrow="HIPÓTESIS, DATOS Y EVIDENCIA" title="Pon a prueba una estrategia." description="Compara reglas fijas con costes explícitos y una muestra de prueba separada. Una simulación favorable no demuestra rentabilidad futura." />
    <MarketDataPanel data={data} disabled={busy} onChange={value => { setData(value); setConfig(defaultBacktestConfig(value)); setResult(null); setNotice(""); }} />
    <section className="panel tool-panel"><h2>Diseña el experimento</h2><form onSubmit={run}><div className="tool-fields"><label>Estrategia<select disabled={busy} value={config.strategy} onChange={event => change({ strategy: event.target.value as BacktestConfig["strategy"] })}><option value="sma-cross">Cruce de medias simples</option><option value="channel-breakout">Ruptura de canal</option></select></label><label>Nombre del experimento<input maxLength={100} required value={name} onChange={event => setName(event.target.value)} /></label>
      {config.strategy === "sma-cross" ? <>{numberField("fastPeriod", "Media rápida (velas)", 2, 2000)}{numberField("slowPeriod", "Media lenta (velas)", 2, 2000)}</> : numberField("channelPeriod", "Canal previo (velas)", 2, 2000)}
      {numberField("riskPercent", "Riesgo presupuestado por entrada (%)", .01, 10, "any")}{numberField("stopPips", "Distancia del stop (pips)", .01, 100000, "any")}{numberField("takeProfitR", "Objetivo bruto (múltiplo del stop)", .1, 20, "any")}{numberField("trainPercent", "Muestra de entrenamiento (%)", 10, 90, "any")}
      {(["startIndex", "endIndex"] as const).map(key => <label key={key}>{key === "startIndex" ? "Primera vela del intervalo (UTC)" : "Última vela del intervalo (UTC)"}<select disabled={busy} value={config[key]} onChange={event => change({ [key]: Number(event.target.value) })}>{data.candles.map((candle, index) => <option key={candle.time} value={index}>{utcLabel(candle.time)}</option>)}</select></label>)}
    </div><details><summary>Capital, costes y ejecución</summary><SimulationSettingsFields value={config.settings} disabled={busy} onChange={settings => change({ settings })} /></details><p className="tool-explanation">Señales al cierre y ejecución en la siguiente apertura. Entrenamiento y prueba mantienen parámetros fijos y cuentas independientes; el historial anterior solo calienta los indicadores. Repetir ajustes mirando la prueba contamina su independencia.</p><Button type="submit" disabled={busy}>{busy ? "Calculando…" : "Ejecutar backtest"}</Button>{busy && <Button type="button" variant="ghost" onClick={() => { worker.current?.terminate(); worker.current = null; setBusy(false); setNotice("Cálculo cancelado. Puedes ajustar los parámetros y repetirlo."); }}>Cancelar cálculo</Button>}</form></section>
    {error && <p className="form-error" role="alert">{error}</p>}{notice && <p role="status" className="tool-explanation accent">{notice}</p>}
    {result && <><section className="panel tool-panel"><span className="tag tag-amber">{data.kind === "simulated" ? "RESULTADOS SOBRE DATOS SIMULADOS" : "CSV · FUENTE DECLARADA"}</span><h2>Resultados del experimento</h2><p>Prueba desde {utcLabel(data.candles[result.splitIndex].time)}. {data.source}</p><div className="table-scroll"><table className="data-table"><thead><tr><th>Métrica</th><th>Intervalo completo</th><th>Entrenamiento</th><th>Prueba</th></tr></thead><tbody>
      {([ ["Operaciones", "totalTrades"], ["Aciertos (%)", "winRatePercent"], ["Resultado neto (USD)", "netPnl"], ["Rentabilidad (%)", "totalReturnPercent"], ["Drawdown máximo (%)", "maxDrawdownPercent"], ["Expectativa (USD / operación)", "expectancy"], ["Profit factor neto", "profitFactor"], ["Sharpe anualizado", "sharpe"], ["Comisiones (USD)", "commission"], ["Financiación (USD)", "financing"] ] as const).map(([label, key]) => <tr key={key}><th>{label}</th>{[result, result.train, result.test].map((run, index) => <td key={index}>{run.metrics[key] === null ? "No definido" : accountMoney(run.metrics[key])}</td>)}</tr>)}
    </tbody></table></div><p className="small muted">Sin pérdidas, el profit factor no está definido. Sharpe requiere variación y capital positivo. Las tres columnas no se suman: son ejecuciones independientes. Órdenes rechazadas: {result.rejectedOrders} / {result.train.rejectedOrders} / {result.test.rejectedOrders}.</p><EquityChart values={result.equityCurve.map(point => point.equity)} label="Equity del intervalo completo · USD" /><EquityChart values={result.test.equityCurve.map(point => point.equity)} label="Equity de la muestra de prueba · USD" />
      <div className="tool-actions"><Button onClick={save}>Guardar experimento</Button><Button variant="secondary" onClick={() => downloadText(JSON.stringify({ data, result }, null, 2), "backtest.json", "application/json")}>Exportar resultados JSON</Button></div><details><summary>Supuestos y límites del cálculo</summary><ul className="tool-explanation">{result.assumptions.map(line => <li key={line}>{line}</li>)}</ul></details></section><TradeHistory trades={result.trades} settings={result.config.settings} /></>}
    <section className="panel tool-panel"><h2>Experimentos guardados</h2>{saved.length ? <ul className="analytics-list">{saved.map(row => <li key={row.id}><span>{String(row.metadata.name)}<small>{utcLabel(row.updatedAt)}</small></span><Button variant="secondary" disabled={busy} onClick={() => load(row)}>Recuperar parámetros y datos</Button></li>)}</ul> : <p>Todavía no has guardado experimentos.</p>}</section>
  </div>;
}
