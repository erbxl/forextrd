import { AcademyCatalog } from "@/components/academy-catalog";
import { SectionHeading } from "@/components/section-heading";
import { curriculum, firstLesson } from "@/modules/academy/content";
import { getProgress } from "@/modules/progress/service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Academia" };
export default async function AcademyPage() {
  const progress = await getProgress();
  return <div className="page-enter"><SectionHeading eyebrow="UN RECORRIDO CON PROPÓSITO" title="Empieza por entender." description="De los fundamentos financieros a la evaluación de estrategias. Un concepto bien aprendido cada vez."/><AcademyCatalog modules={curriculum} lesson={{slug:firstLesson.slug,title:firstLesson.title,durationMinutes:firstLesson.durationMinutes}} completed={Boolean(progress.lessons.find(lesson => lesson.slug === firstLesson.slug)?.completedAt)}/></div>;
}
