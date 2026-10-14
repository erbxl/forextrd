"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { liveQuery } from "dexie";
import { ArrowUpRight, ChartNoAxesCombined, NotebookPen, Target } from "lucide-react";
import { getDatabase } from "@/modules/storage/db";
import { listTradingSessions } from "@/modules/trading-sessions/service";
import { accountMetrics } from "@/modules/simulator/engine";
import { getJournalEntries } from "@/modules/journal/service";

type Summary = { name: string; equity: number; time: string };
export function PracticeSummary() {
  const [summary, setSummary] = useState<{ account: Summary | null; journal: number; attempts: number } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const subscription = liveQuery(async () => {
      const [sessions, journal, attempts] = await Promise.all([listTradingSessions("simulator"), getJournalEntries(), getDatabase().practiceAttempts.count()]);
      const latest = sessions.sessions[0];
      return { account: latest ? { name: latest.name, equity: accountMetrics(latest.state, latest.data.candles[latest.state.index]).equity, time: latest.updatedAt } : null, journal: journal.length, attempts };
    }).subscribe({ next: value => { setSummary(value); setError(false); }, error: () => setError(true) });
    return () => subscription.unsubscribe();
  }, []);
  return <section className="next-steps"><div className="section-title"><h2>Tu práctica, en contexto</h2><span>REGISTROS DE ESTE NAVEGADOR</span></div>{error ? <p className="form-error">No se pudo leer el resumen de práctica. Revisa tus registros y conserva una copia desde Ajustes.</p> : !summary ? <p className="small muted">Cargando tu práctica…</p> : <div className="next-step-grid">
    <Link href="/simulador" className="step-card"><span className="step-card-icon"><ChartNoAxesCombined size={21}/></span><div><span className="small muted">CUENTA SIMULADA</span><h3>{summary.account ? `${summary.account.equity.toLocaleString("es-ES", { maximumFractionDigits: 2 })} USD de equity` : "Crea tu primera sesión"}</h3><p>{summary.account ? `${summary.account.name} · último guardado ${new Date(summary.account.time).toLocaleDateString("es-ES")}` : "Saldo virtual y condiciones configurables."}</p></div><ArrowUpRight size={17}/></Link>
    <Link href="/practica" className="step-card"><span className="step-card-icon blue"><Target size={21}/></span><div><span className="small muted">EJERCICIOS CON VARIANTES</span><h3>{summary.attempts} intentos de práctica</h3><p>Pips, tamaño de posición y expectativa.</p></div><ArrowUpRight size={17}/></Link>
    <Link href="/diario" className="step-card"><span className="step-card-icon amber"><NotebookPen size={21}/></span><div><span className="small muted">DIARIO Y DISCIPLINA</span><h3>{summary.journal} registros en tu diario</h3><p>Revisa tus decisiones y el cumplimiento del plan.</p></div><ArrowUpRight size={17}/></Link>
  </div>}</section>;
}
