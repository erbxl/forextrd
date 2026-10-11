"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BookOpen, CheckCircle2, Clock3, ExternalLink, Flag, Lightbulb, ListChecks } from "lucide-react";
import type { Lesson } from "@/modules/academy/types";
import { StorageStatus, useLearning } from "@/components/learning-provider";
import { LessonAssessment } from "@/components/lesson-assessment";
import { PurchasingPowerChart } from "@/components/purchasing-power-chart";
import { StudyTracker } from "@/components/study-tracker";

export default function LessonPage({lesson}:{lesson:Lesson}) {
  const slug = lesson.slug;
  const {progress} = useLearning();
  if(!progress) return <StorageStatus/>;
  const state = progress.lessons.find(item => item.slug === slug);
  const publicQuestions = lesson.questions.map(({answer: _answer,tolerance: _tolerance,explanation: _explanation,...question}) => question);
  return <div className="lesson-page page-enter"><Link href="/academia" className="back-link"><ArrowLeft size={15}/>Volver a la academia</Link><div className="lesson-hero"><div className="hero-topline"><span className="tag tag-green">NIVEL 00</span><span className="eyebrow">FUNDAMENTOS FINANCIEROS</span>{state?.completedAt && <span className="tag tag-green"><CheckCircle2 size={12}/>SUPERADA</span>}</div><h1>{lesson.title}</h1><p>{lesson.subtitle}</p><div className="lesson-metadata"><span><Clock3 size={15}/>{lesson.durationMinutes} min de lectura estimada</span><span><ListChecks size={16}/>{lesson.questions.length} preguntas</span><span><BookOpen size={16}/>Sin conocimientos previos</span></div></div>
    <div className="lesson-layout"><article className="lesson-article"><section className="objectives-card"><Flag size={23}/><div><h2>Al terminar, podrás…</h2><ul>{lesson.objectives.map(objective => <li key={objective}>{objective}</li>)}</ul><p className="prerequisite"><strong>Antes de empezar:</strong> {lesson.prerequisites.join(" ")}</p></div></section>
      {lesson.sections.map((section,index) => <section key={section.id} id={section.id} className="lesson-text-section"><div className="lesson-section-title"><span className="section-count">{String(index+1).padStart(2,"0")}</span><h2>{section.title}</h2></div>{section.paragraphs.map((paragraph,i) => <p key={i}>{paragraph}</p>)}{section.takeaway && <aside className="takeaway"><Lightbulb size={18}/><p>{section.takeaway}</p></aside>}</section>)}
      <section id="ejemplo" className="worked-example"><span className="tag tag-amber">EJEMPLO NUMÉRICO SIMULADO</span><h2>{lesson.workedExample.title}</h2><p>{lesson.workedExample.scenario}</p><ol>{lesson.workedExample.steps.map(step => <li key={step}>{step}</li>)}</ol><div className="example-conclusion">{lesson.workedExample.conclusion}</div></section>
      <section className="panel lesson-chart"><div className="purchasing-comparison"><h3>La misma cantidad de euros, distinta capacidad de compra</h3><div><span>Precios iniciales</span><b>1.000 €</b><i style={{width:"100%"}}/></div><div><span>Tras una subida del 5%</span><b>952,38 €</b><i style={{width:"95.238%"}}/></div><p>Ambos valores están expresados en euros a precios iniciales. El saldo nominal se mantiene en 1.000 €.</p></div><PurchasingPowerChart full/></section>
      <section className="lesson-text-section" id="errores"><h2>Errores frecuentes</h2><div className="mistake-list">{lesson.commonMistakes.map(item => <div key={item.mistake}><h3>{item.mistake}</h3><p>{item.correction}</p></div>)}</div></section>
      <section className="lesson-summary" id="resumen"><h2>Lo que te llevas</h2><ul>{lesson.summary.map(item => <li key={item}><CheckCircle2 size={17}/><span>{item}</span></li>)}</ul><h3>Conecta estas ideas</h3><div className="topic-list">{lesson.relatedConcepts.map(concept => <span key={concept}>{concept}</span>)}</div></section>
      <LessonAssessment slug={slug} questions={publicQuestions} passingScore={lesson.passingScore} alreadyPassed={state?.passed ?? false} completed={Boolean(state?.completedAt)}/>
      <section className="lesson-text-section" id="fuentes"><h2>Contrasta y profundiza</h2><p>Contenido educativo original, con estas fuentes oficiales para contrastar los conceptos. Los supuestos numéricos de la lección son ejemplos didácticos.</p><div className="source-list">{lesson.sources.map(source => <a href={source.url} target="_blank" rel="noopener noreferrer" key={source.url}><ExternalLink size={17}/><div><strong>{source.title}</strong><span>{source.note}</span></div><ArrowUpRight size={16}/></a>)}</div></section>
    </article><aside className="lesson-toc"><div className="panel"><p className="eyebrow">EN ESTA LECCIÓN</p><nav aria-label="Índice de la lección">{lesson.sections.map((section,index) => <a key={section.id} href={`#${section.id}`}><span>{String(index+1).padStart(2,"0")}</span>{section.title}</a>)}<a href="#ejemplo"><span>↳</span>Ejemplo paso a paso</a><a href="#resumen"><span>↳</span>Resumen</a><a href="#evaluacion" className="toc-assessment"><ListChecks size={15}/>Practicar y evaluar</a><a href="#fuentes"><ExternalLink size={14}/>Fuentes oficiales</a></nav></div><div className="criteria-card"><ShieldCheckIcon/><h3>Un aprendizaje demostrable</h3><ul>{lesson.completionCriteria.map(item => <li key={item}>{item}</li>)}</ul></div><StudyTracker/></aside></div>
  </div>;
}
function ShieldCheckIcon() { return <CheckCircle2 size={21} className="accent"/>; }
