"use client";

import { useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { SectionHeading } from "@/components/section-heading";
import { StorageStatus, useLearning } from "@/components/learning-provider";
import { Button } from "@/components/ui/button";
import { getDatabase } from "@/modules/storage/db";
import type { StoredPracticeAttempt } from "@/modules/storage/types";
import { generatePractice, nextPracticeDifficulty, practiceFamilies, type PracticeExercise, type PracticeFamily } from "@/modules/exercises/practice";
import { savePracticeAttempt } from "@/modules/exercises/practice-storage";

export default function PracticePage() {
  const { progress } = useLearning();
  const [history, setHistory] = useState<StoredPracticeAttempt[]>([]);
  const [ready, setReady] = useState(false);
  const [family, setFamily] = useState<PracticeFamily>("pips");
  const [exercise, setExercise] = useState<PracticeExercise | null>(null);
  const [response, setResponse] = useState("");
  const [result, setResult] = useState<StoredPracticeAttempt | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const available = Boolean(progress);
  useEffect(() => {
    if (!available) return;
    const subscription = liveQuery(() => getDatabase().practiceAttempts.toArray()).subscribe({
      next: rows => { setHistory(rows); setReady(true); },
      error: () => setError("No se ha podido leer el historial de práctica."),
    });
    return () => subscription.unsubscribe();
  }, [available]);
  const difficulty = nextPracticeDifficulty(history, family);
  function next() {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    setExercise(generatePractice(family, seed, difficulty)); setResponse(""); setResult(null); setError("");
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!exercise || busy || result) return;
    setBusy(true); setError("");
    try {
      if (!response.trim()) throw new Error("Escribe tu resultado antes de corregir.");
      const attempt = await savePracticeAttempt({ ...exercise, response: Number(response.replace(",", ".")) });
      setResult(attempt);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar el intento."); }
    finally { setBusy(false); }
  }
  if (!progress) return <StorageStatus />;
  const selectedHistory = history.filter(item => item.family === family);
  return <div className="page-enter">
    <SectionHeading eyebrow="ENTRENA CON VARIANTES" title="Práctica deliberada" description="Nuevos números, el mismo razonamiento. Resuelve, comprueba los pasos y vuelve a practicar." />
    <div className="calculator-layout"><nav className="panel calculator-nav" aria-label="Familias de ejercicios">{practiceFamilies.map((item, index) => <button key={item.id} className={family === item.id ? "selected" : ""} aria-pressed={family === item.id} disabled={busy} onClick={() => { setFamily(item.id); setExercise(null); setResult(null); setError(""); }}><span>0{index + 1}</span>{item.title}</button>)}</nav>
      <section className="panel tool-panel"><span className="tag tag-green">DIFICULTAD {difficulty} / 3</span><h2>{practiceFamilies.find(item => item.id === family)!.title}</h2><p>{practiceFamilies.find(item => item.id === family)!.description}</p>
        <p className="small muted">{selectedHistory.length} intentos · {selectedHistory.filter(item => item.correct).length} aciertos. Tres aciertos consecutivos suben la dificultad; dos errores la reducen. Cada familia tiene su propio recorrido.</p>
        {exercise && <form onSubmit={submit}><h3>{exercise.title}</h3><p className="tool-explanation">{exercise.prompt}</p><div className="tool-fields"><label>Tu respuesta ({exercise.unit})<input required inputMode="decimal" value={response} disabled={busy || Boolean(result)} onChange={event => setResponse(event.target.value)} /></label></div><p className="small muted">Tolerancia: ±{exercise.tolerance} {exercise.unit}. Puedes usar coma o punto decimal.</p><Button type="submit" disabled={busy || Boolean(result)}>{busy ? "Guardando…" : "Corregir respuesta"}</Button></form>}
        {result && exercise && <div className="calculation-results" role="status"><strong>{result.correct ? "Respuesta correcta" : "Vamos a revisar el cálculo"}</strong><p>{exercise.explanation}</p><p>Resultado: {exercise.answer.toLocaleString("es-ES", { maximumFractionDigits: 5 })} {exercise.unit}. Tu respuesta: {result.response.toLocaleString("es-ES")}.</p></div>}
        <div className="tool-actions"><Button variant={exercise ? "secondary" : "default"} disabled={!ready || busy} onClick={next}>{exercise ? "Generar otro ejercicio" : "Generar ejercicio"}</Button></div>
        {error && <p role="alert" className="form-error">{error}</p>}
        <p className="tool-explanation">Escenarios numéricos didácticos. Esta práctica se guarda en tus copias de seguridad y es independiente de los exámenes que desbloquean niveles.</p>
      </section></div>
    <section className="panel tool-panel"><h2>Últimos intentos</h2>{!history.length ? <p>Tu historial aparecerá al corregir el primer ejercicio.</p> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Fecha</th><th>Familia</th><th>Dificultad</th><th>Resultado</th></tr></thead><tbody>{[...history].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20).map(item => <tr key={item.id}><td>{new Date(item.createdAt).toLocaleString("es-ES")}</td><td>{practiceFamilies.find(f => f.id === item.family)!.title}</td><td>{item.difficulty}</td><td>{item.correct ? "Correcto" : "A repasar"}</td></tr>)}</tbody></table></div>}</section>
  </div>;
}
