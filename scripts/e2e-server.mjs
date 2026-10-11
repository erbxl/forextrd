import { spawn } from "node:child_process";
import { mkdir, mkdtemp } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const databaseRoot = join(projectRoot, ".playwright");
await mkdir(databaseRoot, { recursive: true });
await mkdir(join(projectRoot, "artifacts"), { recursive: true });
// A new directory per run means no reset, overwrite or deletion of user data.
const databaseDirectory = await mkdtemp(join(databaseRoot, "run-"));
const databaseFile = join(databaseDirectory, "e2e.db").replaceAll("\\", "/");
const environment = {
  ...process.env,
  DATABASE_URL: `file:${databaseFile}`,
  NEXT_TELEMETRY_DISABLED: "1",
};

function runNode(relativeScript, args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [join(projectRoot, relativeScript), ...args], {
      cwd: projectRoot,
      env: environment,
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", rejectRun);
    child.once("exit", (code, signal) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`${relativeScript} terminó con ${signal ?? code}.`));
    });
  });
}

await runNode("node_modules/prisma/build/index.js", ["migrate", "deploy"]);
await runNode("node_modules/tsx/dist/cli.mjs", ["prisma/seed.ts"]);
console.info("Base E2E aislada inicializada. Servidor de prueba: http://127.0.0.1:3100");

const server = spawn(process.execPath, [
  join(projectRoot, "node_modules/next/dist/bin/next"),
  "start", "--hostname", "127.0.0.1", "--port", "3100",
], {
  cwd: projectRoot,
  env: { ...environment, NODE_ENV: "production" },
  stdio: "inherit",
  windowsHide: true,
});

let stopping = false;
function stop() {
  stopping = true;
  server.kill("SIGTERM");
}
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
server.once("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
server.once("exit", (code) => { process.exitCode = stopping ? 0 : code ?? 1; });
