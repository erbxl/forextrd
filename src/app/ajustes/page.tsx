import { Database, Laptop, ShieldCheck } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { SettingsForm } from "@/components/settings-form";
import { getProgress } from "@/modules/progress/service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ajustes" };
export default async function SettingsPage() {
  const {user} = await getProgress();
  return <div className="page-enter"><SectionHeading eyebrow="A TU MANERA" title="Tu aprendizaje, tu ritmo." description="Define un objetivo de constancia y haz de este espacio algo tuyo."/><div className="settings-layout"><SettingsForm initialName={user.name} initialGoal={user.weeklyGoal}/><aside className="panel installation-info"><span className="tag tag-green">EDICIÓN LOCAL</span><h2>Un espacio para aprender</h2><div><Database size={20}/><p><strong>Progreso persistente</strong><span>Tu actividad se guarda en SQLite y permanece al reiniciar la aplicación.</span></p></div><div><Laptop size={20}/><p><strong>Un perfil en este equipo</strong><span>Esta fase está diseñada para uso individual. No incluye cuentas multiusuario.</span></p></div><div><ShieldCheck size={20}/><p><strong>Sin dinero real</strong><span>No se conectan brokers ni se ejecutan operaciones.</span></p></div><p className="small muted">El modo claro u oscuro se guarda en este navegador. El resto de tus ajustes se guarda en la base de datos local.</p></aside></div></div>;
}
