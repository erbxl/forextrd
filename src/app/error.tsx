"use client";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function ErrorPage({reset}:{error:Error & {digest?:string};reset:()=>void}) { return <div className="empty-state panel error-page"><TriangleAlert size={36}/><h1>No hemos podido cargar tu espacio</h1><p>Comprueba tu conexión al cargar el sitio y que el navegador permita almacenamiento local.</p><p className="muted small">Reintentar no elimina tu progreso. Conserva una copia JSON antes de borrar datos del navegador.</p><Button onClick={reset}>Volver a intentar</Button></div>; }
