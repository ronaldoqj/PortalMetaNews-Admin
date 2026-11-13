import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, watch, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * A development tool: brings the repository's Markdown documents to the frontend, which is deployed without them.
 * `DOCUMENTATION.md` says which documents are published and how they are grouped, and this script copies exactly
 * those into `apps/frontend/content/docs` with a `catalog.json`, while `npm run dev` runs. The copy is committed, so
 * a build needs neither this script nor the repository root. It never goes to `public/`: the documents describe
 * internals and leave only through the console's authenticated page.
 */
const root = fileURLToPath(new URL("../", import.meta.url));

export const INDEX_FILE = "DOCUMENTATION.md";
export const OUTPUT_DIRECTORY = "apps/frontend/content/docs";
/** Markdown files kept off the console on purpose: tool wiring, a verbatim mirror of `CLAUDE.md` and font licenses. */
export const UNPUBLISHED_DOCUMENTS = [
  ".github/copilot-instructions.md", ".github/agents/dev.agent.md", ".github/agents/sec-auditor.agent.md",
  ".github/agents/tester.agent.md", ".github/instructions/security-and-privacy.instructions.md",
  "apps/frontend/AGENTS.md", "apps/frontend/CLAUDE.md", "apps/frontend/src/app/fonts/LICENSES.md",
];

/** Real credentials, as opposed to the placeholders the guides show (`sk_live_xxxxxxxx`, `whsec_...`). */
const SECRET = /\b(?:sk|rk)_(?:live|test)_(?!x+\b)[A-Za-z0-9]{10,}|\bwhsec_(?!x+\b)[A-Za-z0-9]{10,}|\bAKIA[0-9A-Z]{16}\b|-----BEGIN [A-Z ]*PRIVATE KEY-----/;
const ENTRY = /^- \[([^\]]+)\]\(([^)\s]+)\) — (.+)$/;

/** The groups and documents of the index: `## Group`, an optional paragraph, then `- [Title](path) — Summary`. */
export function parseIndex(markdown) {
  const groups = [];
  for (const [position, line] of markdown.split(/\r?\n/).entries()) {
    if (line.startsWith("## ")) {
      groups.push({ title: line.slice(3).trim(), description: "", documents: [] });
      continue;
    }
    const group = groups.at(-1);
    if (!group || !line.trim()) continue;
    if (line.startsWith("- ")) {
      const entry = ENTRY.exec(line);
      if (!entry) throw new Error(`${INDEX_FILE}:${position + 1}: expected "- [Title](path) — Summary".`);
      group.documents.push({ title: entry[1], source: entry[2], summary: entry[3].trim() });
    } else {
      group.description = `${group.description} ${line.trim()}`.trim();
    }
  }
  return groups;
}

