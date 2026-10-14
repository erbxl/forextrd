"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, BookOpen, ChartNoAxesCombined, ChevronRight, FlaskConical, GraduationCap, LayoutDashboard, Menu, Moon, NotebookPen, PanelLeftClose, Play, Settings2, ShieldCheck, Sparkles, Sun, Target, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLearning } from "@/components/learning-provider";
import { updatePreferences } from "@/modules/storage/db";

type NavigationItem = { href:string; label:string; icon:React.ElementType<{size?:number}>; pending?:boolean };
const navigation: {group:string;items:NavigationItem[]}[] = [
  { group: "APRENDE", items: [
    { href: "/", label: "Vista general", icon: LayoutDashboard },
    { href: "/academia", label: "Academia", icon: GraduationCap },
    { href: "/progreso", label: "Mi progreso", icon: ChartNoAxesCombined },
  ] },
  { group: "PRACTICA", items: [
    { href: "/practica", label: "Ejercicios", icon: Target },
    { href: "/herramientas", label: "Calculadoras", icon: Wrench },
    { href: "/simulador", label: "Simulador", icon: CandlesIcon },
    { href: "/replay", label: "Trading Replay", icon: Play },
    { href: "/backtesting", label: "Backtesting", icon: FlaskConical },
    { href: "/diario", label: "Diario de trading", icon: NotebookPen },
  ] },
  { group: "EXPLORA", items: [
    { href: "/recursos", label: "Biblioteca", icon: BookOpen },
    { href: "/glosario", label: "Glosario", icon: BookOpen },
    { href: "/mentor", label: "Forex Mentor", icon: Sparkles },
  ] },
];

function CandlesIcon({ size = 20, ...props }: React.ComponentProps<typeof LayoutDashboard>) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" {...props}><path d="M6 3v4m0 9v5M12 2v3m0 7v7M18 7v3m0 8v4"/><rect x="3.5" y="7" width="5" height="9" rx="1"/><rect x="9.5" y="5" width="5" height="7" rx="1"/><rect x="15.5" y="10" width="5" height="8" rx="1"/></svg>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const rawPathname = usePathname();
  const pathname = rawPathname.replace(/^\/forextrd(?=\/|$)/, "").replace(/\/+$/, "") || "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const {theme} = useLearning();
  const light = theme === "light";
  const [themeError,setThemeError] = useState("");
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", escape); };
  }, [mobileOpen]);
  const title = pathname.startsWith("/academia/") ? "Mi formación" : navigation.flatMap(group => group.items).find(item => item.href === pathname)?.label ?? "Ajustes";
  async function toggleTheme() {
    setThemeError("");
    try { await updatePreferences({theme:light ? "dark" : "light"}); }
    catch { setThemeError("No se ha podido guardar el tema en este navegador."); }
  }
  return <div className="app-shell">
    <a href="#contenido" className="skip-link">Saltar al contenido</a>
    {mobileOpen && <button className="sidebar-overlay" onClick={() => setMobileOpen(false)} aria-label="Cerrar navegación" />}
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`} aria-label="Navegación principal">
      <Link href="/" className="brand" aria-label="Forex Academy Pro, inicio"><span className="brand-symbol"><CandlesIcon size={27}/></span><span>forex<span className="brand-second">academy <span className="pro-badge">PRO</span></span></span></Link>
      <button className="mobile-close icon-button" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú"><X size={20}/></button>
      <div className="workspace-label"><span className="status-dot"/> TU ESPACIO DE APRENDIZAJE</div>
      <nav>{navigation.map(group => <div className="nav-group" key={group.group}><p className="nav-label">{group.group}</p>{group.items.map(item => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return <Link key={item.href} href={item.href} className={`nav-item ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}><item.icon size={18}/><span>{item.label}</span>{"pending" in item && item.pending && <span className="nav-pending" title="Pendiente de implementar" aria-label="Pendiente">·</span>}{active && <span className="active-marker"/>}</Link>;
      })}</div>)}</nav>
      <div className="sidebar-bottom">
        <div className="learning-note"><ShieldCheck size={19}/><p>Aprende con criterio.<br/><span>Practica sin arriesgar capital.</span></p></div>
        <Link href="/ajustes" className={`nav-item ${pathname === "/ajustes" ? "active" : ""}`}><Settings2 size={18}/><span>Ajustes</span></Link>
        <div className="local-profile"><span className="avatar"><GraduationCap size={19}/></span><div><strong>Perfil de aprendizaje</strong><span>Progreso en este navegador</span></div><PanelLeftClose size={16}/></div>
      </div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb"><button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Abrir menú" aria-expanded={mobileOpen}><Menu size={21}/></button><span className="breadcrumb-root">Mi espacio</span><ChevronRight size={14}/><span>{title}</span></div><div className="header-actions"><span className="local-tag"><span className="status-dot"/> Modo educativo</span><button className="icon-button" onClick={toggleTheme} aria-label={light ? "Activar modo oscuro" : "Activar modo claro"}>{light ? <Moon size={18}/> : <Sun size={18}/>}</button><Link href="/ajustes" className="header-plan"><Target size={16}/><span>Mi plan de estudio</span><ArrowUpRight size={14}/></Link></div></header>
      <main id="contenido" className="page-content" tabIndex={-1}>{themeError && <p className="form-error" role="alert">{themeError}</p>}{children}</main>
      <footer className="app-footer"><span>FOREX ACADEMY PRO <span className="footer-separator">/</span> APRENDER. COMPRENDER. VALIDAR.</span><span>Educación financiera · Sin operativa real</span></footer>
    </div>
  </div>;
}
