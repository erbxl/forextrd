import { notFound } from "next/navigation";
import CalculatorsPage from "@/components/pages/calculators";
import JournalPage from "@/components/pages/journal";
import MentorPage from "@/components/pages/mentor";
import TradingPage from "@/components/pages/trading";
import BacktestingPage from "@/components/pages/backtesting";
const titles: Record<string, string> = { herramientas: "Calculadoras", diario: "Diario de trading", mentor: "Forex Mentor", simulador: "Simulador", replay: "Trading Replay", backtesting: "Backtesting" };
export function generateStaticParams() { return Object.keys(titles).map(section => ({ section })); }
export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) { const { section } = await params; return { title: titles[section] ?? "Página no encontrada" }; }
export default async function ToolPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === "herramientas") return <CalculatorsPage />;
  if (section === "diario") return <JournalPage />;
  if (section === "mentor") return <MentorPage />;
  if (section === "simulador") return <TradingPage />;
  if (section === "replay") return <TradingPage mode="replay" />;
  if (section === "backtesting") return <BacktestingPage />;
  notFound();
}
