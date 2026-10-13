"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, Clock3, LockKeyhole, Search, GraduationCap } from "lucide-react";
import { curriculum, getModuleLessons, lessons } from "@/modules/academy/content";
import { getModuleProgress, nextUnit } from "@/modules/academy/progression";
import type { ProgressSnapshot } from "@/modules/progress/types";
import { Button } from "@/components/ui/button";

const normalize=(value:string)=>value.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g,"");

export function AcademyCatalog({progress}:{progress:ProgressSnapshot}) {
  const [query,setQuery]=useState("");
  const [expanded,setExpanded]=useState<number[]>([nextUnit(progress.lessons)?.moduleId ?? 0]);
  const states=getModuleProgress(progress.lessons);
  const filtered=curriculum.filter(module=>normalize(`${module.title} ${module.topics.join(" ")} ${getModuleLessons(module.id).map(lesson=>`${lesson.title} ${lesson.relatedConcepts.join(" ")}`).join(" ")}`).includes(normalize(query)));
  return <><div className="catalog-toolbar"><div className="catalog-summary"><span className="tag tag-green">{lessons.length} LECCIONES · 13 NIVELES</span><Link href="/glosario" className="text-link">Consultar el glosario<ArrowRight size={15}/></Link></div><label className="search-input"><Search size={17}/><span className="sr-only">Buscar niveles o conceptos</span><input placeholder="Buscar un concepto…" value={query} onChange={event=>setQuery(event.target.value)}/></label></div>
    <p className="content-note">Completa las 8 lecciones y el examen de cada nivel para desbloquear el siguiente. Tu primera lección y todos sus intentos anteriores se conservan.</p><div className="module-list">{filtered.length===0 && <div className="empty-state panel"><Search size={30}/><h2>No encontramos ese concepto</h2><Button variant="secondary" onClick={()=>setQuery("")}>Ver todos los niveles</Button></div>}{filtered.map(module=>{
      const state=states[module.id];const units=getModuleLessons(module.id);const open=query.length>0 || expanded.includes(module.id);
      return <section id={`nivel-${module.id}`} key={module.id} className={`panel module-card ${state.unlocked ? "module-available" : ""}`}><div className="module-number">{String(module.id).padStart(2,"0")}</div><div className="module-content"><div className="module-header"><span className="eyebrow">NIVEL {module.id}</span><span className={`tag ${state.unlocked ? "tag-green" : ""}`}>{state.completed ? "COMPLETADO" : state.unlocked ? "DESBLOQUEADO" : "BLOQUEADO"}</span></div><h2>{module.title}</h2><p>{module.description}</p><div className="topic-list">{module.topics.map(topic=><span key={topic}>{topic}</span>)}</div><div className="module-progress"><span>{state.completedLessons} / {state.totalLessons} lecciones · {state.completed ? "examen superado" : "examen pendiente"}</span><div className="progress-track"><span style={{width:`${(state.completedLessons+(state.completed ? 1 : 0))/(state.totalLessons+1)*100}%`}}/></div></div>
        {!state.unlocked && <p className="module-lock"><LockKeyhole size={14}/>Se abre al completar el nivel {module.id-1}, incluido su examen.</p>}
        <button className="text-link catalog-toggle" aria-expanded={open} aria-controls={`units-${module.id}`} onClick={()=>setExpanded(previous=>expanded.includes(module.id) ? previous.filter(id=>id!==module.id) : [...previous,module.id])}>{open ? "Ocultar lecciones" : "Ver las 8 lecciones y el examen"}<ArrowRight size={15}/></button>
        {open && <div id={`units-${module.id}`} className="module-lessons">{units.map((lesson,index)=>{
          const done=progress.lessons.find(item=>item.slug===lesson.slug)?.completedAt;
          const content=<><span className="published-lesson-icon">{done ? <CheckCircle2 size={20}/> : <BookOpen size={20}/>}</span><div><strong>{String(index+1).padStart(2,"0")}. {lesson.title}</strong><span><Clock3 size={12}/>{lesson.durationMinutes} min · {lesson.questions.length} preguntas · {done ? "Superada" : "Por estudiar"}</span></div>{state.unlocked ? <ArrowRight size={18}/> : <LockKeyhole size={16}/>}</>;
          return state.unlocked ? <Link key={lesson.slug} href={`/academia/${lesson.slug}`} className="published-lesson">{content}</Link> : <div key={lesson.slug} className="published-lesson locked-lesson">{content}</div>;
        })}{state.examReady ? <Link className="published-lesson exam-link" href={`/academia/${state.examSlug}`}><GraduationCap size={24}/><div><strong>Examen final del nivel {module.id}</strong><span>{state.completed ? "Superado · volver a practicar" : "Disponible · completa el nivel y continúa"}</span></div><ArrowRight size={18}/></Link> : <div className="published-lesson locked-lesson"><GraduationCap size={24}/><div><strong>Examen final del nivel {module.id}</strong><span>Requiere las {state.totalLessons} lecciones completadas</span></div><LockKeyhole size={16}/></div>}</div>}
      </div></section>;
    })}</div></>;
}
