import { lessons } from "@/modules/academy/content";
import { glossaryFoundations } from "@/modules/academy/glossary-foundations";
import { glossaryApplied } from "@/modules/academy/glossary-applied";
import { glossaryAdvanced } from "@/modules/academy/glossary-advanced";

export const normalize=(text:string)=>text.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const excluded=new Set(["que","como","para","por","con","del","las","los","una","uno","unos","unas","sobre","explica","explicame","quiero","saber","puedo","cual","cuanto","tiene","son","esta","esto","es","el","de","la","y","en","un","me","mi"]);
export function queryMentor(query:string,technical=false) {
  if(query.length>500)throw new Error("Resume la consulta en 500 caracteres como máximo.");
  const tokens=[...new Set(normalize(query).split(/[^a-z0-9]+/).filter(token=>token.length>1&&!excluded.has(token)))];
  const score=(text:string)=>tokens.reduce((sum,token)=>sum+(normalize(text).includes(token) ? 1 : 0),0);
  const concepts=[...glossaryFoundations,...glossaryApplied,...glossaryAdvanced].map(entry=>({...entry,score:score(entry.term)*4+score(entry.definition)})).filter(entry=>entry.score>0).sort((a,b)=>b.score-a.score).slice(0,3);
  const matches=lessons.map(lesson=>({lesson,score:score(lesson.title)*5+score(lesson.relatedConcepts.join(" "))*3+score(lesson.sections.map(section=>section.title).join(" "))})).filter(item=>item.score>0).sort((a,b)=>b.score-a.score).slice(0,3).map(({lesson})=>{
    const section=technical ? lesson.sections.find(item=>/tecnic|formula|medir|calculo/.test(normalize(item.title))) ?? lesson.sections[1] ?? lesson.sections[0] : lesson.sections[0];
    return {slug:lesson.slug,title:lesson.title,moduleId:lesson.moduleId,explanation:section.paragraphs[0],example:lesson.workedExample.conclusion,source:lesson.sources[0]};
  });
  return {concepts,matches};
}
