"use client";

import { useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { Download, Pause, Play, Plus, RotateCcw, Save, SkipForward, Trash2 } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import { StorageStatus, useLearning } from "@/components/learning-provider";
import { MarketDataPanel } from "@/components/market-data-panel";
import { MarketChart, EquityChart } from "@/components/market-chart";
import { SimulationSettingsFields } from "@/components/simulation-settings";
import { TradeHistory, exitLabels } from "@/components/trade-history";
import { accountMoney, errorMessage, marketPrice, utcLabel } from "@/components/trading-format";
import { demoDataset } from "@/modules/market-data/data";
import type { MarketDataset } from "@/modules/market-data/types";
import { accountMetrics, advanceSimulation, cancelOrder, closePosition, createSimulation, defaultSettings, EXECUTION_ASSUMPTIONS, submitOrder } from "@/modules/simulator/engine";
import type { ClosedTrade, OrderType, SimulationState, TradeSide } from "@/modules/simulator/types";
import { listTradingSessions, saveTradingSession, validateTradingSession, type ChartLevel, type SavedTradingSession, type TradingMode, type TradingSession } from "@/modules/trading-sessions/service";
import { saveJournalEntry } from "@/modules/journal/service";
import { getDatabase } from "@/modules/storage/db";
import { downloadText } from "@/lib/download";

const initialData = demoDataset();
const initialIndex = (data: MarketDataset) => Math.min(29, data.candles.length - 2);
const dateInput = (data: MarketDataset) => data.candles[initialIndex(data)].time.slice(0, 16);

export default function TradingPage({ mode = "simulator" }: { mode?: TradingMode }) {
  const { progress } = useLearning();
  const [data, setData] = useState<MarketDataset>(initialData);
  const [settings, setSettings] = useState(() => defaultSettings(initialData.pair));
  const [startDate, setStartDate] = useState(dateInput(initialData));
  const [simulation, setSimulation] = useState<SimulationState | null>(null);
  const [playing, setPlaying] = useState(false); const [speed, setSpeed] = useState(1000);
  const [side, setSide] = useState<TradeSide>("buy"); const [orderType, setOrderType] = useState<OrderType>("market");
  const [units, setUnits] = useState("10000"); const [orderPrice, setOrderPrice] = useState(""); const [stop, setStop] = useState(""); const [target, setTarget] = useState("");
  const [levels, setLevels] = useState<ChartLevel[]>([]); const [levelPrice, setLevelPrice] = useState(""); const [levelLabel, setLevelLabel] = useState("Soporte");
  const [sessionName, setSessionName] = useState(mode === "replay" ? "Mi sesión de replay" : "Mi cuenta de práctica");
  const [savedId, setSavedId] = useState<string>(); const [savedSessions, setSavedSessions] = useState<SavedTradingSession[]>([]);
  const [invalidSessions, setInvalidSessions] = useState(0); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [replacement, setReplacement] = useState<"reset" | SavedTradingSession | null>(null);
  const [deleting, setDeleting] = useState<string>();

  useEffect(() => {
    if (!progress) return;
    const subscription = liveQuery(() => listTradingSessions(mode)).subscribe({
      next: result => { setSavedSessions(result.sessions); setInvalidSessions(result.invalid); },
      error: () => setError("No se pudieron leer las sesiones guardadas en este navegador."),
    });
    return () => subscription.unsubscribe();
  }, [Boolean(progress), mode]);

  useEffect(() => {
    if (!playing || !simulation) return;
    if (simulation.index >= data.candles.length - 1) { setPlaying(false); return; }
    const timer = window.setTimeout(() => {
      try { setSimulation(advanceSimulation(simulation, data.candles[simulation.index + 1])); }
      catch (cause) { setError(errorMessage(cause, "No se pudo avanzar la vela.")); setPlaying(false); }
    }, speed);
    return () => window.clearTimeout(timer);
  }, [playing, simulation, data, speed]);

  useEffect(() => {
    const pause = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);

  if (!progress) return <StorageStatus />;
  const cursor = simulation?.index ?? initialIndex(data);
  const candle = data.candles[cursor];
  const visibleCandles = data.candles.slice(0, cursor + 1);
  const metrics = simulation ? accountMetrics(simulation, candle) : null;
  const atEnd = cursor >= data.candles.length - 1;
  const positionLevels = simulation?.positions.flatMap(position => [
    { price: position.entryPrice, label: `${position.side === "buy" ? "Compra" : "Venta"} ${position.id}` },
    ...(position.stopLoss ? [{ price: position.stopLoss, label: `SL ${position.id}` }] : []),
    ...(position.takeProfit ? [{ price: position.takeProfit, label: `TP ${position.id}` }] : []),
  ]) ?? [];

  function clearFeedback() { setError(""); setNotice(""); }
  function changeData(next: MarketDataset) {
    if (simulation) return;
    setData(next); setSettings(defaultSettings(next.pair)); setStartDate(dateInput(next)); setLevels([]); setOrderPrice(""); setStop(""); setTarget(""); setSavedId(undefined); clearFeedback();
  }
  function start(event: React.FormEvent) {
    event.preventDefault(); clearFeedback();
    try {
      const time = Date.parse(startDate + ":00Z");
      const index = data.candles.findIndex(item => Date.parse(item.time) >= time);
      if (!Number.isFinite(time) || time < Date.parse(data.candles[0].time) || index < 0 || index >= data.candles.length - 1) throw new Error("Elige una fecha de la serie que deje al menos una vela posterior para practicar.");
      const state = createSimulation(settings, index);
      state.lastCandle = { ...data.candles[index] };
      state.equityCurve = [{ time: state.lastCandle.time, index, balance: state.balance, equity: state.balance, drawdownPercent: 0 }];
      setSimulation(state);
      setLevels([]); setSavedId(undefined); setNotice("Sesión iniciada. Cada orden se evalúa desde la siguiente vela; el futuro permanece oculto.");
    } catch (cause) { setError(errorMessage(cause, "Revisa las condiciones de la sesión.")); }
  }
  function step() {
    if (!simulation || atEnd) return;
    setPlaying(false); clearFeedback();
    try { setSimulation(advanceSimulation(simulation, data.candles[cursor + 1])); }
    catch (cause) { setError(errorMessage(cause, "No se pudo avanzar la vela.")); }
  }
  function sendOrder(event: React.FormEvent) {
    event.preventDefault(); if (!simulation || atEnd) return; clearFeedback();
    try {
      const next = submitOrder(simulation, { side, type: orderType, lots: Number(units) / simulation.settings.contractSize, ...(orderType === "market" ? {} : { price: Number(orderPrice) }), ...(stop.trim() ? { stopLoss: Number(stop) } : {}), ...(target.trim() ? { takeProfit: Number(target) } : {}) }, candle);
      setSimulation(next); setNotice("Orden enviada. Avanza una vela para evaluar su ejecución.");
    } catch (cause) { setError(errorMessage(cause, "No se pudo enviar la orden.")); }
  }
  function requestClose(id: string) {
    if (!simulation || atEnd) return; clearFeedback();
    try { setSimulation(closePosition(simulation, id, candle)); setNotice("Cierre solicitado para la apertura de la siguiente vela."); }
    catch (cause) { setError(errorMessage(cause, "No se pudo solicitar el cierre.")); }
  }
  function cancel(id: string) {
    if (!simulation) return; clearFeedback();
    try { setSimulation(cancelOrder(simulation, id)); setNotice("Orden cancelada."); }
    catch (cause) { setError(errorMessage(cause, "No se pudo cancelar la orden.")); }
  }
  function addLevel(event: React.FormEvent) {
    event.preventDefault(); clearFeedback(); const price = Number(levelPrice);
    if (!Number.isFinite(price) || price <= 0 || price > 1e6 || !levelLabel.trim() || levels.length >= 30) { setError("Indica un precio positivo y una etiqueta; máximo 30 marcas por sesión."); return; }
    setLevels(previous => [...previous, { id: crypto.randomUUID(), price, label: levelLabel.trim() }]); setLevelPrice("");
  }
  function currentSession(): TradingSession {
    if (!simulation) throw new Error("Inicia una sesión antes de guardarla.");
    return { schema: 1, kind: `${mode}-session`, name: sessionName, data, state: simulation, levels };
  }
  async function save(asCopy = false) {
    setPlaying(false); clearFeedback(); setBusy(true);
    try { setSavedId(await saveTradingSession(currentSession(), mode, asCopy ? undefined : savedId)); setNotice("Sesión guardada con su serie, saldo, operaciones, marcas y punto de avance."); }
    catch (cause) { setError(errorMessage(cause, "No se pudo guardar la sesión.")); }
    finally { setBusy(false); }
  }
  function loadSession(saved: SavedTradingSession) {
    try {
      const { id, createdAt: _created, updatedAt: _updated, ...raw } = saved;
      const validated = validateTradingSession(raw, mode);
      setPlaying(false); setData(validated.data); setSimulation(validated.state); setSettings(validated.state.settings); setLevels(validated.levels); setSessionName(validated.name); setSavedId(id); setStartDate(validated.data.candles[validated.state.index].time.slice(0, 16)); setOrderPrice(""); setStop(""); setTarget(""); setReplacement(null); setNotice("Sesión recuperada. Continúa desde la última vela guardada."); setError("");
    } catch (cause) { setError(errorMessage(cause, "No se pudo recuperar esta sesión.")); }
  }
  function replaceCurrent() {
    if (replacement && replacement !== "reset") { loadSession(replacement); return; }
    setPlaying(false); setSimulation(null); setLevels([]); setSavedId(undefined); setReplacement(null); setStartDate(dateInput(data)); clearFeedback();
  }
  async function deleteSession(id: string) {
    clearFeedback();
    try { await (mode === "replay" ? getDatabase().replaySessions : getDatabase().demoTrades).delete(id); if (savedId === id) setSavedId(undefined); setDeleting(undefined); setNotice("Copia guardada eliminada. La sesión abierta continúa disponible."); }
    catch (cause) { setError(errorMessage(cause, "No se pudo eliminar la copia.")); }
  }
  async function sendToJournal(trade: ClosedTrade) {
    if (!simulation || !trade.stopLoss || !trade.takeProfit) return; clearFeedback();
    try {
      const quantity = trade.lots * simulation.settings.contractSize;
      const costs = trade.entryCommission + trade.exitCommission + trade.financing;
      await saveJournalEntry({ openedAt: trade.entryTime, closedAt: trade.exitTime, pair: data.pair, direction: trade.side, entry: trade.entryPrice, exit: trade.exitPrice, stop: trade.stopLoss, target: trade.takeProfit, units: quantity, quoteToAccount: simulation.settings.quoteToAccount, costs, strategy: mode === "replay" ? "Práctica de replay" : "Práctica en simulador", entryReason: "", exitReason: exitLabels[trade.reason], emotionBefore: "", emotionAfter: "", errors: [], notes: `Origen: ${sessionName}. ${data.kind === "simulated" ? "DATOS SIMULADOS" : "CSV importado"}. Los costes incluyen comisiones y financiación (${trade.financing} USD). Revisa y completa tu razonamiento y el cumplimiento del plan.`, followedPlan: false });
      setNotice("Operación enviada al diario. Completa allí los motivos, emociones y cumplimiento de tu plan.");
    } catch (cause) { setError(errorMessage(cause, "No se pudo registrar la operación en el diario.")); }
  }

  return <div className="page-enter"><SectionHeading eyebrow={mode === "replay" ? "UNA VELA, UNA DECISIÓN" : "LABORATORIO DE EJECUCIÓN"} title={mode === "replay" ? "Practica sin ver el futuro." : "Aprende a ejecutar tu plan."} description="Operaciones de práctica con saldo virtual, margen y costes explícitos. No conecta con un bróker ni envía órdenes reales." />
    <details className="panel tool-panel"><summary>Cómo se modela la ejecución</summary><ul className="tool-explanation">{EXECUTION_ASSUMPTIONS.map(line => <li key={line}>{line}</li>)}</ul></details>
    <MarketDataPanel data={data} onChange={changeData} disabled={simulation !== null} />
    <details className="panel tool-panel" open={!simulation}><summary>{simulation ? `Condiciones de la sesión · ${data.pair} · ${accountMoney(settings.initialBalance)} USD iniciales` : "01 · Configura tu sesión de práctica"}</summary><form onSubmit={start}><SimulationSettingsFields value={settings} onChange={setSettings} disabled={simulation !== null} /><div className="tool-fields"><label>Primera decisión (fecha y hora UTC)<input type="datetime-local" required disabled={simulation !== null} value={startDate} onChange={event => setStartDate(event.target.value)} /></label></div><p className="tool-explanation">Primera vela de la serie: {utcLabel(data.candles[0].time)}. Al comenzar se muestran solo las velas cerradas hasta la fecha elegida. El capital y las condiciones se fijan para toda la sesión.</p>{!simulation && <Button type="submit"><Play size={16} />Iniciar {mode === "replay" ? "replay" : "simulación"}</Button>}</form></details>
    {error && <p role="alert" className="form-error">{error}</p>}{notice && <p role="status" className="tool-explanation accent">{notice}</p>}
    {simulation && metrics && <>
      <div className="stat-grid"><div className="stat-card"><span className="stat-label">Saldo virtual</span><strong>{accountMoney(metrics.balance)}<span>USD</span></strong></div><div className="stat-card"><span className="stat-label">Equity</span><strong>{accountMoney(metrics.equity)}<span>USD</span></strong></div><div className="stat-card"><span className="stat-label">P&amp;L flotante</span><strong className={metrics.unrealizedPnl >= 0 ? "accent" : "warm"}>{accountMoney(metrics.unrealizedPnl)}<span>USD</span></strong></div><div className="stat-card"><span className="stat-label">Margen libre</span><strong>{accountMoney(metrics.freeMargin)}<span>USD</span></strong></div></div>
      <p className="tool-explanation">Margen utilizado: {accountMoney(metrics.usedMargin)} USD · Nivel de margen: {metrics.marginLevelPercent === null ? "Sin posiciones" : `${accountMoney(metrics.marginLevelPercent)} %`} · Drawdown actual: {accountMoney(metrics.drawdownPercent)} % · Máximo: {accountMoney(simulation.maxDrawdownPercent)} %. {metrics.marginCall && <strong className="warm">Aviso de margen: revisa la exposición antes de enviar nuevas órdenes.</strong>}</p>
    </>}
    {simulation && <div className="trading-layout"><section className="panel tool-panel"><div className="panel-heading"><h2>{data.pair} · {data.timeframeMinutes} min</h2><span className={`tag ${data.kind === "simulated" ? "tag-amber" : "tag-green"}`}>{data.kind === "simulated" ? "SIMULADO" : "CSV · FUENTE DECLARADA"}</span></div><p className="small muted">{utcLabel(candle.time)} · Último cierre revelado: <strong>{marketPrice(candle.close, data.pair)}</strong></p>
      <MarketChart candles={visibleCandles} levels={[...levels, ...positionLevels]} label="Solo velas reveladas; precios medios" onSelect={price => setLevelPrice(marketPrice(Math.max(settings.pipSize, price), data.pair))} />
      <div className="tool-actions"><Button onClick={step} disabled={!simulation || atEnd}><SkipForward size={16} />Siguiente vela</Button><Button variant="secondary" disabled={!simulation || atEnd} onClick={() => { clearFeedback(); setPlaying(value => !value); }}>{playing ? <Pause size={16} /> : <Play size={16} />}{playing ? "Pausar" : "Reproducir"}</Button><label className="small muted">Velocidad <select aria-label="Velocidad de reproducción" value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value={2000}>1 vela / 2 s</option><option value={1000}>1 vela / s</option><option value={400}>2,5 velas / s</option></select></label><Button variant="ghost" onClick={() => { setPlaying(false); setReplacement("reset"); }} disabled={!simulation}><RotateCcw size={15} />Reiniciar</Button></div>
      {atEnd && simulation && <p className="tool-explanation">Has llegado al final de la serie. No hay una siguiente apertura para ejecutar nuevas órdenes o cierres manuales. Las posiciones que queden abiertas conservan su valoración en el último cierre. Guarda la sesión o reinicia para practicar de nuevo.</p>}
      <details><summary className="small muted">Marcar soportes y resistencias</summary><form onSubmit={addLevel}><div className="tool-fields"><label>Etiqueta<input maxLength={60} required value={levelLabel} onChange={event => setLevelLabel(event.target.value)} /></label><label>Precio de la línea<input type="number" step="any" min={0.00000001} max={1e6} required value={levelPrice} onChange={event => setLevelPrice(event.target.value)} /></label></div><p className="small muted">Pulsa el gráfico para llevar un precio al formulario.</p><Button type="submit" variant="secondary" disabled={levels.length >= 30}><Plus size={14} />Añadir línea</Button></form><ul className="analytics-list">{levels.map(level => <li key={level.id}><span>{level.label} · {marketPrice(level.price, data.pair)}</span><Button variant="ghost" aria-label={`Eliminar línea ${level.label}`} onClick={() => setLevels(previous => previous.filter(item => item.id !== level.id))}><Trash2 size={14} /></Button></li>)}</ul></details>
    </section><section className="panel tool-panel"><p className="eyebrow">TICKET DE PRÁCTICA</p><h2>Preparar una orden</h2><form onSubmit={sendOrder}><div className="tool-fields"><label>Dirección<select disabled={!simulation} value={side} onChange={event => setSide(event.target.value as TradeSide)}><option value="buy">Compra</option><option value="sell">Venta</option></select></label><label>Tipo<select disabled={!simulation} value={orderType} onChange={event => setOrderType(event.target.value as OrderType)}><option value="market">Mercado</option><option value="limit">Limitada</option><option value="stop">Stop de entrada</option></select></label><label className="field-wide">Unidades de divisa base<input type="number" required disabled={!simulation} min={settings.minLot * settings.contractSize} max={settings.maxLots * settings.contractSize} step={settings.lotStep * settings.contractSize} value={units} onChange={event => setUnits(event.target.value)} /><small>{Number.isFinite(Number(units) / settings.contractSize) ? Number(units) / settings.contractSize : "—"} lotes · contrato de {accountMoney(settings.contractSize)} unidades</small></label>{orderType !== "market" && <label className="field-wide">Precio de entrada {orderType === "limit" ? "limitada" : "stop"}<input required disabled={!simulation} type="number" step="any" min={0.00000001} value={orderPrice} onChange={event => setOrderPrice(event.target.value)} /></label>}<label>Stop loss (opcional)<input disabled={!simulation} type="number" min={0.00000001} step="any" value={stop} onChange={event => setStop(event.target.value)} /></label><label>Take profit (opcional)<input disabled={!simulation} type="number" min={0.00000001} step="any" value={target} onChange={event => setTarget(event.target.value)} /></label></div><Button type="submit" disabled={!simulation || atEnd || playing}>Enviar orden de práctica</Button></form><p className="tool-explanation">Pausa la reproducción para decidir. Mercado y cierres manuales se ejecutan en la siguiente apertura disponible; las órdenes limitadas y stop empiezan a evaluarse en la siguiente vela. Se aplica spread, deslizamiento y comisión. Una orden puede ser rechazada por margen o límites del contrato.</p><p className="tool-explanation">Si el stop y el objetivo aparecen dentro de una misma vela OHLC, se elige el stop y se registra la ambigüedad. Este modelo no conoce la secuencia intravela.</p></section></div>}
    {replacement && <section className="panel tool-panel" role="alertdialog" aria-labelledby="replace-session-title"><h2 id="replace-session-title">{replacement === "reset" ? "Reiniciar la sesión actual" : `Abrir «${replacement.name}»`}</h2><p>Se sustituirá el estado abierto, incluidas posiciones, órdenes y marcas. Solo podrás recuperar los avances que hayas guardado.</p><div className="tool-actions"><Button variant="secondary" onClick={replaceCurrent}>Confirmar {replacement === "reset" ? "reinicio" : "cambio de sesión"}</Button><Button variant="ghost" onClick={() => setReplacement(null)}>Cancelar</Button></div></section>}
    {simulation && <>
      <section className="panel tool-panel"><h2>Posiciones abiertas · {simulation.positions.length}</h2>{simulation.positions.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Posición</th><th>Entrada</th><th>Stop / objetivo</th><th>Margen USD</th><th>Acción</th></tr></thead><tbody>{simulation.positions.map(position => <tr key={position.id}><td>{position.side === "buy" ? "Compra" : "Venta"} · {position.lots} lotes<small>{position.id}</small></td><td>{marketPrice(position.entryPrice, data.pair)}</td><td>{position.stopLoss ? marketPrice(position.stopLoss, data.pair) : "Sin stop"} / {position.takeProfit ? marketPrice(position.takeProfit, data.pair) : "Sin objetivo"}</td><td>{accountMoney(position.margin)}</td><td><Button variant="secondary" disabled={atEnd || playing || simulation.orders.some(order => order.positionId === position.id)} onClick={() => requestClose(position.id)}>Cerrar en próxima apertura</Button></td></tr>)}</tbody></table></div> : <p className="muted">Sin posiciones abiertas.</p>}<h3>Órdenes pendientes · {simulation.orders.length}</h3>{simulation.orders.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Orden</th><th>Dirección / tamaño</th><th>Precio</th><th>Acción</th></tr></thead><tbody>{simulation.orders.map(order => <tr key={order.id}><td>{order.action === "close" ? "Cierre a mercado" : order.type === "market" ? "Mercado" : order.type === "limit" ? "Limitada" : "Stop de entrada"}<small>{order.id}</small></td><td>{order.side === "buy" ? "Compra" : "Venta"} · {order.lots} lotes</td><td>{order.price ? marketPrice(order.price, data.pair) : "Próxima apertura"}</td><td><Button variant="ghost" disabled={playing} onClick={() => cancel(order.id)}>Cancelar orden</Button></td></tr>)}</tbody></table></div> : <p className="muted">Sin órdenes pendientes.</p>}</section>
      <TradeHistory trades={simulation.trades} settings={simulation.settings} onJournal={trade => void sendToJournal(trade)} />
      <section className="panel tool-panel"><h2>Equity de esta sesión</h2><EquityChart values={simulation.equityCurve.map(point => point.equity)} label="Equity en USD, después de costes y financiación" />{simulation.equityCurve.length < 2 && <p className="muted">Avanza al menos dos velas para ver la curva.</p>}<details><summary className="small muted">Registro de ejecución</summary><ul className="analytics-list">{simulation.events.slice(-40).reverse().map(event => <li key={event.id}><span>{event.message}<small>{utcLabel(event.time)}</small></span></li>)}</ul>{!simulation.events.length && <p className="muted">Todavía no hay eventos.</p>}</details></section>
    </>}
    <section className="panel tool-panel"><div className="panel-heading"><h2>Guardar y continuar</h2><Save size={19} /></div><p>Las sesiones se guardan en este navegador. Usa las copias JSON de Ajustes para trasladarlas a otro equipo. Los avances se conservan cuando pulsas Guardar.</p><div className="tool-fields"><label>Nombre de la sesión<input maxLength={100} value={sessionName} onChange={event => setSessionName(event.target.value)} /></label></div><div className="tool-actions"><Button disabled={!simulation || busy || !sessionName.trim()} onClick={() => void save()}><Save size={15} />{busy ? "Guardando…" : savedId ? "Guardar cambios" : "Guardar sesión"}</Button>{savedId && <Button disabled={!simulation || busy || !sessionName.trim()} variant="secondary" onClick={() => void save(true)}>Guardar otra copia</Button>}<Button disabled={!simulation} variant="ghost" onClick={() => { try { downloadText(JSON.stringify(currentSession(), null, 2), `${mode}-practica.json`, "application/json"); } catch (cause) { setError(errorMessage(cause, "No se pudo exportar.")); } }}><Download size={15} />Exportar sesión JSON</Button></div>{invalidSessions > 0 && <p className="form-error">Hay {invalidSessions} sesiones incompatibles que se han conservado sin abrir. Exporta una copia desde Ajustes antes de revisar sus datos.</p>}{savedSessions.length ? <ul className="analytics-list">{savedSessions.map(saved => <li key={saved.id}><span>{saved.name}<small>{saved.data.pair} · {saved.data.kind === "simulated" ? "SIMULADO" : "CSV importado"} · guardada {utcLabel(saved.updatedAt)}</small></span><div><div className="tool-actions"><Button variant="secondary" disabled={busy} onClick={() => { setPlaying(false); if (simulation || levels.length) setReplacement(saved); else loadSession(saved); }}>Abrir sesión</Button><Button variant="ghost" aria-label={`Eliminar sesión ${saved.name}`} onClick={() => setDeleting(saved.id)}><Trash2 size={15} /></Button></div>{deleting === saved.id && <div className="delete-confirmation"><p>Eliminar esta copia guardada de la sesión.</p><Button variant="secondary" onClick={() => void deleteSession(saved.id)}>Confirmar eliminación</Button><Button variant="ghost" onClick={() => setDeleting(undefined)}>Cancelar</Button></div>}</div></li>)}</ul> : <p className="muted">Aún no has guardado sesiones de {mode === "replay" ? "replay" : "simulación"}.</p>}</section>
  </div>;
}
