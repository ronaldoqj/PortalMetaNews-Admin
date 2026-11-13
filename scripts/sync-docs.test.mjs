import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { documentSlug, INDEX_FILE, OUTPUT_DIRECTORY, parseIndex, staleDocs, syncDocs, UNPUBLISHED_DOCUMENTS, watchDocs } from "./sync-docs.mjs";

let repository;
const output = () => join(repository, "out");
const write = (path, content) => { mkdirSync(dirname(join(repository, path)), { recursive: true }); writeFileSync(join(repository, path), content); };
const index = (...entries) => write(INDEX_FILE, ["# Docs", "", "## Group", "", "What it holds.", "", ...entries, ""].join("\n"));

beforeEach(() => { repository = mkdtempSync(join(tmpdir(), "sync-docs-")); });
afterEach(() => { rmSync(repository, { recursive: true, force: true }); });

test("reads groups, their description and their documents", () => {
  assert.deepEqual(parseIndex("# T\n\nIntro.\n\n## One\n\nAbout it\nin two lines.\n\n- [A](a.md) — First.\n\n## Two\n\n- [B](d/b.md) — Second.\n"), [
    { title: "One", description: "About it in two lines.", documents: [{ title: "A", source: "a.md", summary: "First." }] },
    { title: "Two", description: "", documents: [{ title: "B", source: "d/b.md", summary: "Second." }] },
  ]);
  assert.throws(() => parseIndex("## One\n- [A](a.md) sem resumo\n"), /:2: expected/);
});

test("derives stable addresses from the path", () => {
  assert.equal(documentSlug("README.md"), "readme");
  assert.equal(documentSlug("docs/stripe-setup-e-testes.md"), "docs-stripe-setup-e-testes");
  assert.equal(documentSlug(".github/agents/dev.agent.md"), "github-agents-dev-agent");
});

test("publishes the listed documents and their catalog, without front matter, and removes the ones delisted", () => {
  write("guide.md", "---\nname: x\n---\n# Guide\n\nThree more words.\n");
  write("other.md", "# Other\n");
  write("not-listed.md", "# Private\n");
  index("- [Guide](guide.md) — The guide.", "- [Other](other.md) — Another.");
  syncDocs({ repository, output: output() });
  assert.equal(readFileSync(join(output(), "guide.md"), "utf8"), "# Guide\n\nThree more words.\n");
  assert.equal(existsSync(join(output(), "not-listed.md")), false);
  const { groups } = JSON.parse(readFileSync(join(output(), "catalog.json"), "utf8"));
  assert.deepEqual(groups[0].documents[0], { slug: "guide", title: "Guide", summary: "The guide.", source: "guide.md", words: 5 });
  index("- [Guide](guide.md) — The guide.");
  syncDocs({ repository, output: output() });
  assert.equal(existsSync(join(output(), "other.md")), false);
});

test("refuses anything but a Markdown file inside the repository", () => {
  write(".env", "SECRET=1\n");
  for (const source of [".env", "../outside.md", "/etc/hostname.md", "missing.md"]) {
    index(`- [Bad](${source}) — Nope.`);
    assert.throws(() => syncDocs({ repository, output: output() }), source === "missing.md" ? /does not exist/ : /not a Markdown file/);
  }
  const outside = mkdtempSync(join(tmpdir(), "sync-docs-outside-"));
  writeFileSync(join(outside, "secret.md"), "# Secret\n");
  symlinkSync(join(outside, "secret.md"), join(repository, "link.md"));
  index("- [Link](link.md) — Nope.");
  assert.throws(() => syncDocs({ repository, output: output() }), /leaves the repository/);
  rmSync(outside, { recursive: true, force: true });
});

test("keeps a document holding a real credential unpublished, while placeholders pass", () => {
  write("guide.md", "STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxx and whsec_... and `sk_test_...`\n");
  index("- [Guide](guide.md) — The guide.");
  syncDocs({ repository, output: output() });
  write("guide.md", `key ${"sk_live_"}51Habcdefghijklmnop\n`);
  assert.throws(() => syncDocs({ repository, output: output() }), /appears to contain a credential/);
  assert.match(readFileSync(join(output(), "guide.md"), "utf8"), /xxxxxxxx/);
});

test("fails when the index is missing", () => {
  assert.throws(() => syncDocs({ repository, output: output() }), /DOCUMENTATION\.md not found/);
});

test("tells which files of the copy no longer match the sources", () => {
  write("guide.md", "# One\n");
  index("- [Guide](guide.md) — The guide.");
  assert.deepEqual(staleDocs({ repository, output: output() }), ["catalog.json", "guide.md"]);
  syncDocs({ repository, output: output() });
  assert.deepEqual(staleDocs({ repository, output: output() }), []);
  write("guide.md", "# Two\n");
  assert.deepEqual(staleDocs({ repository, output: output() }), ["guide.md"]);
  write("extra.md", "# Extra with more words\n");
  index("- [Guide](guide.md) — Changed summary.");
  syncDocs({ repository, output: output() });
  writeFileSync(join(output(), "left-behind.md"), "old\n");
  assert.deepEqual(staleDocs({ repository, output: output() }), ["left-behind.md"]);
});

test("the copy is reproducible: syncing twice writes the same bytes", () => {
  write("guide.md", "# One\n");
  index("- [Guide](guide.md) — The guide.");
  syncDocs({ repository, output: output() });
  const first = readFileSync(join(output(), "catalog.json"), "utf8");
  syncDocs({ repository, output: output() });
  assert.equal(readFileSync(join(output(), "catalog.json"), "utf8"), first);
});

test("the committed copy in the frontend matches the sources", () => {
  assert.deepEqual(staleDocs(), [], "run node scripts/sync-docs.mjs and commit the result");
});

test("the watcher publishes an edit and survives a broken index", async () => {
  write("guide.md", "# One\n");
  index("- [Guide](guide.md) — The guide.");
  const messages = [];
  const stop = watchDocs({ repository, output: output(), log: (message) => messages.push(message) });
  const until = async (condition) => {
    for (let attempt = 0; attempt < 100 && !condition(); attempt += 1) await new Promise((done) => setTimeout(done, 50));
    assert.ok(condition(), messages.join(" | "));
  };
  try {
    assert.equal(readFileSync(join(output(), "guide.md"), "utf8"), "# One\n");
    write("guide.md", "# Two\n");
    await until(() => readFileSync(join(output(), "guide.md"), "utf8") === "# Two\n");
    write(INDEX_FILE, "## Group\n- not an entry\n");
    await until(() => messages.at(-1).startsWith("not synced"));
    assert.equal(readFileSync(join(output(), "guide.md"), "utf8"), "# Two\n");
  } finally {
    stop();
  }
});

test("every Markdown file of the repository is either in the index or deliberately left out", () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const tracked = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "*.md"], { cwd: root, encoding: "utf8" }).trim().split("\n").filter((file) => existsSync(join(root, file)));
  const listed = parseIndex(readFileSync(join(root, INDEX_FILE), "utf8")).flatMap((group) => group.documents.map((document) => document.source));
  const expected = new Set([...listed, ...UNPUBLISHED_DOCUMENTS, INDEX_FILE]);
  assert.deepEqual(tracked.filter((file) => !file.startsWith(`${OUTPUT_DIRECTORY}/`) && !expected.has(file)), []);
  for (const file of listed) assert.ok(existsSync(join(root, file)), file);
});
