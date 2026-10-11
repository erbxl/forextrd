"use client";

import { AcademyCatalog } from "@/components/academy-catalog";
import { SectionHeading } from "@/components/section-heading";
import { curriculum, firstLesson } from "@/modules/academy/content";
import { StorageStatus, useLearning } from "@/components/learning-provider";

export default function AcademyPage() {
  const {progress} = useLearning();
  if(!progress) return <StorageStatus/>;
  return <div className="page-enter"><SectionHeading eyebrow="UN RECORRIDO CON PROPÓSITO" title="Empieza por entender." description="De los fundamentos financieros a la evaluación de estrategias. Un concepto bien aprendido cada vez."/><AcademyCatalog modules={curriculum} lesson={{slug:firstLesson.slug,title:firstLesson.title,durationMinutes:firstLesson.durationMinutes}} completed={Boolean(progress.lessons.find(lesson => lesson.slug === firstLesson.slug)?.completedAt)}/></div>;
}
