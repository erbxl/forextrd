"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { liveQuery } from "dexie";
import { Database, TriangleAlert } from "lucide-react";
import { getProgress } from "@/modules/progress/service";
import { getPreferences, initializeDatabase } from "@/modules/storage/db";
import type { ProgressSnapshot } from "@/modules/progress/types";
import { Button } from "@/components/ui/button";

type LearningState = { progress: ProgressSnapshot | null; theme: "dark" | "light"; error: string | null; retry: () => void };
const Context = createContext<LearningState | null>(null);

export function LearningProvider({ children }: { children: ReactNode }) {
  const [state,setState] = useState<Omit<LearningState,"retry">>({progress:null,theme:"dark",error:null});
  const [revision,setRevision] = useState(0);
  useEffect(() => {
    let stopped = false;
    let unsubscribe: (() => void) | undefined;
    setState(previous => ({...previous,progress:null,error:null}));
    const fail = () => { if(!stopped) setState(previous => ({...previous,progress:null,error:"No se ha podido acceder al almacenamiento de este navegador. Comprueba que permite guardar datos para este sitio y vuelve a intentarlo. No borres los datos del sitio si quieres conservar tu progreso."})); };
    void initializeDatabase().then(() => {
      if(stopped) return;
      const subscription = liveQuery(async () => ({progress:await getProgress(),preferences:await getPreferences()})).subscribe({
        next: ({progress,preferences}) => { if(!stopped) { setState({progress,theme:preferences.theme,error:null}); document.documentElement.dataset.theme = preferences.theme; } },
        error: fail,
      });
      unsubscribe = () => subscription.unsubscribe();
    }).catch(fail);
    return () => { stopped = true; unsubscribe?.(); };
  },[revision]);
  return <Context.Provider value={{...state,retry:() => setRevision(value => value+1)}}>{children}</Context.Provider>;
}

export function useLearning() {
  const context = useContext(Context);
  if(!context) throw new Error("LearningProvider es necesario para acceder al progreso local.");
  return context;
}

export function StorageStatus() {
  const {error,retry} = useLearning();
  return error ? <section className="empty-state panel" role="alert"><TriangleAlert size={30}/><h2>Tu progreso necesita almacenamiento local</h2><p>{error}</p><Button onClick={retry}>Reintentar conexión local</Button></section> : <section className="storage-loading" role="status"><Database size={22}/><span>Abriendo tu espacio en este navegador…</span></section>;
}
