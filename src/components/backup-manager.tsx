"use client";

import { useState, type ChangeEvent } from "react";
import { CheckCircle2, Download, FileJson, RotateCcw, ShieldCheck, Upload, X } from "lucide-react";
import { backupPreview, exportBackup, parseBackup, resetDatabase, restoreBackup } from "@/modules/storage/backup";
import { Button } from "@/components/ui/button";

type Backup = ReturnType<typeof parseBackup>;
export function BackupManager() {
  const [pending,setPending] = useState<Backup | null>(null);
  const [filename,setFilename] = useState("");
  const [confirmed,setConfirmed] = useState(false);
  const [showReset,setShowReset] = useState(false);
  const [resetConfirmed,setResetConfirmed] = useState(false);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [error,setError] = useState("");
  const preview = pending ? backupPreview(pending) : null;
  function clearMessages() { setMessage(""); setError(""); }
  async function download() {
    clearMessages(); setBusy(true);
    try {
      const backup = await exportBackup();
      const blob = new Blob([JSON.stringify(backup,null,2)],{type:"application/json;charset=utf-8"});
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `forex-academy-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url),1_000);
      setMessage("Copia JSON preparada para descargar. Guárdala en un lugar seguro.");
    } catch(cause) { setError(cause instanceof Error ? cause.message : "No se pudo exportar la copia."); }
    finally { setBusy(false); }
  }
  async function chooseFile(event:ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if(!file) return;
    clearMessages(); setPending(null); setConfirmed(false); setShowReset(false); setBusy(true);
    try {
      if(file.size > 10 * 1024 * 1024) throw new Error("La copia supera el límite de 10 MB. No se ha cambiado ningún dato.");
      const validated = parseBackup(await file.text());
      setPending(validated); setFilename(file.name);
    } catch(cause) { setError(cause instanceof Error ? cause.message : "El archivo no es una copia válida. No se ha cambiado ningún dato."); }
    finally { setBusy(false); }
  }
  async function restore() {
    if(!pending || !confirmed) return;
    clearMessages(); setBusy(true);
    try { await restoreBackup(pending); setPending(null); setConfirmed(false); setMessage("Copia restaurada. Tu progreso y tus preferencias ya están disponibles."); }
    catch(cause) { setError(cause instanceof Error ? cause.message : "No se pudo restaurar la copia. Tus datos anteriores se conservan."); }
    finally { setBusy(false); }
  }
  async function reset() {
    if(!showReset || !resetConfirmed) return;
    clearMessages(); setBusy(true);
    try { await resetDatabase(); setShowReset(false); setResetConfirmed(false); setPending(null); setMessage("Datos restablecidos. El perfil de este navegador vuelve a empezar desde cero."); }
    catch(cause) { setError(cause instanceof Error ? cause.message : "No se pudieron restablecer los datos."); }
    finally { setBusy(false); }
  }
  return <section className="panel backup-panel" aria-labelledby="backup-title"><div className="panel-heading"><h2 id="backup-title">Tus datos, contigo</h2><FileJson size={20}/></div><p className="muted small">Exporta tu perfil, preferencias, progreso, evaluaciones, ejercicios, sesiones guardadas, backtests y diario.</p><div className="backup-actions"><Button type="button" variant="secondary" disabled={busy} onClick={download}><Download size={16}/>Exportar copia JSON</Button><label className={`button button-secondary backup-file ${busy ? "is-busy" : ""}`}><Upload size={16}/>Importar copia JSON<input aria-label="Seleccionar copia JSON" type="file" accept="application/json,.json" disabled={busy} onChange={chooseFile}/></label></div><p className="backup-note"><ShieldCheck size={15}/>El archivo contiene datos personales. GitHub no guarda ni sincroniza estas copias.</p>
    {preview && pending && <div className="backup-preview"><div className="panel-heading"><h3>Previsualización de la copia</h3><button type="button" className="icon-button" aria-label="Cancelar importación" onClick={() => {setPending(null);setConfirmed(false);}} disabled={busy}><X size={17}/></button></div><p className="backup-filename">{filename}</p><dl><div><dt>Perfil</dt><dd>{preview.profileName}</dd></div><div><dt>Fecha de la copia</dt><dd>{new Intl.DateTimeFormat("es-ES",{dateStyle:"medium",timeStyle:"short"}).format(new Date(preview.exportedAt))}</dd></div><div><dt>Lecciones completadas</dt><dd>{preview.lessonsCompleted}</dd></div><div><dt>Evaluaciones guardadas</dt><dd>{preview.attempts}</dd></div><div><dt>Intentos de práctica</dt><dd>{preview.practiceAttempts}</dd></div><div><dt>Tiempo de estudio</dt><dd>{preview.studySeconds} s</dd></div><div><dt>Tema</dt><dd>{preview.theme === "light" ? "Claro" : "Oscuro"}</dd></div><div><dt>Operaciones / replay / backtests / diario</dt><dd>{preview.demoTrades} / {preview.replaySessions} / {preview.backtestResults} / {preview.journalEntries}</dd></div></dl><p className="small muted">La restauración sustituye todos los datos actuales de este navegador por los de la copia. Exporta antes tus datos actuales si quieres conservarlos.</p><label className="read-acknowledgement"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={busy}/>Confirmo que quiero sustituir mis datos por esta copia.</label><Button disabled={!confirmed || busy} type="button" onClick={restore}>{busy ? "Restaurando…" : "Restaurar copia"}<Upload size={16}/></Button></div>}
    <div className="backup-reset"><Button type="button" variant="ghost" disabled={busy} onClick={() => {clearMessages();setShowReset(!showReset);setResetConfirmed(false);setPending(null);}}><RotateCcw size={15}/>Restablecer datos</Button>{showReset && <div className="reset-confirmation"><h3>Volver a empezar en este navegador</h3><p>Se eliminarán el perfil, las preferencias, las respuestas, el progreso y los demás registros locales. Esta acción no se puede deshacer sin una copia JSON.</p><label className="read-acknowledgement"><input type="checkbox" checked={resetConfirmed} onChange={event => setResetConfirmed(event.target.checked)} disabled={busy}/>Confirmo que quiero borrar todos mis datos locales.</label><Button type="button" variant="secondary" disabled={!resetConfirmed || busy} onClick={reset}>Confirmar restablecimiento</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => setShowReset(false)}>Cancelar</Button></div>}</div>
    {message && <p className="success-message" role="status"><CheckCircle2 size={17}/>{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}
  </section>;
}
