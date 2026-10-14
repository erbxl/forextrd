import { readFile, readdir, access } from "node:fs/promises";
import { resolve, join } from "node:path";
import { normalizeStaticExportSegments } from "./static-export-paths.mjs";
import ts from "typescript";

const root = resolve("out");
const normalizedSegments = await normalizeStaticExportSegments(root);
if (normalizedSegments) console.info(`Normalizados ${normalizedSegments} recursos segmentados de Next.js para rutas estáticas compatibles con Windows.`);
const required = ["index.html","404.html","academia/index.html","academia/dinero-y-poder-adquisitivo/index.html","progreso/index.html","ajustes/index.html","recursos/index.html","herramientas/index.html","simulador/index.html","replay/index.html","backtesting/index.html","diario/index.html","mentor/index.html",".nojekyll"];
required.push("glosario/index.html","practica/index.html");
// Independently verify every authored lesson and cumulative exam is exported.
const lessonDirectory = "src/modules/academy/lessons";
const authoredSlugs = new Set();
for (const file of await readdir(lessonDirectory)) {
  if (!file.endsWith(".ts")) continue;
  const source = ts.createSourceFile(file, await readFile(join(lessonDirectory,file),"utf8"), ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (ts.isPropertyAssignment(node) && node.name.getText(source) === "slug" && ts.isStringLiteral(node.initializer)) authoredSlugs.add(node.initializer.text);
    ts.forEachChild(node,visit);
  }
  visit(source);
}
if (authoredSlugs.size !== 104) throw new Error(`Se esperaban 104 lecciones y se encontraron ${authoredSlugs.size}.`);
for (const slug of authoredSlugs) required.push(`academia/${slug}/index.html`);
for (let level=0;level<13;level++) required.push(`academia/examen-nivel-${level}/index.html`);
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
