import { readFile, readdir, access } from "node:fs/promises";
import { resolve, join } from "node:path";
import { normalizeStaticExportSegments } from "./static-export-paths.mjs";

const root = resolve("out");
const normalizedSegments = await normalizeStaticExportSegments(root);
if (normalizedSegments) console.info(`Normalizados ${normalizedSegments} recursos segmentados de Next.js para rutas estáticas compatibles con Windows.`);
const required = ["index.html","404.html","academia/index.html","academia/dinero-y-poder-adquisitivo/index.html","progreso/index.html","ajustes/index.html","recursos/index.html","herramientas/index.html","simulador/index.html","replay/index.html","backtesting/index.html","diario/index.html","mentor/index.html",".nojekyll"];
for(const file of required) await access(join(root,file));
const packageData = JSON.parse(await readFile("package.json","utf8"));
if(Object.keys({...packageData.dependencies,...packageData.devDependencies}).some(name => /prisma|sqlite/i.test(name))) throw new Error("Persisten dependencias del antiguo backend.");
async function htmlFiles(directory) {
  const entries = await readdir(directory,{withFileTypes:true});
  const files = await Promise.all(entries.map(entry => entry.isDirectory() ? htmlFiles(join(directory,entry.name)) : entry.name.endsWith(".html") ? [join(directory,entry.name)] : []));
  return files.flat();
}
let checked = 0;
for(const file of await htmlFiles(root)) {
  const html = await readFile(file,"utf8");
  if(/(?:src|href)=["']https?:\/\/(?:localhost|127\.0\.0\.1)/.test(html)) throw new Error(`Referencia local en ${file}`);
  for(const match of html.matchAll(/(?:src|href)="(\/[^"#?]*)(?:[?#][^"]*)?"/g)) {
    const url = match[1];
    if(!url.startsWith("/forextrd/") && url !== "/forextrd") throw new Error(`Recurso fuera de /forextrd: ${url} en ${file}`);
    const relative = decodeURIComponent(url.slice("/forextrd".length)).replace(/^\//,"");
    const destination = relative === "" || relative.endsWith("/") ? join(root,relative,"index.html") : join(root,relative);
    await access(destination).catch(() => { throw new Error(`Referencia exportada sin destino: ${url} en ${file}`); });
    checked++;
  }
}
console.info(`Exportación estática verificada: ${required.length} archivos esenciales y ${checked} enlaces/recursos bajo /forextrd/.`);
