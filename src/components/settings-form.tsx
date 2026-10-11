"use client";

import { useEffect, useState } from "react";
import { updateSettings } from "@/modules/progress/service";
import { CheckCircle2, Save, Target, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SettingsForm({initialName,initialGoal}:{initialName:string;initialGoal:number}) {
  const [name,setName] = useState(initialName);
  const [weeklyGoal,setWeeklyGoal] = useState(initialGoal);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [error,setError] = useState("");
  useEffect(() => { setName(initialName); setWeeklyGoal(initialGoal); },[initialName,initialGoal]);
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setError("");
    try { await updateSettings({name:name.trim(),weeklyGoal}); setMessage("Tu plan de estudio se ha guardado."); } catch(cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar en este navegador."); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="settings-form"><section className="panel settings-section"><div className="panel-heading"><h2>Tu perfil local</h2><UserRound size={20}/></div><label className="form-field"><span>¿Cómo te llamas?</span><input name="name" type="text" required minLength={1} maxLength={50} value={name} onChange={event => {setName(event.target.value);setMessage("");}} autoComplete="given-name"/><small>Este nombre solo se guarda en este navegador.</small></label></section><section className="panel settings-section"><div className="panel-heading"><h2>Un ritmo sostenible</h2><Target size={20}/></div><p className="muted">Dedica tiempo a comprender. Tu objetivo mide días de estudio, no operaciones ni beneficios.</p><fieldset className="goal-options"><legend>Días de estudio por semana</legend>{[1,2,3,4,5,6,7].map(day => <label key={day} className={weeklyGoal === day ? "goal-selected" : ""}><input type="radio" name="weeklyGoal" value={day} checked={weeklyGoal === day} onChange={() => {setWeeklyGoal(day);setMessage("");}}/><span>{day}</span></label>)}</fieldset><p className="small muted">Se cuentan los días con lectura registrada o evaluaciones durante la semana de lunes a domingo, con zona horaria de Madrid.</p></section><div className="settings-actions"><Button disabled={busy || !name.trim()} type="submit"><Save size={17}/>{busy ? "Guardando…" : "Guardar mi plan"}</Button>{message && <p className="success-message" role="status"><CheckCircle2 size={17}/>{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}</div></form>;
}
