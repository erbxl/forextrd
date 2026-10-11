"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";

export function StudyTracker() {
  const [status, setStatus] = useState("El tiempo se registra mientras lees en esta pestaña.");
  useEffect(() => {
    let sessionId: string | undefined;
    let active = true;
    let sending = false;
    let generation = 0;
    async function tick() {
      if (!active || sending || document.hidden || !document.hasFocus()) return;
      sending = true;
      const currentGeneration = generation;
      try {
        const response = await fetch("/api/study", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sessionId ? {sessionId} : {}) });
        if (!response.ok) throw new Error("No se pudo registrar el tiempo");
        const data: {sessionId: string} = await response.json();
        if (active && currentGeneration === generation) { sessionId = data.sessionId; setStatus("Tiempo de lectura activo · guardado cada 30 segundos"); }
      } catch { if (active) setStatus("No se ha podido guardar el tiempo de lectura. Tus evaluaciones se guardan por separado."); }
      finally { sending = false; }
    }
    const reset = () => { generation++; sessionId = undefined; if (!document.hidden && document.hasFocus()) void tick(); };
    void tick();
    const interval = setInterval(() => void tick(), 30_000);
    document.addEventListener("visibilitychange", reset); window.addEventListener("blur", reset); window.addEventListener("focus", reset);
    return () => { active = false; clearInterval(interval); document.removeEventListener("visibilitychange", reset); window.removeEventListener("blur", reset); window.removeEventListener("focus", reset); };
  }, []);
  return <span className="study-tracker"><Clock3 size={13}/>{status}</span>;
}
