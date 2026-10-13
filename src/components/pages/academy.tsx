"use client";

import { AcademyCatalog } from "@/components/academy-catalog";
import { SectionHeading } from "@/components/section-heading";
import { StorageStatus, useLearning } from "@/components/learning-provider";

export default function AcademyPage() {
  const {progress} = useLearning();
  if(!progress) return <StorageStatus/>;
  return <div className="page-enter"><SectionHeading eyebrow="UN RECORRIDO CON PROPÓSITO" title="Empieza por entender." description="13 niveles para estudiar, practicar y comprobar lo aprendido. Cada examen abre el siguiente paso."/><AcademyCatalog progress={progress}/></div>;
}
