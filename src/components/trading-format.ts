export const accountMoney = (value: number) => new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
export const marketPrice = (value: number, pair: string) => value.toFixed(pair.replace("/", "").endsWith("JPY") ? 3 : 5);
export const utcLabel = (value: string) => value.slice(0, 16).replace("T", " ") + " UTC";
export const errorMessage = (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback;

/** Quote every field so user-authored labels cannot escape the CSV column. */
export function exportRows(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const cell = (value: string | number | null | undefined) => {
    const raw = value == null ? "" : String(value);
    const text = typeof value === "string" && /^[=+\-@\t\r]/.test(raw) ? "'" + raw : raw;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return [headers, ...rows].map(row => row.map(cell).join(",")).join("\r\n");
}
