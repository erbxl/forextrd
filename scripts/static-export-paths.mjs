import { constants } from "node:fs";
import { copyFile, readFile, readdir, realpath } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const segmentName = /^[A-Za-z0-9_$@!-]+$/;

/**
 * Next 16.4 collects Windows segment paths using path.relative, but its URL
 * encoder only replaces '/'. The exported directories therefore differ from
 * the flat filenames requested by the browser. Copy only generated segment
 * text files to those names; keep originals and leave normal Linux output alone.
 * @param {string} exportDirectory
 * @returns {Promise<number>} Number of missing flat files created.
 */
export async function normalizeStaticExportSegments(exportDirectory) {
  const root = await realpath(exportDirectory);
  let copied = 0;

  /** @param {string} directory @returns {Promise<string[]>} */
  async function collectSegmentFiles(directory) {
    const files = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory() && segmentName.test(entry.name)) {
        files.push(...await collectSegmentFiles(file));
      } else if (entry.isFile() && entry.name.endsWith(".txt") && segmentName.test(entry.name.slice(0, -4))) {
        files.push(file);
      } else {
        throw new Error(`Entrada inesperada en segmentos estáticos: ${file}`);
      }
    }
    return files;
  }

  /** @param {string} directory */
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const child = join(directory, entry.name);
      if (!entry.name.startsWith("__next.")) { await visit(child); continue; }
      if (!segmentName.test(entry.name.slice("__next.".length))) {
        throw new Error(`Directorio de segmentos inesperado: ${child}`);
      }
      for (const source of await collectSegmentFiles(child)) {
        const filename = relative(directory, source).split(sep).join(".");
        const destination = join(directory, filename);
        try {
          await copyFile(source, destination, constants.COPYFILE_EXCL);
          copied++;
        } catch (error) {
          if (!(error instanceof Error) || !("code" in error) || error.code !== "EEXIST") throw error;
          if (!(await readFile(source)).equals(await readFile(destination))) {
            throw new Error(`Dos segmentos distintos comparten destino: ${destination}`);
          }
        }
      }
    }
  }

  await visit(root);
  return copied;
}
