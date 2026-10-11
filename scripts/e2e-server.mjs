import { createReadStream } from "node:fs";
import { access, realpath, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const exportRoot = await realpath(join(projectRoot, "out")).catch(() => {
  throw new Error("No existe out/. Ejecuta npm run build antes de previsualizar.");
});
await access(join(exportRoot, "index.html"));
const mount = "/forextrd";
const port = Number(process.env.PREVIEW_PORT ?? "3100");
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PREVIEW_PORT no es un puerto válido.");
const mimeTypes = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf",
  ".otf": "font/otf", ".wasm": "application/wasm", ".xml": "application/xml",
};

function isInsideExport(file) {
  const difference = relative(exportRoot, file);
  return difference === "" || (!isAbsolute(difference) && difference !== ".." && !difference.startsWith(".." + sep));
}

function sendFile(request, response, file, statusCode, size) {
  response.writeHead(statusCode, {
    "Content-Type": mimeTypes[extname(file).toLowerCase()] ?? "application/octet-stream",
    "Content-Length": size,
    "Cache-Control": "no-store",
  });
  if (request.method === "HEAD") return response.end();
  const stream = createReadStream(file);
  stream.on("error", () => response.destroy());
  stream.pipe(response);
}

async function notFound(request, response) {
  // Serve the generated 404 document, never the home page as an SPA fallback.
  try {
    const file = await realpath(join(exportRoot, "404.html"));
    if (!isInsideExport(file)) throw new Error("404 fuera de la exportación.");
    return sendFile(request, response, file, 404, (await stat(file)).size);
  }
  catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(request.method === "HEAD" ? undefined : "Archivo no encontrado.");
  }
}

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    return response.end();
  }
  try {
    const url = new URL(request.url ?? "/", "http://127.0.0.1:" + port);
    const pathname = decodeURIComponent(url.pathname);
    if (pathname === mount) {
      response.writeHead(308, { Location: mount + "/" + url.search });
      return response.end();
    }
    if (!pathname.startsWith(mount + "/") || /[\\\0:]/.test(pathname)) return notFound(request, response);
    const segments = pathname.slice(mount.length).split("/").filter(Boolean);
    if (segments.some(segment => segment === "." || segment === "..")) return notFound(request, response);
    let file = await realpath(resolve(exportRoot, ...segments));
    if (!isInsideExport(file)) return notFound(request, response);
    let info = await stat(file);
    if (info.isDirectory()) {
      if (!url.pathname.endsWith("/")) {
        response.writeHead(308, { Location: url.pathname + "/" + url.search });
        return response.end();
      }
      file = await realpath(join(file, "index.html"));
      if (!isInsideExport(file)) return notFound(request, response);
      info = await stat(file);
    }
    if (!info.isFile()) return notFound(request, response);
    sendFile(request, response, file, 200, info.size);
  } catch (error) {
    if (error instanceof URIError) {
      response.writeHead(400);
      response.end();
      return;
    }
    await notFound(request, response);
  }
});

server.listen(port, "127.0.0.1", () => {
  console.info("Archivos estáticos de out/: http://127.0.0.1:" + port + mount + "/");
});
server.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
process.once("SIGINT", () => server.close());
process.once("SIGTERM", () => server.close());
