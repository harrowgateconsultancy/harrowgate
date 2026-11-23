import { builtinModules } from "node:module";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(workspaceRoot, "generated-artifacts");
const uploadDirectory = path.join(outputRoot, "harrowgate-godaddy-upload");
const archivePath = path.join(outputRoot, "harrowgate-godaddy.zip");
const apiDist = path.join(workspaceRoot, "artifacts/api-server/dist");
const frontendDist = path.join(workspaceRoot, "artifacts/harrowgate/dist/public");

function run(command, args, cwd = workspaceRoot) {
  execFileSync(command, args, { cwd, stdio: "inherit" });
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function packageNameFromSpecifier(specifier) {
  if (specifier.startsWith("node:") || builtinModules.includes(specifier)) {
    return null;
  }
  if (specifier.startsWith(".") || specifier.startsWith("/") || specifier.includes("://")) {
    return null;
  }
  if (specifier.startsWith("@")) {
    return specifier.split("/").slice(0, 2).join("/");
  }
  return specifier.split("/")[0];
}

function findInstalledPackageJson(name) {
  const candidates = [
    path.join(workspaceRoot, "artifacts/api-server/node_modules", name, "package.json"),
    path.join(workspaceRoot, "lib/db/node_modules", name, "package.json"),
    path.join(workspaceRoot, "node_modules", name, "package.json"),
  ];
  const direct = candidates.find((candidate) => existsSync(candidate));
  if (direct) return direct;

  const pnpmStore = path.join(workspaceRoot, "node_modules/.pnpm");
  if (!existsSync(pnpmStore)) return undefined;
  for (const entry of readdirSync(pnpmStore)) {
    const candidate = path.join(pnpmStore, entry, "node_modules", name, "package.json");
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

function getRuntimeDependencies() {
  const moduleFiles = [];
  for (const entry of ["index.mjs", "pino-worker.mjs", "pino-file.mjs", "pino-pretty.mjs", "thread-stream-worker.mjs"]) {
    const filePath = path.join(apiDist, entry);
    if (existsSync(filePath)) moduleFiles.push(readFileSync(filePath, "utf8"));
  }

  const specifiers = new Set();
  const patterns = [
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const source of moduleFiles) {
    for (const line of source.split("\n")) {
      const staticImport = line.match(/^\s*(?:import|export)\b.*\bfrom\s*["']([^"']+)["']/);
      const sideEffectImport = line.match(/^\s*import\s*["']([^"']+)["']/);
      const specifier = staticImport?.[1] ?? sideEffectImport?.[1];
      if (specifier) {
        const packageName = packageNameFromSpecifier(specifier);
        if (packageName) specifiers.add(packageName);
      }
    }
    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) {
        const packageName = packageNameFromSpecifier(match[1]);
        if (packageName) specifiers.add(packageName);
      }
    }
  }

  const dependencies = {};
  for (const name of [...specifiers].sort()) {
    const packageJsonPath = findInstalledPackageJson(name);
    if (!packageJsonPath) {
      throw new Error(`Deployment package is missing runtime dependency metadata for ${name}`);
    }
    dependencies[name] = readJson(packageJsonPath).version;
  }
  return dependencies;
}

run("pnpm", ["--filter", "@workspace/api-server", "run", "build"]);
run("pnpm", ["--filter", "@workspace/harrowgate", "run", "build:godaddy"]);

if (!existsSync(path.join(apiDist, "index.mjs"))) {
  throw new Error(`API bundle was not created at ${apiDist}`);
}
if (!existsSync(path.join(frontendDist, "index.html"))) {
  throw new Error(`Frontend build was not created at ${frontendDist}`);
}

rmSync(uploadDirectory, { recursive: true, force: true });
rmSync(archivePath, { force: true });
mkdirSync(uploadDirectory, { recursive: true });

cpSync(apiDist, path.join(uploadDirectory, "artifacts/api-server/dist"), {
  recursive: true,
  filter: (source) => !source.endsWith(".map"),
});
cpSync(frontendDist, path.join(uploadDirectory, "artifacts/harrowgate/dist/public"), {
  recursive: true,
});
cpSync(
  path.join(workspaceRoot, "deploy/godaddy/DEPLOYMENT.md"),
  path.join(uploadDirectory, "DEPLOYMENT.md"),
);
mkdirSync(path.join(uploadDirectory, "database"), { recursive: true });
cpSync(
  path.join(workspaceRoot, "deploy/godaddy/migrate-existing-postgres.sql"),
  path.join(uploadDirectory, "database/migrate-existing-postgres.sql"),
);

const packageJson = {
  name: "harrowgate-godaddy",
  version: "1.0.0",
  private: true,
  type: "module",
  main: "artifacts/api-server/dist/index.mjs",
  engines: { node: ">=22 <23" },
  scripts: {
    build: "node -e \"if (!require('node:fs').existsSync('artifacts/api-server/dist/index.mjs')) process.exit(1)\"",
    start: "node artifacts/api-server/dist/index.mjs",
  },
  dependencies: getRuntimeDependencies(),
};
writeFileSync(
  path.join(uploadDirectory, "package.json"),
  `${JSON.stringify(packageJson, null, 2)}\n`,
);

run(
  "zip",
  ["-qr9", archivePath, "package.json", "artifacts", "database", "DEPLOYMENT.md"],
  uploadDirectory,
);

const archiveSize = readFileSync(archivePath).byteLength;
if (archiveSize > 100 * 1024 * 1024) {
  throw new Error(`GoDaddy upload archive exceeds 100 MB (${archiveSize} bytes)`);
}

process.stdout.write(
  `GoDaddy upload package ready: ${path.relative(workspaceRoot, archivePath)} ` +
    `(${(archiveSize / 1024 / 1024).toFixed(1)} MB)\n`,
);
