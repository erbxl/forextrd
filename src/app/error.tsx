"use client";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function ErrorPage({reset}:{error:Error & {digest?:string};reset:()=>void}) { return <div className="empty-state panel error-page"><TriangleAlert size={36}/><h1>No hemos podido cargar tu espacio</h1><p>Comprueba que la base de datos esté inicializada y que el servidor local siga disponible.</p><p className="muted small">La guía de instalación del proyecto incluye los pasos para preparar los datos.</p><Button onClick={reset}>Volver a intentar</Button></div>; }
