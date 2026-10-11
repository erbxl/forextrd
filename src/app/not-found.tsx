import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function NotFound() { return <div className="empty-state panel error-page"><Compass size={38}/><span className="eyebrow">404 · FUERA DE LA RUTA</span><h1>Esta página no está disponible</h1><p>Vuelve a la academia para explorar el contenido publicado.</p><Button asChild><Link href="/academia">Volver a la academia</Link></Button></div>; }
