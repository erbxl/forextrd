import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import { normalizeStaticExportSegments } from "../scripts/static-export-paths.mjs";

let directory: string;
beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), "forex-export-paths-")); });
afterEach(async () => {
  const location = resolve(directory);
  const fromTemporary = relative(resolve(tmpdir()), location);
  if (isAbsolute(fromTemporary) || fromTemporary.startsWith(`..${sep}`) || fromTemporary === ".." || !basename(location).startsWith("forex-export-paths-")) {
    throw new Error("La carpeta de prueba no está en la ubicación temporal prevista.");
  }
  await rm(location, { recursive: true, force: true });
});

describe("exportación segmentada estática de Next en Windows", () => {
  it("crea las URL planas de rutas normales y dinámicas y conserva los originales", async () => {
    const regular = join(directory, "academia", "__next.academia");
    const dynamic = join(directory, "academia", "unidad", "__next.academia", "$d$slug");
    await mkdir(regular, { recursive: true });
    await mkdir(dynamic, { recursive: true });
    await writeFile(join(regular, "__PAGE__.txt"), "contenido academia");
    await writeFile(join(dynamic, "__PAGE__.txt"), "contenido lección");

    expect(await normalizeStaticExportSegments(directory)).toBe(2);
    expect(await readFile(join(directory, "academia", "__next.academia.__PAGE__.txt"), "utf8")).toBe("contenido academia");
    expect(await readFile(join(directory, "academia", "unidad", "__next.academia.$d$slug.__PAGE__.txt"), "utf8")).toBe("contenido lección");
    expect(await readFile(join(regular, "__PAGE__.txt"), "utf8")).toBe("contenido academia");
    expect(await normalizeStaticExportSegments(directory)).toBe(0);
  });

  it("no modifica los nombres ya planos que produce Linux", async () => {
    await mkdir(join(directory, "academia"));
    const file = join(directory, "academia", "__next.academia.__PAGE__.txt");
    await writeFile(file, "archivo correcto");
    expect(await normalizeStaticExportSegments(directory)).toBe(0);
    expect(await readFile(file, "utf8")).toBe("archivo correcto");
  });

  it("rechaza colisiones de contenido sin sobrescribir el destino", async () => {
    const nested = join(directory, "__next.academia");
    await mkdir(nested);
    await writeFile(join(nested, "__PAGE__.txt"), "nuevo");
    const existing = join(directory, "__next.academia.__PAGE__.txt");
    await writeFile(existing, "existente");
    await expect(normalizeStaticExportSegments(directory)).rejects.toThrow("comparten destino");
    expect(await readFile(existing, "utf8")).toBe("existente");
  });

  it("solo admite ficheros de texto generados y no transforma archivos arbitrarios", async () => {
    const nested = join(directory, "__next.academia");
    await mkdir(nested);
    await writeFile(join(nested, "datos.json"), "{}");
    await expect(normalizeStaticExportSegments(directory)).rejects.toThrow("Entrada inesperada");
    await expect(readFile(join(directory, "__next.academia.datos.json"))).rejects.toMatchObject({ code: "ENOENT" });
  });
});
