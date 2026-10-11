import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, Construction, Layers3 } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import { firstLesson } from "@/modules/academy/content";

const roadmap: Record<string,{title:string;phase:number;description:string;features:string[]}> = {
  herramientas:{title:"Calculadoras financieras",phase:3,description:"Entender cada fórmula antes de tomar una decisión.",features:["Pips, valor del pip y tamaño de posición","Riesgo, margen y costes con unidades explícitas","Pruebas matemáticas con resultados de referencia"]},
  simulador:{title:"Simulador de trading",phase:4,description:"Un futuro espacio para practicar solo con capital ficticio.",features:["Órdenes y posiciones en una cuenta demo","Costes, spread y margen calculados","Políticas explícitas para ambigüedades de ejecución OHLC"]},
  replay:{title:"Trading Replay",phase:5,description:"Aprender a decidir sin conocer la siguiente vela.",features:["Avance y pausa de datos históricos importados","Indicadores calculados únicamente con datos disponibles","Sesiones de práctica y decisiones guardadas"]},
  backtesting:{title:"Laboratorio de backtesting",phase:5,description:"Convertir hipótesis en pruebas reproducibles.",features:["Estrategias sencillas y reglas objetivas","Costes, operaciones y estadísticas trazables","Separación de muestra y validación fuera de muestra"]},
  diario:{title:"Diario de trading",phase:6,description:"Evaluar tus decisiones con contexto, además de resultados.",features:["Registro de operaciones, emociones y cumplimiento del plan","Análisis de errores recurrentes y disciplina","Resultados netos expresados en dinero y R"]},
  mentor:{title:"Forex Mentor",phase:6,description:"Una futura ayuda educativa que partirá del temario.",features:["Explicaciones y repasos basados en contenido verificable","Ayudas predefinidas disponibles sin una API de pago","Proveedores opcionales con claves únicamente en el servidor"]},
};
export function generateStaticParams() { return Object.keys(roadmap).map(section => ({section})); }
export async function generateMetadata({params}:{params:Promise<{section:string}>}) { const {section} = await params; return {title:roadmap[section]?.title ?? "Página no encontrada"}; }
export default async function PlannedPage({params}:{params:Promise<{section:string}>}) {
  const {section} = await params; const item=roadmap[section]; if(!item) notFound();
  return <div className="page-enter"><SectionHeading eyebrow="HOJA DE RUTA" title={item.title} description={item.description}/><section className="panel planned-panel"><span className="planned-icon"><Construction size={35}/></span><span className="tag tag-amber">PENDIENTE · FASE {item.phase}</span><h2>Primero, una base sólida.</h2><p>Esta herramienta todavía no está implementada. La Fase 1 se centra en la academia, la primera evaluación y tu progreso persistente.</p><div className="planned-features"><h3>Qué contemplará esta fase</h3>{item.features.map(feature => <div key={feature}><Layers3 size={17}/><span>{feature}</span></div>)}</div><Button asChild><Link href={`/academia/${firstLesson.slug}`}>Empezar por los fundamentos<ArrowRight size={17}/></Link></Button><div className="available-note"><CheckCircle2 size={16}/>Ya disponible: una lección completa con 5 preguntas y corrección explicada.</div></section></div>;
}