/** A document's stable address in the console, from its path: `docs/foo-bar.md` is `docs-foo-bar`. */
export function documentSlug(source) {
  return source.replace(/\.md$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Only a Markdown file really inside the repository may be published, whatever the index says or a link resolves to. */
function assertPublishable(repository, source) {
  const path = resolve(repository, source);
  const inside = (candidate, base) => { const part = relative(base, candidate); return part !== "" && !part.startsWith(`..${sep}`) && part !== ".." && !isAbsolute(part); };
  if (!source.toLowerCase().endsWith(".md") || !inside(path, repository)) throw new Error(`${INDEX_FILE}: "${source}" is not a Markdown file of the repository.`);
  if (!existsSync(path)) throw new Error(`${INDEX_FILE}: "${source}" does not exist.`);
  if (!inside(realpathSync(path), realpathSync(repository))) throw new Error(`${INDEX_FILE}: "${source}" leaves the repository.`);
  return path;
}

/** What the output should hold, or an error if any document is unfit. Depends only on the sources, so the copy is reproducible. */
function buildDocs(repository) {
  const indexPath = join(repository, INDEX_FILE);
  if (!existsSync(indexPath)) throw new Error(`${INDEX_FILE} not found.`);
  const files = new Map();
  const groups = parseIndex(readFileSync(indexPath, "utf8")).map((group) => ({
    ...group,
    documents: group.documents.map(({ title, summary, source }) => {
      const content = readFileSync(assertPublishable(repository, source), "utf8").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
      if (SECRET.test(content)) throw new Error(`${source} appears to contain a credential; it was not published.`);
      const slug = documentSlug(source);
      if (files.has(slug)) throw new Error(`${INDEX_FILE}: "${source}" is listed twice or collides with another document.`);
      files.set(slug, content);
      return { slug, title, summary, source, words: content.split(/\s+/).filter(Boolean).length };
    }),
  }));
  return { groups, files, catalog: `${JSON.stringify({ groups }, null, 2)}\n` };
}

/** Copies the published documents and their catalog. Throws, leaving the previous output in place, if any is unfit. */
export function syncDocs({ repository = root, output = join(repository, OUTPUT_DIRECTORY) } = {}) {
  const { groups, files, catalog } = buildDocs(repository);
  mkdirSync(output, { recursive: true });
  for (const name of readdirSync(output)) {
    if (name.endsWith(".md") && !files.has(name.slice(0, -3))) rmSync(join(output, name));
  }
  for (const [slug, content] of files) writeFileSync(join(output, `${slug}.md`), content);
  // The catalog goes last and at once, so a reader never finds an entry whose file is not there yet.
  const catalogPath = join(output, "catalog.json");
  writeFileSync(`${catalogPath}.tmp`, catalog);
  renameSync(`${catalogPath}.tmp`, catalogPath);
  return { groups, documents: files.size };
}

/** The files of the committed copy that do not match the sources, so a test catches a copy left behind. */
export function staleDocs({ repository = root, output = join(repository, OUTPUT_DIRECTORY) } = {}) {
  const { files, catalog } = buildDocs(repository);
  const expected = new Map([...[...files].map(([slug, content]) => [`${slug}.md`, content]), ["catalog.json", catalog]]);
  const present = existsSync(output) ? readdirSync(output) : [];
  return [...new Set([...expected.keys(), ...present])].filter((name) =>
    !expected.has(name) || !present.includes(name) || readFileSync(join(output, name), "utf8") !== expected.get(name)).sort();
}

/**
 * Keeps the output in step while developing. Each directory holding a published document is watched on its own,
 * never the whole tree, so `node_modules` costs nothing; a failed sync is reported and the last good copy stays.
 */
export function watchDocs({ repository = root, output, log = (message) => console.log(`[docs] ${message}`) } = {}) {
  const watchers = new Map();
  let timer;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(run, 120); };
  const follow = (directory) => {
    if (watchers.has(directory)) return;
    const watcher = watch(directory, (_event, name) => { if (!name || name.toString().toLowerCase().endsWith(".md")) schedule(); });
    watcher.on("error", () => { watcher.close(); watchers.delete(directory); });
    watchers.set(directory, watcher);
  };
  function run() {
    try {
      const { groups, documents } = syncDocs({ repository, output });
      for (const { source } of groups.flatMap((group) => group.documents)) follow(dirname(join(repository, source)));
      log(`${documents} documents synced.`);
    } catch (error) {
      log(`not synced: ${error.message}`);
    }
  }
  follow(repository);
  run();
  return () => {
    clearTimeout(timer);
    for (const watcher of watchers.values()) watcher.close();
    watchers.clear();
  };
}

if (import.meta.main) {
  if (process.argv.includes("--watch")) watchDocs();
  else if (process.argv.includes("--check")) {
    const stale = staleDocs();
    if (stale.length) {
      console.error(`[docs] out of date: ${stale.join(", ")}. Run node scripts/sync-docs.mjs and commit the result.`);
      process.exitCode = 1;
    } else console.log("[docs] up to date.");
  } else console.log(`[docs] ${syncDocs().documents} documents synced.`);
}
