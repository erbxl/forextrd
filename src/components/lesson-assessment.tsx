"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowRight, Check, CheckCircle2, CircleHelp, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import { completeLesson, saveAttempt } from "@/modules/progress/service";
import { nextUnit } from "@/modules/academy/progression";
import type { AssessmentResult, PublicQuestion } from "@/modules/academy/types";
import { useLearning } from "@/components/learning-provider";
import { ExerciseChart } from "@/components/exercise-chart";
import { Button } from "@/components/ui/button";

function OrderAnswer({question,value,onChange}:{question:PublicQuestion;value?:string;onChange:(value:string)=>void}) {
  const steps = value ? value.split(" | ") : question.options ?? [];
  const [dragged,setDragged] = useState<number | null>(null);
  function move(from:number,to:number) { const copy=[...steps]; const [step]=copy.splice(from,1); copy.splice(to,0,step); onChange(copy.join(" | ")); }
  return <div className="order-answer"><p className="small muted">Ordena los pasos con las flechas o arrastrándolos. Después confirma el orden.</p><ol>{steps.map((step,index)=><li key={step} draggable onDragStart={()=>setDragged(index)} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();if(dragged!==null)move(dragged,index);setDragged(null);}}><span>{step}</span><button type="button" className="icon-button" disabled={index===0} aria-label={`Subir ${step}`} onClick={()=>move(index,index-1)}><ArrowUp size={16}/></button><button type="button" className="icon-button" disabled={index===steps.length-1} aria-label={`Bajar ${step}`} onClick={()=>move(index,index+1)}><ArrowDown size={16}/></button></li>)}</ol><Button type="button" variant="secondary" onClick={()=>onChange(steps.join(" | "))}>{value ? "Orden confirmado" : "Confirmar orden"}<Check size={15}/></Button></div>;
}

