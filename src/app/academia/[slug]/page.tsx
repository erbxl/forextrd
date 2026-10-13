import { notFound } from "next/navigation";
import { learningUnits, getLesson } from "@/modules/academy/content";
import LessonPage from "@/components/pages/lesson";

export const dynamicParams = false;
export function generateStaticParams() { return learningUnits.map(lesson => ({slug:lesson.slug})); }
export async function generateMetadata({params}:{params:Promise<{slug:string}>}) { const {slug} = await params; return {title:getLesson(slug)?.title ?? "Lección no encontrada"}; }
export default async function Page({params}:{params:Promise<{slug:string}>}) {
  const {slug} = await params;
  const lesson = getLesson(slug);
  if(!lesson) notFound();
  return <LessonPage lesson={lesson}/>;
}
