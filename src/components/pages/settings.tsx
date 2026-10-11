"use client";

import { Database, Laptop, ShieldCheck } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { SettingsForm } from "@/components/settings-form";
import { StorageStatus, useLearning } from "@/components/learning-provider";
import { BackupManager } from "@/components/backup-manager";

export default function SettingsPage() {
  const {progress} = useLearning();
  if(!progress) return <StorageStatus/>;
  const {user} = progress;
  return <div className="page-enter"><SectionHeading eyebrow="A TU MANERA" title="Tu aprendizaje, tu ritmo." description="Define un objetivo de constancia y haz de este espacio algo tuyo."/><div className="settings-layout"><div><SettingsForm initialName={user.name} initialGoal={user.weeklyGoal}/><BackupManager/></div><aside className="panel installation-info"><span className="tag tag-green">DATOS EN TU NAVEGADOR</span><h2>Un espacio para aprender</h2><div><Database size={20}/><p><strong>Progreso persistente</strong><span>Tu actividad se guarda en IndexedDB y permanece al recargar o cerrar el navegador.</span></p></div><div><Laptop size={20}/><p><strong>Un perfil en este navegador</strong><span>GitHub no sincroniza tus datos entre dispositivos. Usa copias JSON para trasladarlos.</span></p></div><div><ShieldCheck size={20}/><p><strong>Sin dinero real</strong><span>No se conectan brokers ni se ejecutan operaciones.</span></p></div><p className="small muted">Borrar los datos del sitio elimina el progreso. La navegación privada puede descartarlo al cerrar la sesión. Conserva una copia antes de cambiar de navegador u origen.</p></aside></div></div>;
}