export function LessonAssessment({slug,questions,passingScore,alreadyPassed,completed,isExam=false}:{slug:string;questions:PublicQuestion[];passingScore:number;alreadyPassed:boolean;completed:boolean;isExam?:boolean}) {
  const {progress}=useLearning();
  const [answers,setAnswers]=useState<Record<string,string>>({});
  const [result,setResult]=useState<AssessmentResult|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [acknowledged,setAcknowledged]=useState(false);
  const [finished,setFinished]=useState(completed);
  useEffect(()=>{setFinished(completed);},[completed]);
  const canComplete=alreadyPassed || result?.passed;
  const required=questions.some(question=>question.required);
  const next=nextUnit((progress?.lessons ?? []).map(item=>item.slug===slug && finished ? {...item,completedAt:item.completedAt ?? new Date().toISOString()} : item));
  function answer(id:string,value:string) { setAnswers(previous=>({...previous,[id]:value}));setResult(null); }
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setError("");setBusy(true);
    const payload=Object.fromEntries(questions.map(question=>[question.id,question.type==="number" ? Number((answers[question.id] ?? "").trim().replace(",",".")) : answers[question.id]]));
    try {setResult(await saveAttempt(slug,payload));} catch(cause) {setError(cause instanceof Error ? cause.message : "No se pudieron guardar tus respuestas.");} finally {setBusy(false);}
  }
  async function complete() {
    setBusy(true);setError("");
    try {await completeLesson(slug,acknowledged);setFinished(true);} catch(cause) {setError(cause instanceof Error ? cause.message : "No se pudo guardar la finalización.");} finally {setBusy(false);}
  }
  return <section id="evaluacion" className="assessment-section"><div className="lesson-section-title"><span className="section-count">{isExam ? "EXAMEN" : "PRÁCTICA"}</span><h2>{isExam ? "Evaluación de nivel" : "Demuestra lo que has aprendido"}</h2></div><p className="muted">Responde las {questions.length} preguntas. Necesitas al menos un {passingScore}% ({Math.ceil(questions.length*passingScore/100)} aciertos){required ? " y acertar todas las preguntas obligatorias" : ""}. Puedes repetir para aprender.</p>
    <form onSubmit={submit}><div className="question-list">{questions.map((question,index)=>{
      const feedback=result?.feedback.find(item=>item.questionId===question.id);
      return <fieldset key={question.id} className={`question-card ${feedback ? feedback.correct ? "question-correct" : "question-incorrect" : ""}`}><legend><span className="question-number">{String(index+1).padStart(2,"0")}</span>{question.prompt}</legend><div className="question-meta"><span>{question.concept}</span>{question.required && <span className="tag tag-amber">OBLIGATORIA</span>}</div>
        {question.chart && <ExerciseChart chart={question.chart}/>}
        {question.type==="order" ? <OrderAnswer question={question} value={answers[question.id]} onChange={value=>answer(question.id,value)}/> : question.type==="number" || question.type==="text" ? <label className="numeric-answer"><span>{question.type==="number" ? `Tu resultado (${question.unit ?? "unidades"})` : "Completa el concepto"}</span><input required inputMode={question.type==="number" ? "decimal" : "text"} type="text" pattern={question.type==="number" ? "-?[0-9]+([.,][0-9]+)?" : undefined} maxLength={200} autoComplete="off" placeholder="Escribe tu respuesta" value={answers[question.id] ?? ""} onChange={event=>answer(question.id,event.target.value)}/><small>{question.type==="number" ? "Respeta las unidades y el redondeo solicitados. Se acepta coma o punto decimal." : "Se aceptan mayúsculas, minúsculas y diferencias de acentuación."}</small></label> : <div className="answer-options">{question.options?.map((option,optionIndex)=><label key={option} className={`answer-option ${answers[question.id]===option ? "answer-selected" : ""}`}><input required type="radio" name={question.id} value={option} checked={answers[question.id]===option} onChange={()=>answer(question.id,option)}/><span className="option-letter">{String.fromCharCode(65+optionIndex)}</span><span>{option}</span>{answers[question.id]===option && <Check size={16}/>}</label>)}</div>}
        {feedback && <div className={`answer-feedback ${feedback.correct ? "feedback-correct" : "feedback-incorrect"}`}><strong>{feedback.correct ? "Respuesta correcta" : "Revisa este concepto"}</strong><p>{feedback.explanation}</p>{!feedback.correct && <p>Respuesta de referencia: <b>{feedback.correctAnswer}{question.unit ? ` ${question.unit}` : ""}</b></p>}</div>}</fieldset>;
    })}</div><Button type="submit" disabled={busy || questions.some(question=>!answers[question.id]?.trim())}>{busy ? "Guardando…" : result ? "Volver a evaluar" : "Corregir y guardar respuestas"}{result ? <RotateCcw size={16}/> : <ArrowRight size={16}/>}</Button></form>
    {error && <p className="form-error" role="alert"><TriangleAlert size={17}/>{error}</p>}
    {result && <div className={`assessment-result ${result.passed ? "result-passed" : "result-review"}`} role="status"><div className="score-circle">{result.score}<span>%</span></div><div><h3>{result.passed ? "Evaluación superada" : "Cada intento también enseña"}</h3><p>{result.correctCount} de {result.totalCount} respuestas correctas. {result.passed ? "Tu resultado está guardado. Confirma la revisión para completar esta unidad." : "Revisa las explicaciones y vuelve a probar."}</p></div></div>}
    <div className="completion-card">{finished ? <><CheckCircle2 size={28}/><div><h3>{isExam ? "Nivel completado" : "Lección completada"}</h3><p>{isExam ? next ? "El siguiente nivel ya está desbloqueado. Tu progreso se ha guardado." : "Has completado los 13 niveles y sus exámenes. Puedes volver a repasar cualquier unidad." : "Tu avance está guardado. Completa las unidades de este nivel y su examen para abrir el siguiente."}</p>{next ? <Link href={`/academia/${next.slug}`} className="text-link">Continuar: {next.title}<ArrowRight size={15}/></Link> : <Link href="/progreso" className="text-link">Ver mi progreso<ArrowRight size={15}/></Link>}</div></> : <><ShieldCheck size={28}/><div><h3>{isExam ? "Completa el nivel" : "Consolida lo aprendido"}</h3><p>{canComplete ? "Ya has superado la evaluación. Confirma la revisión para registrar la finalización." : "Al superar la evaluación, podrás registrar la finalización."}</p><label className="read-acknowledgement"><input type="checkbox" checked={acknowledged} onChange={event=>setAcknowledged(event.target.checked)}/>He estudiado la explicación y revisado mis respuestas.</label><Button onClick={complete} disabled={!canComplete || !acknowledged || busy} variant="secondary">{isExam ? "Completar nivel" : "Completar lección"}<CheckCircle2 size={16}/></Button></div></>}</div><p className="assessment-note"><CircleHelp size={15}/>La evaluación comprueba el temario. No acredita preparación para operar con dinero real.</p>
  </section>;
}
