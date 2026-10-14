"use client";

import type { SimulationSettings } from "@/modules/simulator/types";

const primaryFields = [
  { key: "initialBalance", label: "Saldo inicial de práctica (USD)", min: 1, max: 1e9 },
  { key: "leverage", label: "Apalancamiento máximo (X:1)", min: 1, max: 500 },
  { key: "quoteToAccount", label: "USD por 1 unidad de divisa cotizada", min: 0.00000001, max: 1e6 },
  { key: "spreadPips", label: "Spread completo (pips)", min: 0, max: 1000 },
  { key: "slippagePips", label: "Deslizamiento adverso por ejecución (pips)", min: 0, max: 1000 },
  { key: "commissionPerLotSide", label: "Comisión por lote y lado (USD)", min: 0, max: 1e5 },
  { key: "financingLongPerLotDay", label: "Financiación compra: coste por lote / día (USD)", min: -1e5, max: 1e5 },
  { key: "financingShortPerLotDay", label: "Financiación venta: coste por lote / día (USD)", min: -1e5, max: 1e5 },
] as const;

const advancedFields = [
  { key: "pipSize", label: "Tamaño de un pip", min: 0.00000001, max: 100 },
  { key: "contractSize", label: "Unidades por lote", min: 1, max: 1e7 },
  { key: "minLot", label: "Lote mínimo", min: 0.00001, max: 1000 },
  { key: "lotStep", label: "Paso de lote", min: 0.00001, max: 1000 },
  { key: "maxLots", label: "Máximo de lotes por orden", min: 0.00001, max: 1000 },
  { key: "maxPositions", label: "Máximo de posiciones simultáneas", min: 1, max: 100 },
  { key: "marginCallPercent", label: "Aviso de margen (%)", min: 1, max: 1000 },
  { key: "stopOutPercent", label: "Cierre forzoso por margen (%)", min: 0.01, max: 1000 },
] as const;

export function SimulationSettingsFields({ value, onChange, disabled = false }: {
  value: SimulationSettings;
  onChange: (settings: SimulationSettings) => void;
  disabled?: boolean;
}) {
  const field = (item: typeof primaryFields[number] | typeof advancedFields[number]) => (
    <label key={item.key}>{item.label}
      <input type="number" required disabled={disabled} step={item.key === "maxPositions" ? 1 : "any"} min={item.min} max={item.max}
        value={Number.isFinite(value[item.key]) ? value[item.key] : ""}
        onChange={event => onChange({ ...value, [item.key]: event.target.value === "" ? NaN : Number(event.target.value) })} />
    </label>
  );
  return <>
    <div className="tool-fields">{primaryFields.map(field)}</div>
    <details><summary className="small muted">Contrato, tamaños permitidos y límites de margen</summary>
      <div className="tool-fields">{advancedFields.map(field)}</div>
    </details>
    <p className="tool-explanation">Cuenta en USD. La conversión se mantiene constante durante la sesión: revisa este valor si la divisa cotizada no es USD. Financiación positiva = coste; negativa = abono, prorrateados por tiempo transcurrido. Son condiciones didácticas configurables, no condiciones de un bróker.</p>
  </>;
}
