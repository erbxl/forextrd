"use client";

import { useEffect, useState } from "react";
import { completeLesson, saveAttempt } from "@/modules/progress/service";
import Link from "next/link";
import { ArrowRight, Check, CheckCircle2, CircleHelp, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import type { AssessmentResult, PublicQuestion } from "@/modules/academy/types";
import { Button } from "@/components/ui/button";

export function LessonAssessment({ slug, questions, passingScore, alreadyPassed, completed }: { slug: string; questions: PublicQuestion[]; passingScore: number; alreadyPassed: boolean; completed: boolean }) {
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [finished, setFinished] = useState(completed);
  useEffect(() => { setFinished(completed); },[completed]);
  const canComplete = alreadyPassed || result?.passed;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const payload = Object.fromEntries(questions.map(question => [question.id, question.type === "number" ? Number((answers[question.id] ?? "").trim().replace(",", ".")) : answers[question.id]]));
    try {
      const data = await saveAttempt(slug,payload);
      setResult(data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar en este navegador. Vuelve a intentarlo."); }
    finally { setBusy(false); }
  }
  async function complete() {
    setBusy(true); setError("");
    try {
      await completeLesson(slug,acknowledged);
      setFinished(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar en este navegador. Vuelve a intentarlo."); }
    finally { setBusy(false); }
  }
  return <section id="evaluacion" className="assessment-section"><div className="lesson-section-title"><span className="section-count">PRÁCTICA</span><h2>Demuestra lo que has aprendido</h2></div><p className="muted">Responde las 5 preguntas. Necesitas al menos un {passingScore}% y resolver correctamente el cálculo de poder adquisitivo. Puedes repetir sin límite de intentos de aprendizaje.</p>
    <form onSubmit={submit}><div className="question-list">{questions.map((question,index) => {
      const feedback = result?.feedback.find(item => item.questionId === question.id);
      return <fieldset key={question.id} className={`question-card ${feedback ? feedback.correct ? "question-correct" : "question-incorrect" : ""}`}><legend><span className="question-number">{String(index+1).padStart(2,"0")}</span>{question.prompt}</legend><div className="question-meta"><span>{question.concept}</span>{question.required && <span className="tag tag-amber">CÁLCULO OBLIGATORIO</span>}</div>{question.type === "number" ? <label className="numeric-answer"><span>Tu resultado ({question.unit ?? "unidades"})</span><input required inputMode="decimal" type="text" pattern="[0-9]+([.,][0-9]+)?" placeholder="Escribe tu respuesta" value={answers[question.id] ?? ""} onChange={event => {setAnswers({...answers,[question.id]:event.target.value});setResult(null);}}/><small>Redondea a dos decimales. Puedes usar coma o punto.</small></label> : <div className="answer-options">{question.options?.map((option,optionIndex) => <label key={option} className={`answer-option ${answers[question.id] === option ? "answer-selected" : ""}`}><input required type="radio" name={question.id} value={option} checked={answers[question.id] === option} onChange={() => {setAnswers({...answers,[question.id]:option});setResult(null);}}/><span className="option-letter">{String.fromCharCode(65+optionIndex)}</span><span>{option}</span>{answers[question.id] === option && <Check size={16}/>}</label>)}</div>}{feedback && <div className={`answer-feedback ${feedback.correct ? "feedback-correct" : "feedback-incorrect"}`}><strong>{feedback.correct ? "Respuesta correcta" : "Revisa este concepto"}</strong><p>{feedback.explanation}</p>{!feedback.correct && <p>Respuesta de referencia: <b>{feedback.correctAnswer}{question.unit ? ` ${question.unit}` : ""}</b></p>}</div>}</fieldset>;
    })}</div><Button type="submit" disabled={busy || questions.some(question => !answers[question.id]?.trim())}>{busy ? "Guardando…" : result ? "Volver a evaluar" : "Corregir y guardar respuestas"}{result ? <RotateCcw size={16}/> : <ArrowRight size={16}/>}</Button></form>
    {error && <p className="form-error" role="alert"><TriangleAlert size={17}/>{error}</p>}
    {result && <div className={`assessment-result ${result.passed ? "result-passed" : "result-review"}`} role="status"><div className="score-circle">{result.score}<span>%</span></div><div><h3>{result.passed ? "Evaluación superada" : "Cada intento también enseña"}</h3><p>{result.correctCount} de {result.totalCount} respuestas correctas. {result.passed ? "Tu resultado está guardado. Ya puedes completar la lección." : "Revisa las explicaciones y vuelve a probar. El cálculo obligatorio también debe ser correcto."}</p></div></div>}
    <div className="completion-card">{finished ? <><CheckCircle2 size={28}/><div><h3>Lección completada</h3><p>Has demostrado las competencias de esta lección. El resto del nivel 0 sigue en desarrollo.</p><Link href="/progreso" className="text-link">Ver mi progreso<ArrowRight size={15}/></Link></div></> : <><ShieldCheck size={28}/><div><h3>Consolida tu primer paso</h3><p>{canComplete ? "Ya has superado la evaluación. Confirma la lectura para registrar esta lección como completada." : "Al superar la evaluación, podrás marcar la lectura como completada."}</p><label className="read-acknowledgement"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)}/>He estudiado la explicación y revisado mis respuestas.</label><Button onClick={complete} disabled={!canComplete || !acknowledged || busy} variant="secondary">Completar lección<CheckCircle2 size={16}/></Button></div></>}</div><p className="assessment-note"><CircleHelp size={15}/>La evaluación mide estos conceptos concretos. No acredita preparación para operar.</p>
  </section>;
}
