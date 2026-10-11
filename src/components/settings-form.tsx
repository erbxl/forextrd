"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Save, Target, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SettingsForm({initialName,initialGoal}:{initialName:string;initialGoal:number}) {
  const router = useRouter();
  const [name,setName] = useState(initialName);
  const [weeklyGoal,setWeeklyGoal] = useState(initialGoal);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [error,setError] = useState("");
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setError("");
    try { const response = await fetch("/api/settings",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:name.trim(),weeklyGoal})}); const data = await response.json(); if(!response.ok) throw new Error(data.error ?? "No se han podido guardar los ajustes."); setMessage("Tu plan de estudio se ha guardado."); router.refresh(); } catch(cause) { setError(cause instanceof Error ? cause.message : "No se pudo conectar con el servidor."); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="settings-form"><section className="panel settings-section"><div className="panel-heading"><h2>Tu perfil local</h2><UserRound size={20}/></div><label className="form-field"><span>¿Cómo te llamas?</span><input name="name" type="text" required minLength={1} maxLength={50} value={name} onChange={event => {setName(event.target.value);setMessage("");}} autoComplete="given-name"/><small>Este nombre solo se guarda en la base de datos de tu instalación.</small></label></section><section className="panel settings-section"><div className="panel-heading"><h2>Un ritmo sostenible</h2><Target size={20}/></div><p className="muted">Dedica tiempo a comprender. Tu objetivo mide días de estudio, no operaciones ni beneficios.</p><fieldset className="goal-options"><legend>Días de estudio por semana</legend>{[1,2,3,4,5,6,7].map(day => <label key={day} className={weeklyGoal === day ? "goal-selected" : ""}><input type="radio" name="weeklyGoal" value={day} checked={weeklyGoal === day} onChange={() => {setWeeklyGoal(day);setMessage("");}}/><span>{day}</span></label>)}</fieldset><p className="small muted">Se cuentan los días con lectura registrada o evaluaciones en los últimos siete días, con zona horaria de Madrid.</p></section><div className="settings-actions"><Button disabled={busy || !name.trim()} type="submit"><Save size={17}/>{busy ? "Guardando…" : "Guardar mi plan"}</Button>{message && <p className="success-message" role="status"><CheckCircle2 size={17}/>{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}</div></form>;
}
