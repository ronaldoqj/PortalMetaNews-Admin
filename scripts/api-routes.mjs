import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * A development tool: lists every route of the API with who may call it, read from the controllers themselves, and
 * writes `docs/architecture/api-routes.md`. The document is generated, never edited by hand; `--check` fails when it
 * is out of date, so a route added without regenerating it shows up in review. Run: `node scripts/api-routes.mjs`.
 */
const root = fileURLToPath(new URL("../", import.meta.url));
export const SOURCE = "apps/backend/src";
export const OUTPUT = "docs/architecture/api-routes.md";

const VERB = /@(Get|Post|Put|Patch|Delete)\(\s*(?:'([^']*)'|"([^"]*)")?\s*\)/;

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walk(path);
    return entry.name.endsWith(".controller.ts") ? [path] : [];
  }).sort();
}

/** The quoted names inside a decorator's parentheses: `@RequirePermissions('a', 'b')` is `["a", "b"]`. */
const names = (text) => [...text.matchAll(/'([^']+)'|"([^"]+)"/g)].map((match) => match[1] ?? match[2]);

/** The routes of one controller file: every class with `@Controller`, every method under an HTTP verb decorator. */
export function routesOf(source) {
  const routes = [];
  const lines = source.split(/\r?\n/);
  let prefix = null;
  let guards = [];
  /** Permission decorators on the class itself: the default of its methods. */
  let classDecorators = "";
  /** Decorators seen since the last statement that was not one: they belong to the next class or method. */
  let pending = [];
  for (const line of lines) {
    const text = line.trim();
    if (text.startsWith("@")) {
      pending.push(text);
      // A method's decorators and its signature often share the line.
      if (!VERB.test(text) || !/\)\s*(?:async\s+)?[A-Za-z_]\w*\s*\(/.test(text.replace(VERB, ""))) {
        if (!/\b(?:async\s+)?[A-Za-z_]\w*\s*\([^@]*$/.test(text.replace(/@\w+\([^)]*\)/g, "").trim())) continue;
      }
    }
    if (/^export class \w+/.test(text)) {
      const controller = pending.find((decorator) => decorator.startsWith("@Controller"));
      prefix = controller ? names(controller)[0] ?? "" : null;
      guards = pending.filter((decorator) => decorator.startsWith("@UseGuards")).flatMap((decorator) => decorator.match(/\w+Guard/g) ?? []);
      classDecorators = pending.join(" ");
      pending = [];
      continue;
    }
    const decorators = pending.join(" ");
    const verb = VERB.exec(decorators);
    if (verb && prefix !== null) {
      const path = [prefix, verb[2] ?? verb[3] ?? ""].filter(Boolean).join("/");
      const required = /@RequirePermissions\(([^)]*)\)/.exec(decorators) ?? /@RequirePermissions\(([^)]*)\)/.exec(classDecorators);
      // Guards of the class and of the method itself.
      const applied = [...guards, ...(decorators.match(/\w+Guard/g) ?? [])];
      const access = required ? names(required[1]).join(" ou ") || "conta do painel"
        : applied.includes("PermissionGuard") ? "conta do painel"
          : applied.includes("SessionGuard") ? "sessão do painel" : "público";
      routes.push({ method: verb[1].toUpperCase(), path: `/${path}`, access });
    }
    if (!text.startsWith("@") || verb) pending = [];
  }
  return routes;
}

const AREAS = [
  ["Público (site, temas, mídia e saúde)", (path) => path.startsWith("/public") || path.startsWith("/health") || path === "/robots.txt"],
  ["Sessão do painel", (path) => path.startsWith("/auth")],
  ["Painel administrativo", (path) => path.startsWith("/panel")],
];

export function render(files) {
  const all = files.flatMap(({ file, source }) => routesOf(source).map((route) => ({ ...route, file })));
  const lines = [
    "# Rotas da API", "",
    "Gerado por `node scripts/api-routes.mjs` a partir dos controladores da API; não edite à mão.",
    "Cada linha traz o método, o caminho (relativo ao host da API, sem prefixo), quem pode chamar e o arquivo que a define.",
    "A permissão indicada é a que o controlador exige; os serviços conferem de novo e aplicam o escopo de cada registro.", "",
  ];
  const rest = new Set(all);
  for (const [title, belongs] of [...AREAS, ["Outras", () => true]]) {
    const routes = [...rest].filter((route) => belongs(route.path));
    if (!routes.length) continue;
    routes.forEach((route) => rest.delete(route));
    lines.push(`## ${title}`, "", "| Método | Caminho | Quem pode chamar | Arquivo |", "| --- | --- | --- | --- |");
    for (const route of routes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))) {
      lines.push(`| ${route.method} | \`${route.path}\` | ${route.access} | \`${route.file}\` |`);
    }
    lines.push("");
  }
  lines.push(`Total: ${all.length} rotas.`, "");
  return lines.join("\n");
}

export function generate(repository = root) {
  const base = join(repository, SOURCE);
  return render(walk(base).map((path) => ({ file: relative(base, path).split("\\").join("/"), source: readFileSync(path, "utf8") })));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const content = generate();
  if (process.argv.includes("--check")) {
    let current = "";
    try { current = readFileSync(join(root, OUTPUT), "utf8"); } catch { /* missing: out of date */ }
    if (current !== content) {
      console.error(`${OUTPUT} is out of date: run "node scripts/api-routes.mjs".`);
      process.exit(1);
    }
  } else {
    writeFileSync(join(root, OUTPUT), content);
    console.log(`${OUTPUT} written.`);
  }
}
