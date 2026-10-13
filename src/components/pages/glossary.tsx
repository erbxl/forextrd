"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";
import { glossaryFoundations } from "@/modules/academy/glossary-foundations";
import { glossaryApplied } from "@/modules/academy/glossary-applied";
import { glossaryAdvanced } from "@/modules/academy/glossary-advanced";
import { SectionHeading } from "@/components/section-heading";
const entries=[...glossaryFoundations,...glossaryApplied,...glossaryAdvanced].sort((a,b)=>a.term.localeCompare(b.term,"es"));
const normalize=(text:string)=>text.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
export default function GlossaryPage(){const [query,setQuery]=useState("");const filtered=entries.filter(entry=>normalize(entry.term+" "+entry.definition).includes(normalize(query)));return <div className="page-enter"><SectionHeading eyebrow="CONSULTA Y CONECTA" title="Las palabras del mercado." description={`${entries.length} conceptos explicados y conectados con sus niveles de estudio.`}/><div className="catalog-toolbar"><span className="small muted">{filtered.length} conceptos</span><label className="search-input"><Search size={17}/><span className="sr-only">Buscar en el glosario</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Busca pip, drawdown, sesgo…"/></label></div><div className="glossary-grid">{filtered.map(entry=><article className="panel glossary-entry" key={entry.term}><span className="eyebrow">NIVEL {entry.moduleId}</span><h2>{entry.term}</h2><p>{entry.definition}</p><Link href={`/academia#nivel-${entry.moduleId}`} className="text-link">Estudiar este nivel<ArrowRight size={15}/></Link></article>)}</div>{!filtered.length && <p className="content-note">No hay resultados para esta búsqueda.</p>}</div>;}
